import asyncio
import zipfile
from pathlib import Path
from typing import Annotated, Any
from uuid import uuid4

import aiofiles
from celery.result import AsyncResult
from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse

from app.core.config import Settings
from app.core.dependencies import (
    get_app_settings,
    validate_upload_file_size,
    validate_upload_files_size,
)
from app.workers.celery_app import celery_app
from app.workers.pdf_tasks import (
    compress_pdf_task,
    decrypt_pdf_task,
    encrypt_pdf_task,
    extract_text_task,
    images_to_pdf_task,
    merge_pdfs_task,
    office_to_pdf_task,
    pdf_to_images_task,
    rotate_pdf_task,
    split_pdf_task,
)

router = APIRouter(prefix="/api/pdf", tags=["pdf"])

ValidatedUpload = Annotated[UploadFile, Depends(validate_upload_file_size)]
ValidatedUploads = Annotated[list[UploadFile], Depends(validate_upload_files_size)]
AppSettings = Annotated[Settings, Depends(get_app_settings)]


def _queued_response(job_id: str, message: str) -> dict[str, str]:
    return {"job_id": job_id, "status": "queued", "message": message}


def _output_path(settings: Settings, suffix: str) -> Path:
    settings.OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    return settings.OUTPUT_DIR / f"{uuid4().hex}{suffix}"


def _output_dir(settings: Settings) -> Path:
    output_dir = settings.OUTPUT_DIR / uuid4().hex
    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir


async def _save_upload(file: UploadFile, settings: Settings) -> Path:
    settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    suffix = Path(file.filename or "").suffix
    destination = settings.UPLOAD_DIR / f"{uuid4().hex}{suffix}"

    await file.seek(0)
    async with aiofiles.open(destination, "wb") as output_file:
        while chunk := await file.read(1024 * 1024):
            await output_file.write(chunk)
    await file.close()

    return destination


async def _save_uploads(files: list[UploadFile], settings: Settings) -> list[Path]:
    return [await _save_upload(file, settings) for file in files]


def _task_progress(state: str) -> int:
    return {
        "PENDING": 0,
        "RECEIVED": 10,
        "STARTED": 50,
        "RETRY": 50,
        "SUCCESS": 100,
        "FAILURE": 100,
        "REVOKED": 100,
    }.get(state, 0)


def _task_result(job_id: str) -> AsyncResult:
    return AsyncResult(job_id, app=celery_app)


def _safe_output_path(path: str, settings: Settings) -> Path:
    candidate = Path(path).resolve(strict=False)
    output_root = settings.OUTPUT_DIR.resolve(strict=False)

    if not candidate.is_relative_to(output_root):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Task output is outside the configured output directory",
        )

    if not candidate.exists() or not candidate.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Output file not found",
        )

    return candidate


async def _zip_outputs(job_id: str, output_paths: list[str], settings: Settings) -> Path:
    zip_path = settings.OUTPUT_DIR / f"{job_id}.zip"
    files = [_safe_output_path(path, settings) for path in output_paths]

    def write_zip() -> None:
        with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
            for file_path in files:
                archive.write(file_path, arcname=file_path.name)

    await asyncio.to_thread(write_zip)
    return zip_path


@router.post("/compress")
async def compress_pdf(
    file: ValidatedUpload,
    settings: AppSettings,
    quality: Annotated[str, Form()] = "ebook",
) -> dict[str, str]:
    input_path = await _save_upload(file, settings)
    output_path = _output_path(settings, ".pdf")
    task = compress_pdf_task.apply_async(
        args=[str(input_path), str(output_path), quality],
        queue="heavy",
    )
    return _queued_response(str(task.id), "PDF compression queued")


@router.post("/merge")
async def merge_pdfs(files: ValidatedUploads, settings: AppSettings) -> dict[str, str]:
    if len(files) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least two PDFs are required to merge",
        )

    input_paths = await _save_uploads(files, settings)
    output_path = _output_path(settings, ".pdf")
    task = merge_pdfs_task.apply_async(
        args=[[str(path) for path in input_paths], str(output_path)],
        queue="fast",
    )
    return _queued_response(str(task.id), "PDF merge queued")


@router.post("/split")
async def split_pdf(
    file: ValidatedUpload,
    settings: AppSettings,
    pages: Annotated[str, Form()],
) -> dict[str, str]:
    input_path = await _save_upload(file, settings)
    output_dir = _output_dir(settings)
    task = split_pdf_task.apply_async(args=[str(input_path), str(output_dir), pages], queue="fast")
    return _queued_response(str(task.id), "PDF split queued")


