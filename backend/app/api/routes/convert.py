import asyncio
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

from app.core.config import Settings
from app.core.dependencies import get_app_settings
from app.services.conversion_service import ConversionService
from app.services.file_store import read_upload_metadata, resolve_upload_path
from app.workers.celery_app import celery_app
from app.workers.convert_tasks import convert_file_task

router = APIRouter()

AppSettings = Annotated[Settings, Depends(get_app_settings)]


def _queued_response(job_id: str, message: str) -> dict[str, str]:
    return {"job_id": job_id, "status": "queued", "message": message}


def _output_dir(settings: Settings) -> Path:
    output_dir = settings.OUTPUT_DIR / uuid4().hex
    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir


def _task_result(job_id: str) -> AsyncResult:
    return AsyncResult(job_id, app=celery_app)


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


async def _zip_outputs(job_id: str, output_paths: list[str], settings: Settings, filename: str | None = None) -> Path:
    zip_path = settings.OUTPUT_DIR / (Path(filename).name if filename else f"{job_id}.zip")
    files = [_safe_output_path(path, settings) for path in output_paths]

    def write_zip() -> None:
        with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
            for file_path in files:
                archive.write(file_path, arcname=file_path.name)

    await asyncio.to_thread(write_zip)
    return zip_path


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


async def _input_path_from_file_or_id(
    settings: Settings,
    file: UploadFile | None,
    file_id: str | None,
) -> tuple[Path, dict[str, Any]]:
    if file_id:
        metadata = read_upload_metadata(file_id, settings)
        return resolve_upload_path(file_id, settings), metadata

    if file is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide either file_id or file",
        )

    input_path = await _save_upload(file, settings)
    mime_type = file.content_type or "application/octet-stream"
    return input_path, {
        "original_name": file.filename or input_path.name,
        "mime_type": mime_type,
        "extension": Path(file.filename or input_path.name).suffix.lstrip("."),
    }


@router.post("")
@router.post("/")
async def convert_file(
    settings: AppSettings,
    to_format: Annotated[str, Form()],
    file: Annotated[UploadFile | None, File()] = None,
    file_id: Annotated[str | None, Form()] = None,
    from_format: Annotated[str | None, Form()] = None,
    output_filename: Annotated[str | None, Form()] = None,
    settings_json: Annotated[str | None, Form(alias="settings")] = None,
) -> dict[str, str]:
    if not to_format.strip():
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="to_format is required")

    input_path, metadata = await _input_path_from_file_or_id(settings, file, file_id)
    parsed_settings: dict[str, Any] = {}
    if settings_json:
        try:
            parsed_settings = json.loads(settings_json)
        except json.JSONDecodeError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="settings must be valid JSON",
            ) from exc
    if output_filename and output_filename.strip():
        parsed_settings["output_filename"] = output_filename.strip()

    detected_from = ConversionService().detect_input_format(
        input_path,
        from_format=from_format,
        mime_type=str(metadata.get("mime_type") or ""),
    )
    task = convert_file_task.delay(
        str(input_path),
        str(_output_dir(settings)),
        to_format,
        detected_from,
        str(metadata.get("mime_type") or ""),
        parsed_settings,
    )
    return _queued_response(str(task.id), "Conversion queued")


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
    output_filename = str(result.get("output_filename") or "").strip() or None
    media_type = str(result.get("media_type") or "").strip() or None

    if output_path:
        file_path = _safe_output_path(str(output_path), settings)
    elif isinstance(output_paths, list) and output_paths:
        file_path = await _zip_outputs(job_id, [str(path) for path in output_paths], settings, output_filename)
    else:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Output file not found. The job may have failed or expired.",
        )

    return FileResponse(
        path=file_path,
        media_type=media_type or mimetypes.guess_type(file_path.name)[0] or "application/octet-stream",
        filename=output_filename or file_path.name,
        headers={"Cache-Control": "no-store"},
    )
