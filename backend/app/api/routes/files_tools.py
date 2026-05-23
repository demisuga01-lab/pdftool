from __future__ import annotations

import asyncio
import mimetypes
import zipfile
from pathlib import Path
from typing import Annotated, Any
from uuid import uuid4

import aiofiles
from celery.result import AsyncResult
from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, UploadFile, status
from fastapi.responses import FileResponse

from app.core.config import Settings
from app.core.dependencies import (
    get_app_settings,
    save_temp_upload,
    validate_optional_upload,
    validate_saved_upload_path,
    validate_saved_upload_paths,
    validate_upload_batch,
)
from app.core.audit_log import log_audit_event
from app.core.file_validation import expected_category_for_filename, validate_file_magic
from app.core.job_security import create_job_access, verify_job_access
from app.services.file_store import resolve_upload_path
from app.workers.celery_app import celery_app
from app.workers.file_tools_tasks import file_tool_task

router = APIRouter()
AppSettings = Annotated[Settings, Depends(get_app_settings)]

HEAVY_TOOLS = {"archive-create", "archive-extract", "metadata-clean", "office-metadata-clean"}
FILE_TOOLS_LIMIT_LABEL = "Maximum size for File Tools"
ALL_TOOLS = {
    "hash",
    "hash-batch",
    "checksum-verify",
    "file-type",
    "virus-scan",
    "extension-check",
    "metadata-view",
    "metadata-clean",
    "archive-create",
    "archive-extract",
    "archive-inspect",
    "archive-safety",
    "batch-rename",
    "filename-sanitize",
    "duplicate-find",
    "file-compare",
    "file-split",
    "file-join",
    "office-metadata-clean",
    "office-media-extract",
    "macro-check",
    "filename-check",
    "inventory-report",
    "text-encoding-convert",
}


def _new_job(settings: Settings) -> tuple[str, str]:
    job_id = uuid4().hex
    return job_id, create_job_access(job_id, settings)


def _queued_response(job_id: str, access_token: str, message: str) -> dict[str, str]:
    return {"job_id": job_id, "access_token": access_token, "status": "queued", "message": message}


def _output_dir(settings: Settings, job_id: str) -> Path:
    output_dir = settings.OUTPUT_DIR / job_id
    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir


async def _input_path(settings: Settings, file: UploadFile | None = None, file_id: str | None = None) -> Path:
    if file_id:
        path = resolve_upload_path(file_id, settings)
        validate_saved_upload_path(
            path,
            settings,
            max_size_mb=settings.FILE_TOOLS_MAX_FILE_SIZE_MB,
            limit_label=FILE_TOOLS_LIMIT_LABEL,
        )
        return path
    if file is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Provide either file_id or file.")
    validate_optional_upload(
        file,
        settings,
        max_size_mb=settings.FILE_TOOLS_MAX_FILE_SIZE_MB,
        limit_label=FILE_TOOLS_LIMIT_LABEL,
    )
    return await save_temp_upload(
        file,
        settings,
        max_size_mb=settings.FILE_TOOLS_MAX_FILE_SIZE_MB,
        limit_label=FILE_TOOLS_LIMIT_LABEL,
    )


