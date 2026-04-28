import asyncio
import mimetypes
import zipfile
from pathlib import Path
from typing import Annotated, Any
from uuid import uuid4

import aiofiles
from celery.result import AsyncResult
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse

from app.core.config import Settings
from app.core.dependencies import get_app_settings, validate_upload_file_size
from app.core.dependencies import validate_upload_files_size
from app.services.file_store import resolve_upload_path
from app.services.image_service import ImageService
from app.workers.celery_app import celery_app
from app.workers.image_tasks import (
    batch_resize_task,
    compress_image_task,
    convert_image_task,
    crop_image_task,
    ocr_image_task,
    remove_background_task,
    resize_image_task,
    rotate_image_task,
    watermark_image_task,
)

router = APIRouter()

ValidatedUpload = Annotated[UploadFile, Depends(validate_upload_file_size)]
ValidatedUploads = Annotated[list[UploadFile], Depends(validate_upload_files_size)]
AppSettings = Annotated[Settings, Depends(get_app_settings)]

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff", ".avif", ".bmp", ".svg", ".pdf"}


def _queued_response(job_id: str, message: str) -> dict[str, str]:
    return {"job_id": job_id, "status": "queued", "message": message}


def _extension_from_format(format: str | None, fallback: str | None = None) -> str:
    normalized = (format or "").lower().lstrip(".")
    if normalized in {"", "auto"}:
        normalized = (fallback or "jpg").lower().lstrip(".")
    if normalized == "jpeg":
        normalized = "jpg"
    if normalized == "tif":
        normalized = "tiff"
    if normalized not in {"jpg", "png", "webp", "tiff", "avif", "bmp", "pdf", "eps"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="format must be one of: auto, jpg, png, webp, tiff, avif, bmp, pdf, eps",
        )
    return f".{normalized}"


def _safe_suffix(filename: str | None, fallback: str = ".jpg") -> str:
    suffix = Path(filename or "").suffix.lower()
    return suffix if suffix else fallback


def _output_path(settings: Settings, suffix: str = ".jpg") -> Path:
    settings.OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    return settings.OUTPUT_DIR / f"{uuid4().hex}{suffix}"


def _safe_output_name(value: str, fallback_stem: str, suffix: str) -> Path:
    if not value.strip():
        return Path(f"{uuid4().hex}{suffix}")
    candidate = Path(value.strip()).name
    stem = Path(candidate).stem or fallback_stem
    return Path(f"{stem}{suffix}")


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


async def _save_uploads(files: list[UploadFile], settings: Settings) -> list[Path]:
    return [await _save_upload(file, settings) for file in files]


def _validate_optional_upload_size(file: UploadFile, settings: Settings) -> None:
    max_size_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    try:
        file.file.seek(0, 2)
        file_size = file.file.tell()
        file.file.seek(0)
    except OSError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not read uploaded file size",
        ) from exc

    if file_size > max_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum size of {settings.MAX_FILE_SIZE_MB} MB",
        )


async def _input_path_from_file_or_id(
    settings: Settings,
    file: UploadFile | None = None,
    file_id: str | None = None,
) -> Path:
    if file_id:
        return resolve_upload_path(file_id, settings)
    if file is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide either file_id or file",
        )
    _validate_optional_upload_size(file, settings)
    return await _save_upload(file, settings)


async def _input_paths_from_files_or_ids(
    settings: Settings,
    files: list[UploadFile] | None = None,
    file_ids: list[str] | None = None,
) -> list[Path]:
    clean_ids = [file_id for file_id in (file_ids or []) if file_id]
    if clean_ids:
        return [resolve_upload_path(file_id, settings) for file_id in clean_ids]
    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide either file_ids or files",
        )
    for file in files:
        _validate_optional_upload_size(file, settings)
    return await _save_uploads(files, settings)


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


def _normalized_task_state(state: str) -> str:
    normalized = state.upper()
    if normalized == "SUCCESS":
        return "success"
    if normalized in {"FAILURE", "REVOKED"}:
        return "failure"
    if normalized in {"STARTED", "RETRY", "RECEIVED"}:
        return "processing"
    return "queued"


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
    settings: AppSettings,
    format: Annotated[str, Form()],
    file: Annotated[UploadFile | None, File()] = None,
    file_id: Annotated[str | None, Form()] = None,
    quality: Annotated[int, Form()] = 85,
    preserve_metadata: Annotated[bool, Form()] = False,
    color_space: Annotated[str, Form()] = "srgb",
    output_filename: Annotated[str, Form()] = "",
) -> dict[str, str]:
    input_path = await _input_path_from_file_or_id(settings, file=file, file_id=file_id)
    original_name = file.filename if file is not None else input_path.name
    suffix = _extension_from_format(format, fallback=_safe_suffix(original_name))
    requested_name = _safe_output_name(output_filename, Path(original_name or "converted").stem, suffix)
    output_path = settings.OUTPUT_DIR / requested_name
    task = convert_image_task.apply_async(
        args=[str(input_path), str(output_path), format, quality, preserve_metadata, color_space],
        queue="fast",
    )
    return _queued_response(str(task.id), "Image conversion queued")


