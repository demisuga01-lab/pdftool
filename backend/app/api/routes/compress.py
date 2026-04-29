import json
import mimetypes
import zipfile
from pathlib import Path
from typing import Annotated, Any
from uuid import uuid4

import aiofiles
from celery.result import AsyncResult
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from app.core.config import Settings
from app.core.dependencies import get_app_settings, validate_upload_file_size
from app.services.file_store import resolve_upload_path
from app.workers.celery_app import celery_app
from app.workers.compress_tasks import compress_file_task

router = APIRouter()

ValidatedUpload = Annotated[UploadFile, Depends(validate_upload_file_size)]
AppSettings = Annotated[Settings, Depends(get_app_settings)]


class CompressJsonRequest(BaseModel):
    file_id: str
    mode: str = "smart"
    settings: dict[str, Any] = Field(default_factory=dict)


def _queued_response(job_id: str, message: str) -> dict[str, str]:
    return {"job_id": job_id, "status": "queued", "message": message}


def _output_dir(settings: Settings) -> Path:
    output_dir = settings.OUTPUT_DIR / uuid4().hex
    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir


async def _save_upload(file: UploadFile, settings: Settings) -> Path:
    settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    suffix = Path(file.filename or "").suffix or ".bin"
    destination = settings.UPLOAD_DIR / f"{uuid4().hex}{suffix}"

    await file.seek(0)
    async with aiofiles.open(destination, "wb") as output_file:
        while chunk := await file.read(1024 * 1024):
            await output_file.write(chunk)
    await file.close()
    return destination


def _validate_optional_upload_size(file: UploadFile, settings: Settings) -> None:
    max_size_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    try:
        file.file.seek(0, 2)
        file_size = file.file.tell()
        file.file.seek(0)
    except OSError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Could not read uploaded file size") from exc

    if file_size > max_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum size of {settings.MAX_FILE_SIZE_MB} MB",
        )


async def _input_path_from_file_or_id(settings: Settings, file: UploadFile | None, file_id: str | None) -> Path:
    if file_id:
        return resolve_upload_path(file_id, settings)
    if file is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Provide either file_id or file")
    _validate_optional_upload_size(file, settings)
    return await _save_upload(file, settings)


def _parse_settings(settings_json: str | None, mode: str, file_type: str | None = None) -> dict[str, Any]:
    try:
        parsed = json.loads(settings_json or "{}")
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="settings must be valid JSON") from exc
    if not isinstance(parsed, dict):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="settings must be a JSON object")
    parsed["mode"] = mode
    if file_type:
        parsed["type"] = file_type
    return parsed


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
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Task output is outside the configured output directory")
    if not candidate.exists() or not candidate.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Output file not found")
    return candidate


async def _zip_outputs(job_id: str, output_paths: list[str], settings: Settings, filename: str | None = None) -> Path:
    zip_path = settings.OUTPUT_DIR / (Path(filename).name if filename else f"{job_id}.zip")
    files = [_safe_output_path(path, settings) for path in output_paths]

    def write_zip() -> None:
        with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
            for file_path in files:
                archive.write(file_path, arcname=file_path.name)

    import asyncio

    await asyncio.to_thread(write_zip)
    return zip_path


@router.post("")
async def compress(
    settings: AppSettings,
    file: Annotated[UploadFile | None, File()] = None,
    file_id: Annotated[str | None, Form()] = None,
    mode: Annotated[str, Form()] = "smart",
    compression_settings: Annotated[str | None, Form(alias="settings")] = None,
    type: Annotated[str | None, Form()] = None,
) -> dict[str, str]:
    input_path = await _input_path_from_file_or_id(settings, file=file, file_id=file_id)
    payload = _parse_settings(compression_settings, mode, type)
    task = compress_file_task.apply_async(args=[str(input_path), str(_output_dir(settings)), payload], queue="heavy")
    return _queued_response(str(task.id), "Compression started")


@router.post("/json")
async def compress_json(payload: CompressJsonRequest, settings: AppSettings) -> dict[str, str]:
    input_path = resolve_upload_path(payload.file_id, settings)
    request_settings = {**payload.settings, "mode": payload.mode}
    task = compress_file_task.apply_async(args=[str(input_path), str(_output_dir(settings)), request_settings], queue="heavy")
    return _queued_response(str(task.id), "Compression started")


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
            response["output_filename"] = result.get("output_filename")
            response["media_type"] = result.get("media_type")
            response["extension"] = result.get("extension")
            response["result"] = result.get("result") or {
                "original_size": result.get("original_size"),
                "output_size": result.get("output_size"),
                "saved_bytes": result.get("saved_bytes"),
                "saved_percent": result.get("saved_percent"),
                "optimized": result.get("optimized"),
                "method": result.get("method"),
                "message": result.get("message"),
            }
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
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Task is not complete yet")
    if task.failed():
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(task.result))

    result = task.result or {}
    if not isinstance(result, dict) or result.get("status") == "failed":
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result.get("error") if isinstance(result, dict) else "Task failed",
        )

    output_path = result.get("output_path")
    output_paths = result.get("output_paths")
    output_filename = str(result.get("output_filename") or "").strip() or None
    media_type = str(result.get("media_type") or "").strip() or None
    if output_path:
        file_path = _safe_output_path(str(output_path), settings)
    elif isinstance(output_paths, list) and output_paths:
        file_path = await _zip_outputs(job_id, [str(path) for path in output_paths], settings, output_filename)
    else:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Output file not found. The job may have failed or expired.")

    return FileResponse(
        path=file_path,
        media_type=media_type or mimetypes.guess_type(file_path.name)[0] or "application/octet-stream",
        filename=output_filename or file_path.name,
        headers={"Cache-Control": "no-store"},
    )