async def _virus_scan_input_path(settings: Settings, file: UploadFile | None = None, file_id: str | None = None) -> Path:
    if file_id:
        path = resolve_upload_path(file_id, settings)
        validate_saved_upload_path(
            path,
            settings,
            max_size_mb=settings.FILE_TOOLS_MAX_FILE_SIZE_MB,
            limit_label=FILE_TOOLS_LIMIT_LABEL,
        )
        return path
    if file is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Provide either file_id or file.")

    settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    suffix = Path(file.filename or "").suffix.lower() or ".bin"
    destination = (settings.UPLOAD_DIR / f"{uuid4().hex}{suffix}").resolve(strict=False)
    upload_root = settings.UPLOAD_DIR.resolve(strict=False)
    if not destination.is_relative_to(upload_root):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Upload path is invalid.")

    await file.seek(0)
    header = await file.read(8192)
    await file.seek(0)
    category = expected_category_for_filename(file.filename or "")
    if category:
        validate_file_magic(header, category, file.filename or "upload")

    max_bytes = settings.FILE_TOOLS_MAX_FILE_SIZE_MB * 1024 * 1024
    bytes_written = 0
    async with aiofiles.open(destination, "wb") as output_file:
        while chunk := await file.read(1024 * 1024):
            bytes_written += len(chunk)
            if bytes_written > max_bytes:
                await output_file.close()
                destination.unlink(missing_ok=True)
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"File is too large. {FILE_TOOLS_LIMIT_LABEL} is {settings.FILE_TOOLS_MAX_FILE_SIZE_MB} MB.",
                )
            await output_file.write(chunk)
    await file.close()

    if bytes_written <= 0:
        destination.unlink(missing_ok=True)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty")
    log_audit_event("file_upload", file_name=file.filename, file_size=bytes_written)
    return destination


async def _input_paths(settings: Settings, files: list[UploadFile] | None = None, file_ids: list[str] | None = None) -> list[Path]:
    clean_ids = [file_id for file_id in (file_ids or []) if file_id]
    if clean_ids:
        paths = [resolve_upload_path(file_id, settings) for file_id in clean_ids]
        validate_saved_upload_paths(
            paths,
            settings,
            max_size_mb=settings.FILE_TOOLS_MAX_FILE_SIZE_MB,
            limit_label=FILE_TOOLS_LIMIT_LABEL,
        )
        return paths
    if not files:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Provide either file_ids or files.")
    validate_upload_batch(
        files,
        settings,
        max_size_mb=settings.FILE_TOOLS_MAX_FILE_SIZE_MB,
        limit_label=FILE_TOOLS_LIMIT_LABEL,
    )
    return [
        await save_temp_upload(
            file,
            settings,
            max_size_mb=settings.FILE_TOOLS_MAX_FILE_SIZE_MB,
            limit_label=FILE_TOOLS_LIMIT_LABEL,
        )
        for file in files
    ]


def _task_progress(state: str) -> int:
    return {"PENDING": 0, "RECEIVED": 10, "STARTED": 50, "RETRY": 50, "SUCCESS": 100, "FAILURE": 100, "REVOKED": 100}.get(state, 0)


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
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Task output is outside the configured output directory.")
    if not candidate.exists() or not candidate.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Output file not found.")
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


def _enqueue(tool: str, input_paths: list[Path], settings: Settings, params: dict[str, Any]) -> dict[str, str]:
    if tool not in ALL_TOOLS:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown file tool.")
    job_id, access_token = _new_job(settings)
    output_dir = _output_dir(settings, job_id)
    task = file_tool_task.apply_async(
        args=[tool, [str(path) for path in input_paths], str(output_dir), params],
        queue="heavy" if tool in HEAVY_TOOLS else "fast",
        task_id=job_id,
    )
    return _queued_response(str(task.id), access_token, f"{tool} queued")


@router.post("/hash")
async def hash_file(settings: AppSettings, file: Annotated[UploadFile | None, File()] = None, file_id: Annotated[str | None, Form()] = None, algorithms: Annotated[str, Form()] = "sha256") -> dict[str, str]:
    return _enqueue("hash", [await _input_path(settings, file, file_id)], settings, {"algorithms": algorithms})


@router.post("/hash-batch")
async def hash_batch(settings: AppSettings, files: Annotated[list[UploadFile] | None, File()] = None, file_ids: Annotated[list[str] | None, Form()] = None, algorithms: Annotated[str, Form()] = "sha256", output_format: Annotated[str, Form()] = "json") -> dict[str, str]:
    return _enqueue("hash-batch", await _input_paths(settings, files, file_ids), settings, {"algorithms": algorithms, "output_format": output_format})


