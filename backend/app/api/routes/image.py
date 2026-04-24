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
from app.core.dependencies import get_app_settings, validate_upload_file_size
from app.services.image_service import ImageService
from app.workers.celery_app import celery_app
from app.workers.image_tasks import (
    batch_resize_task,
    compress_image_task,
    convert_image_task,
    crop_image_task,
    remove_background_task,
    resize_image_task,
    rotate_image_task,
    watermark_image_task,
)

router = APIRouter(prefix="/api/image", tags=["image"])

ValidatedUpload = Annotated[UploadFile, Depends(validate_upload_file_size)]
AppSettings = Annotated[Settings, Depends(get_app_settings)]

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff", ".avif"}


def _queued_response(job_id: str, message: str) -> dict[str, str]:
    return {"job_id": job_id, "status": "queued", "message": message}


def _extension_from_format(format: str) -> str:
    normalized = format.lower().lstrip(".")
    if normalized == "jpeg":
        normalized = "jpg"
    if normalized == "tif":
        normalized = "tiff"
    if normalized not in {"jpg", "png", "webp", "tiff", "avif"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="format must be one of: jpg, png, webp, tiff, avif",
        )
    return f".{normalized}"


def _safe_suffix(filename: str | None, fallback: str = ".jpg") -> str:
    suffix = Path(filename or "").suffix.lower()
    return suffix if suffix else fallback


def _output_path(settings: Settings, suffix: str = ".jpg") -> Path:
    settings.OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    return settings.OUTPUT_DIR / f"{uuid4().hex}{suffix}"


def _output_dir(settings: Settings) -> Path:
    output_dir = settings.OUTPUT_DIR / uuid4().hex
    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir


async def _save_upload(file: UploadFile, settings: Settings) -> Path:
    settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    destination = settings.UPLOAD_DIR / f"{uuid4().hex}{_safe_suffix(file.filename)}"

    await file.seek(0)
    async with aiofiles.open(destination, "wb") as output_file:
        while chunk := await file.read(1024 * 1024):
            await output_file.write(chunk)
    await file.close()

    return destination


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


async def _extract_zip_images(zip_path: Path, settings: Settings) -> list[Path]:
    extract_dir = settings.TEMP_DIR / uuid4().hex
    extract_dir.mkdir(parents=True, exist_ok=True)

    def extract() -> list[Path]:
        extracted: list[Path] = []
        with zipfile.ZipFile(zip_path) as archive:
            for member in archive.infolist():
                if member.is_dir():
                    continue

                member_name = Path(member.filename)
                if member_name.is_absolute() or ".." in member_name.parts:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Zip contains an unsafe path",
                    )

                suffix = member_name.suffix.lower()
                if suffix not in IMAGE_EXTENSIONS:
                    continue

                destination = extract_dir / f"{uuid4().hex}{suffix}"
                with archive.open(member) as source, destination.open("wb") as target:
                    target.write(source.read())
                extracted.append(destination)

        if not extracted:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Zip file does not contain supported images",
            )

        return extracted

    try:
        return await asyncio.to_thread(extract)
    except HTTPException:
        raise
    except zipfile.BadZipFile as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is not a valid zip archive",
        ) from exc


@router.post("/convert")
async def convert_image(
    file: ValidatedUpload,
    settings: AppSettings,
    format: Annotated[str, Form()],
) -> dict[str, str]:
    input_path = await _save_upload(file, settings)
    output_path = _output_path(settings, _extension_from_format(format))
    task = convert_image_task.apply_async(
        args=[str(input_path), str(output_path), format],
        queue="fast",
    )
    return _queued_response(str(task.id), "Image conversion queued")


@router.post("/resize")
async def resize_image(
    file: ValidatedUpload,
    settings: AppSettings,
    width: Annotated[int | None, Form()] = None,
    height: Annotated[int | None, Form()] = None,
    fit: Annotated[str, Form()] = "cover",
) -> dict[str, str]:
    input_path = await _save_upload(file, settings)
    output_path = _output_path(settings, _safe_suffix(file.filename))
    task = resize_image_task.apply_async(
        args=[str(input_path), str(output_path), width, height, fit],
        queue="fast",
    )
    return _queued_response(str(task.id), "Image resize queued")


