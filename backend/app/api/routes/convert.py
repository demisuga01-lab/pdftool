import asyncio
import json
import logging
import mimetypes
import zipfile
from pathlib import Path
from typing import Annotated, Any
from uuid import uuid4

from celery.result import AsyncResult
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse

from app.core.config import Settings
from app.core.dependencies import (
    get_app_settings,
    save_temp_upload,
    validate_saved_upload_path,
)
from app.services.conversion_service import ConversionService
from app.services.file_store import read_upload_metadata, resolve_upload_path
from app.workers.celery_app import celery_app
from app.workers.convert_tasks import convert_file_task

router = APIRouter()
logger = logging.getLogger(__name__)

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


def _normalize_task_result_payload(result: dict[str, Any]) -> dict[str, Any]:
    normalized = dict(result)
    output_path = normalized.get("output_path")
    raw_output_paths = normalized.get("output_paths")
    output_paths = [str(path) for path in raw_output_paths] if isinstance(raw_output_paths, list) else []

    if output_path or len(output_paths) != 1:
        return normalized

    single_path = output_paths[0]
    single_name = Path(single_path).name
    normalized["output_path"] = single_path
    normalized["output_paths"] = None

    current_filename = str(normalized.get("output_filename") or "").strip()
    if not current_filename or current_filename.lower().endswith(".zip"):
        normalized["output_filename"] = single_name

    current_media_type = str(normalized.get("media_type") or "").strip()
    if not current_media_type or current_media_type == "application/zip":
        normalized["media_type"] = mimetypes.guess_type(single_name)[0] or "application/octet-stream"

    normalized["extension"] = Path(single_name).suffix.lstrip(".")
    return normalized


async def _input_path_from_file_or_id(
    settings: Settings,
    file: UploadFile | None,
    file_id: str | None,
) -> tuple[Path, dict[str, Any]]:
    if file_id:
        metadata = read_upload_metadata(file_id, settings)
        path = resolve_upload_path(file_id, settings)
        validate_saved_upload_path(path, settings)
        return path, metadata

    if file is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide either file_id or file",
        )

    input_path = await save_temp_upload(file, settings)
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

    conversion_service = ConversionService()
    requested_to_format = to_format
    normalized_to_format = conversion_service.normalize_output_format(to_format)

    if file is not None:
        from app.core.dependencies import validate_optional_upload

        validate_optional_upload(file, settings)

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

    detected_from = conversion_service.detect_input_format(
        input_path,
        from_format=from_format,
        mime_type=str(metadata.get("mime_type") or ""),
    )
    task = convert_file_task.delay(
        str(input_path),
        str(_output_dir(settings)),
        normalized_to_format,
        detected_from,
        str(metadata.get("mime_type") or ""),
        parsed_settings,
    )
    logger.info(
        "Queued conversion task job_id=%s requested_format=%s normalized_format=%s input_extension=%s",
        task.id,
        requested_to_format,
        normalized_to_format,
        Path(input_path).suffix.lower().lstrip("."),
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
            from app.core.errors import sanitize_error_message

            normalized_result = _normalize_task_result_payload(result)
            response["status"] = "failure" if result.get("status") in {"failure", "failed"} else "success"
            response["stage"] = normalized_result.get("stage", "finalizing")
            response["progress"] = normalized_result.get("progress", 100)
            response["output_path"] = normalized_result.get("output_path")
            response["output_paths"] = normalized_result.get("output_paths")
            response["output_filename"] = normalized_result.get("output_filename")
            response["media_type"] = normalized_result.get("media_type")
            response["extension"] = normalized_result.get("extension")
            response["result"] = normalized_result.get("result")
            response["error"] = sanitize_error_message(normalized_result.get("error")) if normalized_result.get("error") else None
    elif task.failed():
        from app.core.errors import sanitize_error_message

        response["status"] = "failure"
        response["stage"] = "processing"
        response["error"] = sanitize_error_message(str(task.result) if task.result else None)

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
        from app.core.errors import sanitize_error_message

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=sanitize_error_message(str(task.result) if task.result else None),
        )

    result = task.result or {}
    if not isinstance(result, dict) or result.get("status") == "failed":
        from app.core.errors import sanitize_error_message

        raw = result.get("error") if isinstance(result, dict) else None
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=sanitize_error_message(str(raw) if raw is not None else None),
        )

    normalized_result = _normalize_task_result_payload(result)
    output_path = normalized_result.get("output_path")
    output_paths = normalized_result.get("output_paths")
    output_filename = str(normalized_result.get("output_filename") or "").strip() or None
    media_type = str(normalized_result.get("media_type") or "").strip() or None

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