@router.post("/checksum-verify")
async def checksum_verify(settings: AppSettings, expected_hash: Annotated[str, Form()], algorithm: Annotated[str, Form()] = "sha256", file: Annotated[UploadFile | None, File()] = None, file_id: Annotated[str | None, Form()] = None) -> dict[str, str]:
    return _enqueue("checksum-verify", [await _input_path(settings, file, file_id)], settings, {"algorithm": algorithm, "expected_hash": expected_hash})


@router.post("/file-type")
async def file_type(settings: AppSettings, file: Annotated[UploadFile | None, File()] = None, file_id: Annotated[str | None, Form()] = None) -> dict[str, str]:
    return _enqueue("file-type", [await _input_path(settings, file, file_id)], settings, {})


@router.post("/virus-scan")
async def virus_scan(settings: AppSettings, file: Annotated[UploadFile | None, File()] = None, file_id: Annotated[str | None, Form()] = None) -> dict[str, str]:
    return _enqueue("virus-scan", [await _virus_scan_input_path(settings, file, file_id)], settings, {})


@router.post("/extension-check")
async def extension_check(settings: AppSettings, files: Annotated[list[UploadFile] | None, File()] = None, file_ids: Annotated[list[str] | None, Form()] = None) -> dict[str, str]:
    return _enqueue("extension-check", await _input_paths(settings, files, file_ids), settings, {})


@router.post("/metadata-view")
async def metadata_view(settings: AppSettings, file: Annotated[UploadFile | None, File()] = None, file_id: Annotated[str | None, Form()] = None) -> dict[str, str]:
    return _enqueue("metadata-view", [await _input_path(settings, file, file_id)], settings, {})


@router.post("/metadata-clean")
async def metadata_clean(settings: AppSettings, file: Annotated[UploadFile | None, File()] = None, file_id: Annotated[str | None, Form()] = None, fields_to_remove: Annotated[str, Form()] = "all") -> dict[str, str]:
    return _enqueue("metadata-clean", [await _input_path(settings, file, file_id)], settings, {"fields_to_remove": fields_to_remove})


@router.post("/archive-create")
async def archive_create(settings: AppSettings, files: Annotated[list[UploadFile] | None, File()] = None, file_ids: Annotated[list[str] | None, Form()] = None, format: Annotated[str, Form()] = "zip", output_filename: Annotated[str, Form()] = "") -> dict[str, str]:
    return _enqueue("archive-create", await _input_paths(settings, files, file_ids), settings, {"format": format, "output_filename": output_filename})


@router.post("/archive-extract")
async def archive_extract(settings: AppSettings, file: Annotated[UploadFile | None, File()] = None, file_id: Annotated[str | None, Form()] = None, password: Annotated[str | None, Form()] = None) -> dict[str, str]:
    return _enqueue("archive-extract", [await _input_path(settings, file, file_id)], settings, {"password": password})


@router.post("/archive-inspect")
async def archive_inspect(settings: AppSettings, file: Annotated[UploadFile | None, File()] = None, file_id: Annotated[str | None, Form()] = None) -> dict[str, str]:
    return _enqueue("archive-inspect", [await _input_path(settings, file, file_id)], settings, {})


@router.post("/archive-safety")
async def archive_safety(settings: AppSettings, file: Annotated[UploadFile | None, File()] = None, file_id: Annotated[str | None, Form()] = None) -> dict[str, str]:
    return _enqueue("archive-safety", [await _input_path(settings, file, file_id)], settings, {})


@router.post("/batch-rename")
async def batch_rename(settings: AppSettings, files: Annotated[list[UploadFile] | None, File()] = None, file_ids: Annotated[list[str] | None, Form()] = None, pattern: Annotated[str, Form()] = "{name}-{n}.{ext}", start_number: Annotated[int, Form()] = 1, padding: Annotated[int, Form()] = 2, prefix: Annotated[str, Form()] = "", suffix: Annotated[str, Form()] = "", find: Annotated[str, Form()] = "", replace: Annotated[str, Form()] = "", case: Annotated[str, Form()] = "none") -> dict[str, str]:
    return _enqueue("batch-rename", await _input_paths(settings, files, file_ids), settings, locals() | {"files": None, "settings": None})