@router.post("/resize")
async def resize_image(
    settings: AppSettings,
    file: Annotated[UploadFile | None, File()] = None,
    file_id: Annotated[str | None, Form()] = None,
    width: Annotated[int | None, Form()] = None,
    height: Annotated[int | None, Form()] = None,
    mode: Annotated[str, Form()] = "pixels",
    percentage: Annotated[float | None, Form()] = None,
    fit: Annotated[str, Form()] = "cover",
    allow_upscale: Annotated[bool, Form()] = True,
    background: Annotated[str, Form()] = "#ffffff",
    kernel: Annotated[str, Form()] = "lanczos3",
    without_enlargement: Annotated[bool, Form()] = False,
    quality: Annotated[int, Form()] = 85,
) -> dict[str, str]:
    input_path = await _input_path_from_file_or_id(settings, file=file, file_id=file_id)
    original_name = file.filename if file is not None else input_path.name
    output_path = _output_path(settings, _safe_suffix(original_name))
    task = resize_image_task.apply_async(
        args=[
            str(input_path),
            str(output_path),
            width,
            height,
            fit,
            kernel,
            without_enlargement or not allow_upscale,
            quality,
            mode,
            percentage,
            allow_upscale,
            background,
        ],
        queue="fast",
    )
    return _queued_response(str(task.id), "Image resize queued")


@router.post("/compress")
async def compress_image(
    settings: AppSettings,
    file: Annotated[UploadFile | None, File()] = None,
    file_id: Annotated[str | None, Form()] = None,
    quality: Annotated[int, Form()] = 85,
    format: Annotated[str | None, Form()] = None,
    progressive: Annotated[bool, Form()] = False,
    strip_metadata: Annotated[bool, Form()] = False,
    png_compression: Annotated[int, Form()] = 6,
    force_recompress: Annotated[bool, Form()] = False,
) -> dict[str, str]:
    input_path = await _input_path_from_file_or_id(settings, file=file, file_id=file_id)
    original_name = file.filename if file is not None else input_path.name
    normalized_format = format or "auto"
    output_path = _output_path(settings, _extension_from_format(normalized_format, fallback=_safe_suffix(original_name)))
    task = compress_image_task.apply_async(
        args=[
            str(input_path),
            str(output_path),
            quality,
            normalized_format,
            progressive,
            strip_metadata,
            png_compression,
            force_recompress,
        ],
        queue="fast",
    )
    return _queued_response(str(task.id), "Image compression queued")


@router.post("/crop")
async def crop_image(
    settings: AppSettings,
    x: Annotated[int, Form()],
    y: Annotated[int, Form()],
    width: Annotated[int, Form()],
    height: Annotated[int, Form()],
    file: Annotated[UploadFile | None, File()] = None,
    file_id: Annotated[str | None, Form()] = None,
) -> dict[str, str]:
    input_path = await _input_path_from_file_or_id(settings, file=file, file_id=file_id)
    original_name = file.filename if file is not None else input_path.name
    output_path = _output_path(settings, _safe_suffix(original_name))
    task = crop_image_task.apply_async(
        args=[str(input_path), str(output_path), x, y, width, height],
        queue="fast",
    )
    return _queued_response(str(task.id), "Image crop queued")


@router.post("/rotate")
async def rotate_image(
    settings: AppSettings,
    angle: Annotated[int, Form()],
    file: Annotated[UploadFile | None, File()] = None,
    file_id: Annotated[str | None, Form()] = None,
    flip_horizontal: Annotated[bool, Form()] = False,
    flip_vertical: Annotated[bool, Form()] = False,
    output_format: Annotated[str | None, Form()] = None,
) -> dict[str, str]:
    input_path = await _input_path_from_file_or_id(settings, file=file, file_id=file_id)
    original_name = file.filename if file is not None else input_path.name
    suffix = _extension_from_format(output_format or "auto", fallback=_safe_suffix(original_name))
    output_path = _output_path(settings, suffix)
    task = rotate_image_task.apply_async(
        args=[str(input_path), str(output_path), angle, flip_horizontal, flip_vertical, output_format],
        queue="fast",
    )
    return _queued_response(str(task.id), "Image rotation queued")