@router.post("/rotate")
async def rotate_pdf(
    file: ValidatedUpload,
    settings: AppSettings,
    angle: Annotated[int, Form()],
    pages: Annotated[str, Form()] = "all",
) -> dict[str, str]:
    input_path = await _save_upload(file, settings)
    output_path = _output_path(settings, ".pdf")
    task = rotate_pdf_task.apply_async(
        args=[str(input_path), str(output_path), angle, pages],
        queue="fast",
    )
    return _queued_response(str(task.id), "PDF rotation queued")


@router.post("/extract-text")
async def extract_text(file: ValidatedUpload, settings: AppSettings) -> dict[str, str]:
    input_path = await _save_upload(file, settings)
    output_path = _output_path(settings, ".txt")
    task = extract_text_task.apply_async(args=[str(input_path), str(output_path), True], queue="fast")
    return _queued_response(str(task.id), "Text extraction queued")


@router.post("/to-images")
async def pdf_to_images(
    file: ValidatedUpload,
    settings: AppSettings,
    dpi: Annotated[int, Form()] = 150,
    format: Annotated[str, Form()] = "png",
) -> dict[str, str]:
    input_path = await _save_upload(file, settings)
    output_dir = _output_dir(settings)
    task = pdf_to_images_task.apply_async(
        args=[str(input_path), str(output_dir), dpi, format],
        queue="fast",
    )
    return _queued_response(str(task.id), "PDF to images conversion queued")


@router.post("/images-to-pdf")
async def images_to_pdf(files: ValidatedUploads, settings: AppSettings) -> dict[str, str]:
    input_paths = await _save_uploads(files, settings)
    output_path = _output_path(settings, ".pdf")
    task = images_to_pdf_task.apply_async(
        args=[[str(path) for path in input_paths], str(output_path)],
        queue="fast",
    )
    return _queued_response(str(task.id), "Images to PDF conversion queued")


@router.post("/office-to-pdf")
async def office_to_pdf(file: ValidatedUpload, settings: AppSettings) -> dict[str, str]:
    input_path = await _save_upload(file, settings)
    task = office_to_pdf_task.apply_async(args=[str(input_path), str(settings.OUTPUT_DIR)], queue="heavy")
    return _queued_response(str(task.id), "Office to PDF conversion queued")


@router.post("/encrypt")
async def encrypt_pdf(
    file: ValidatedUpload,
    settings: AppSettings,
    user_password: Annotated[str, Form()],
    owner_password: Annotated[str, Form()] = "",
) -> dict[str, str]:
    input_path = await _save_upload(file, settings)
    output_path = _output_path(settings, ".pdf")
    task = encrypt_pdf_task.apply_async(
        args=[str(input_path), str(output_path), user_password, owner_password],
        queue="fast",
    )
    return _queued_response(str(task.id), "PDF encryption queued")


@router.post("/decrypt")
async def decrypt_pdf(
    file: ValidatedUpload,
    settings: AppSettings,
    password: Annotated[str, Form()],
) -> dict[str, str]:
    input_path = await _save_upload(file, settings)
    output_path = _output_path(settings, ".pdf")
    task = decrypt_pdf_task.apply_async(
        args=[str(input_path), str(output_path), password],
        queue="fast",
    )
    return _queued_response(str(task.id), "PDF decryption queued")


@router.get("/status/{job_id}")
async def get_status(job_id: str) -> dict[str, Any]:
    task = _task_result(job_id)
    response: dict[str, Any] = {
        "job_id": job_id,
        "status": task.state.lower(),
        "progress": _task_progress(task.state),
    }

    if task.successful():
        result = task.result or {}
        if isinstance(result, dict):
            response["status"] = result.get("status", "completed")
            response["output_path"] = result.get("output_path")
            response["output_paths"] = result.get("output_paths")
            response["error"] = result.get("error")
    elif task.failed():
        response["status"] = "failed"
        response["error"] = str(task.result)

    return response


@router.get("/download/{job_id}")
async def download_output(job_id: str, settings: AppSettings) -> FileResponse:
    task = _task_result(job_id)

    if not task.ready():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Task is not complete yet",
        )

    if task.failed():
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(task.result),
        )

    result = task.result or {}
    if not isinstance(result, dict) or result.get("status") == "failed":
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result.get("error") if isinstance(result, dict) else "Task failed",
        )

    output_path = result.get("output_path")
    output_paths = result.get("output_paths")

    if output_path:
        file_path = _safe_output_path(str(output_path), settings)
    elif isinstance(output_paths, list) and output_paths:
        file_path = await _zip_outputs(job_id, [str(path) for path in output_paths], settings)
    else:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task has no downloadable output",
        )

    return FileResponse(path=file_path, filename=file_path.name)