@router.post("/filename-sanitize")
async def filename_sanitize(settings: AppSettings, files: Annotated[list[UploadFile] | None, File()] = None, file_ids: Annotated[list[str] | None, Form()] = None, remove_special_chars: Annotated[bool, Form()] = True, replace_spaces: Annotated[str, Form()] = "underscore", lowercase: Annotated[bool, Form()] = False, remove_unicode: Annotated[bool, Form()] = False, max_length: Annotated[int, Form()] = 255) -> dict[str, str]:
    return _enqueue("filename-sanitize", await _input_paths(settings, files, file_ids), settings, locals() | {"files": None, "settings": None})


@router.post("/duplicate-find")
async def duplicate_find(settings: AppSettings, files: Annotated[list[UploadFile] | None, File()] = None, file_ids: Annotated[list[str] | None, Form()] = None, method: Annotated[str, Form()] = "hash") -> dict[str, str]:
    return _enqueue("duplicate-find", await _input_paths(settings, files, file_ids), settings, {"method": method})


@router.post("/file-compare")
async def file_compare(settings: AppSettings, file_a: Annotated[UploadFile | None, File()] = None, file_b: Annotated[UploadFile | None, File()] = None, file_id_a: Annotated[str | None, Form()] = None, file_id_b: Annotated[str | None, Form()] = None, mode: Annotated[str, Form()] = "binary") -> dict[str, str]:
    return _enqueue("file-compare", [await _input_path(settings, file_a, file_id_a), await _input_path(settings, file_b, file_id_b)], settings, {"mode": mode})


@router.post("/file-split")
async def file_split(settings: AppSettings, file: Annotated[UploadFile | None, File()] = None, file_id: Annotated[str | None, Form()] = None, mode: Annotated[str, Form()] = "by_size", chunk_size_bytes: Annotated[int, Form()] = 1048576, chunk_count: Annotated[int, Form()] = 2, output_prefix: Annotated[str, Form()] = "") -> dict[str, str]:
    return _enqueue("file-split", [await _input_path(settings, file, file_id)], settings, {"mode": mode, "chunk_size_bytes": chunk_size_bytes, "chunk_count": chunk_count, "output_prefix": output_prefix})


@router.post("/file-join")
async def file_join(settings: AppSettings, files: Annotated[list[UploadFile] | None, File()] = None, file_ids: Annotated[list[str] | None, Form()] = None, manifest: Annotated[str, Form()] = "", output_filename: Annotated[str, Form()] = "") -> dict[str, str]:
    return _enqueue("file-join", await _input_paths(settings, files, file_ids), settings, {"manifest": manifest, "output_filename": output_filename})


@router.post("/office-metadata-clean")
async def office_metadata_clean(settings: AppSettings, file: Annotated[UploadFile | None, File()] = None, file_id: Annotated[str | None, Form()] = None, fields: Annotated[str, Form()] = "all") -> dict[str, str]:
    return _enqueue("office-metadata-clean", [await _input_path(settings, file, file_id)], settings, {"fields": fields})


@router.post("/office-media-extract")
async def office_media_extract(settings: AppSettings, file: Annotated[UploadFile | None, File()] = None, file_id: Annotated[str | None, Form()] = None) -> dict[str, str]:
    return _enqueue("office-media-extract", [await _input_path(settings, file, file_id)], settings, {})


@router.post("/macro-check")
async def macro_check(settings: AppSettings, file: Annotated[UploadFile | None, File()] = None, file_id: Annotated[str | None, Form()] = None) -> dict[str, str]:
    return _enqueue("macro-check", [await _input_path(settings, file, file_id)], settings, {})


@router.post("/filename-check")
async def filename_check(settings: AppSettings, filename: Annotated[str, Form()] = "", file: Annotated[UploadFile | None, File()] = None, file_id: Annotated[str | None, Form()] = None) -> dict[str, str]:
    paths = [await _input_path(settings, file, file_id)] if file or file_id else []
    return _enqueue("filename-check", paths, settings, {"filename": filename})