@router.post("/watermark")
async def watermark_image(
    settings: AppSettings,
    text: Annotated[str, Form()],
    file: Annotated[UploadFile | None, File()] = None,
    file_id: Annotated[str | None, Form()] = None,
    opacity: Annotated[float, Form()] = 0.5,
    position: Annotated[str, Form()] = "bottom-right",
    x_percent: Annotated[float | None, Form()] = None,
    y_percent: Annotated[float | None, Form()] = None,
    font_size: Annotated[int, Form()] = 36,
    font_color: Annotated[str, Form()] = "#ffffff",
    font_weight: Annotated[str, Form()] = "bold",
) -> dict[str, str]:
    input_path = await _input_path_from_file_or_id(settings, file=file, file_id=file_id)
    original_name = file.filename if file is not None else input_path.name
    output_path = _output_path(settings, _safe_suffix(original_name))
    task = watermark_image_task.apply_async(
        args=[
            str(input_path),
            str(output_path),
            text,
            opacity,
            position,
            x_percent,
            y_percent,
            font_size,
            font_color,
            font_weight,
        ],
        queue="fast",
    )
    return _queued_response(str(task.id), "Image watermark queued")


@router.post("/remove-background")
async def remove_background(
    settings: AppSettings,
    file: Annotated[UploadFile | None, File()] = None,
    file_id: Annotated[str | None, Form()] = None,
) -> dict[str, str]:
    input_path = await _input_path_from_file_or_id(settings, file=file, file_id=file_id)
    output_path = _output_path(settings, ".png")
    task = remove_background_task.apply_async(args=[str(input_path), str(output_path)], queue="fast")
    return _queued_response(str(task.id), "Background removal queued")


@router.post("/ocr")
async def ocr_image(
    settings: AppSettings,
    file: Annotated[UploadFile | None, File()] = None,
    file_id: Annotated[str | None, Form()] = None,
    language: Annotated[str, Form()] = "eng",
    output_format: Annotated[str, Form()] = "txt",
    dpi: Annotated[int, Form()] = 300,
    input_type: Annotated[str, Form()] = "auto",
    page_range: Annotated[str, Form()] = "all",
    deskew: Annotated[bool, Form()] = False,
    denoise: Annotated[bool, Form()] = False,
    enhance_contrast: Annotated[bool, Form()] = False,
) -> dict[str, Any]:
    input_path = await _input_path_from_file_or_id(settings, file=file, file_id=file_id)
    output_dir = _output_dir(settings)
    task = ocr_image_task.apply_async(
        args=[str(input_path), str(output_dir), language, output_format, input_type, page_range, deskew, denoise, enhance_contrast, dpi],
        queue="heavy",
    )
    return _queued_response(str(task.id), "OCR queued")


@router.post("/batch-resize")
async def batch_resize(
    settings: AppSettings,
    width: Annotated[int, Form()],
    height: Annotated[int, Form()],
    files: Annotated[list[UploadFile] | None, File()] = None,
    file_ids: Annotated[list[str] | None, Form()] = None,
) -> dict[str, str]:
    if file_ids:
        input_paths = await _input_paths_from_files_or_ids(settings, files=files, file_ids=file_ids)
    elif not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one image is required",
        )
    elif len(files) == 1 and Path(files[0].filename or "").suffix.lower() == ".zip":
        zip_path = await _save_upload(files[0], settings)
        input_paths = await _extract_zip_images(zip_path, settings)
    else:
        input_paths = await _save_uploads(files, settings)
    output_dir = _output_dir(settings)
    task = batch_resize_task.apply_async(
        args=[[str(path) for path in input_paths], str(output_dir), width, height],
        queue="heavy",
    )
    return _queued_response(str(task.id), "Batch image resize queued")


@router.post("/info")
async def get_image_info(
    settings: AppSettings,
    file: Annotated[UploadFile | None, File()] = None,
    file_id: Annotated[str | None, Form()] = None,
) -> dict[str, Any]:
    input_path = await _input_path_from_file_or_id(settings, file=file, file_id=file_id)
    info = await ImageService().get_image_info(input_path)
    return {"status": "success", "result": info, "error": None}


@router.get("/status/{job_id}")
async def get_status(job_id: str) -> dict[str, Any]:
    task = _task_result(job_id)
    response: dict[str, Any] = {
        "job_id": job_id,
        "status": _normalized_task_state(task.state),
        "stage": "queued" if _normalized_task_state(task.state) == "queued" else "processing",
        "progress": _task_progress(task.state),
    }

    if task.successful():
        result = task.result or {}
        if isinstance(result, dict):
            response["status"] = "failure" if result.get("status") in {"failure", "failed"} else "success"
            response["stage"] = result.get("stage", "finalizing")
            response["progress"] = result.get("progress", 100)
            response["output_path"] = result.get("output_path")
            response["output_paths"] = result.get("output_paths")
            response["result"] = result.get("result")
            response["error"] = result.get("error")
            response["traceback"] = result.get("traceback")
    elif task.failed():
        response["status"] = "failure"
        response["stage"] = "processing"
        response["error"] = str(task.result)
        response["traceback"] = str(task.result)

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
            detail="Output file not found. The job may have failed or expired.",
        )

    return FileResponse(
        path=file_path,
        media_type=mimetypes.guess_type(file_path.name)[0] or "application/octet-stream",
        filename=file_path.name,
        headers={"Cache-Control": "no-store"},
    )