@router.post("/compress")
async def compress_image(
    file: ValidatedUpload,
    settings: AppSettings,
    quality: Annotated[int, Form()] = 85,
    format: Annotated[str | None, Form()] = None,
) -> dict[str, str]:
    input_path = await _save_upload(file, settings)
    output_path = _output_path(settings, _extension_from_format(format) if format else _safe_suffix(file.filename))
    task = compress_image_task.apply_async(
        args=[str(input_path), str(output_path), quality, format],
        queue="fast",
    )
    return _queued_response(str(task.id), "Image compression queued")


@router.post("/crop")
async def crop_image(
    file: ValidatedUpload,
    settings: AppSettings,
    x: Annotated[int, Form()],
    y: Annotated[int, Form()],
    width: Annotated[int, Form()],
    height: Annotated[int, Form()],
) -> dict[str, str]:
    input_path = await _save_upload(file, settings)
    output_path = _output_path(settings, _safe_suffix(file.filename))
    task = crop_image_task.apply_async(
        args=[str(input_path), str(output_path), x, y, width, height],
        queue="fast",
    )
    return _queued_response(str(task.id), "Image crop queued")


@router.post("/rotate")
async def rotate_image(
    file: ValidatedUpload,
    settings: AppSettings,
    angle: Annotated[int, Form()],
) -> dict[str, str]:
    input_path = await _save_upload(file, settings)
    output_path = _output_path(settings, _safe_suffix(file.filename))
    task = rotate_image_task.apply_async(args=[str(input_path), str(output_path), angle], queue="fast")
    return _queued_response(str(task.id), "Image rotation queued")


@router.post("/watermark")
async def watermark_image(
    file: ValidatedUpload,
    settings: AppSettings,
    text: Annotated[str, Form()],
    opacity: Annotated[float, Form()] = 0.5,
    position: Annotated[str, Form()] = "bottom-right",
) -> dict[str, str]:
    input_path = await _save_upload(file, settings)
    output_path = _output_path(settings, _safe_suffix(file.filename))
    task = watermark_image_task.apply_async(
        args=[str(input_path), str(output_path), text, opacity, position],
        queue="fast",
    )
    return _queued_response(str(task.id), "Image watermark queued")


@router.post("/remove-background")
async def remove_background(file: ValidatedUpload, settings: AppSettings) -> dict[str, str]:
    input_path = await _save_upload(file, settings)
    output_path = _output_path(settings, ".png")
    task = remove_background_task.apply_async(args=[str(input_path), str(output_path)], queue="fast")
    return _queued_response(str(task.id), "Background removal queued")


@router.post("/ocr")
async def ocr_image(
    file: ValidatedUpload,
    settings: AppSettings,
    language: Annotated[str, Form()] = "eng",
) -> dict[str, Any]:
    input_path = await _save_upload(file, settings)
    text = await ImageService().ocr_image(input_path, language)
    return {"status": "completed", "result": text, "error": None}


@router.post("/batch-resize")
async def batch_resize(
    file: ValidatedUpload,
    settings: AppSettings,
    width: Annotated[int, Form()],
    height: Annotated[int, Form()],
) -> dict[str, str]:
    zip_path = await _save_upload(file, settings)
    input_paths = await _extract_zip_images(zip_path, settings)
    output_dir = _output_dir(settings)
    task = batch_resize_task.apply_async(
        args=[[str(path) for path in input_paths], str(output_dir), width, height],
        queue="heavy",
    )
    return _queued_response(str(task.id), "Batch image resize queued")


@router.post("/info")
async def get_image_info(file: ValidatedUpload, settings: AppSettings) -> dict[str, Any]:
    input_path = await _save_upload(file, settings)
    info = await ImageService().get_image_info(input_path)
    return {"status": "completed", "result": info, "error": None}


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
            response["result"] = result.get("result")
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