@router.post("/inventory-report")
async def inventory_report(settings: AppSettings, files: Annotated[list[UploadFile] | None, File()] = None, file_ids: Annotated[list[str] | None, Form()] = None, output_format: Annotated[str, Form()] = "json", include_hashes: Annotated[bool, Form()] = False, include_mime: Annotated[bool, Form()] = True) -> dict[str, str]:
    return _enqueue("inventory-report", await _input_paths(settings, files, file_ids), settings, {"output_format": output_format, "include_hashes": include_hashes, "include_mime": include_mime})


@router.post("/text-encoding-convert")
async def text_encoding_convert(settings: AppSettings, file: Annotated[UploadFile | None, File()] = None, file_id: Annotated[str | None, Form()] = None, from_encoding: Annotated[str, Form()] = "auto-detect", to_encoding: Annotated[str, Form()] = "UTF-8", line_endings: Annotated[str, Form()] = "preserve", remove_bom: Annotated[bool, Form()] = False, add_bom: Annotated[bool, Form()] = False) -> dict[str, str]:
    return _enqueue("text-encoding-convert", [await _input_path(settings, file, file_id)], settings, {"from_encoding": from_encoding, "to_encoding": to_encoding, "line_endings": line_endings, "remove_bom": remove_bom, "add_bom": add_bom})


@router.get("/status/{job_id}")
async def get_status(
    job_id: str,
    settings: AppSettings,
    token: str | None = None,
    x_access_token: Annotated[str | None, Header(alias="X-Access-Token")] = None,
) -> dict[str, Any]:
    verify_job_access(job_id, token, x_access_token, settings)
    task = _task_result(job_id)
    response: dict[str, Any] = {"job_id": job_id, "status": _normalized_task_state(task.state), "stage": "queued" if _normalized_task_state(task.state) == "queued" else "processing", "progress": _task_progress(task.state)}
    if task.successful():
        result = task.result or {}
        if isinstance(result, dict):
            response.update({key: result.get(key) for key in ("output_path", "output_paths", "output_filename", "media_type", "extension", "result", "error")})
            response["status"] = "failure" if result.get("status") in {"failure", "failed"} else "success"
            response["stage"] = result.get("stage", "finalizing")
            response["progress"] = result.get("progress", 100)
    elif task.failed():
        from app.core.errors import sanitize_error_message

        response.update({"status": "failure", "stage": "processing", "error": sanitize_error_message(str(task.result) if task.result else None)})
    return response


@router.get("/download/{job_id}")
async def download_output(
    job_id: str,
    settings: AppSettings,
    token: str | None = None,
    x_access_token: Annotated[str | None, Header(alias="X-Access-Token")] = None,
) -> FileResponse:
    verify_job_access(job_id, token, x_access_token, settings)
    task = _task_result(job_id)
    if not task.ready():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Task is not complete yet.")
    result = task.result or {}
    if not isinstance(result, dict) or result.get("status") == "failed":
        from app.core.errors import sanitize_error_message

        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=sanitize_error_message(str(result.get("error") if isinstance(result, dict) else task.result)))
    output_path_value = result.get("output_path")
    output_paths = result.get("output_paths")
    output_filename = str(result.get("output_filename") or "").strip() or None
    media_type = str(result.get("media_type") or "").strip() or None
    if output_path_value:
        file_path = _safe_output_path(str(output_path_value), settings)
    elif isinstance(output_paths, list) and output_paths:
        file_path = await _zip_outputs(job_id, [str(path) for path in output_paths], settings, output_filename)
    else:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="This file-tools job does not have a downloadable output.")
    log_audit_event("file_download", job_id=job_id, file_name=output_filename or file_path.name)
    return FileResponse(path=file_path, media_type=media_type or mimetypes.guess_type(file_path.name)[0] or "application/octet-stream", filename=output_filename or file_path.name, headers={"Cache-Control": "no-store"})
