from __future__ import annotations

import asyncio
import logging
import mimetypes
from pathlib import Path
from typing import Any, Awaitable

from fastapi import HTTPException

from app.core.audit_log import log_audit_event
from app.core.errors import sanitize_error_message
from app.services.archive_service import ArchiveService
from app.services.compare_service import CompareService
from app.services.duplicate_service import DuplicateService
from app.services.file_tools_service import TextEncodingService, json_list
from app.services.filetype_service import FileTypeService
from app.services.hash_service import HashService
from app.services.metadata_service import MetadataService
from app.services.office_file_service import OfficeFileService
from app.services.rename_service import RenameService
from app.services.report_service import ReportService
from app.services.security_file_service import SecurityFileService
from app.services.split_join_service import SplitJoinService
from app.services.virus_scanner import VirusScanner
from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)


def _task_id(task: Any) -> str:
    return str(task.request.id)


def _success(task: Any, **result: Any) -> dict[str, Any]:
    output_path = result.get("output_path")
    if output_path and not result.get("output_filename"):
        path = Path(str(output_path))
        result["output_filename"] = path.name
        result["media_type"] = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        result["extension"] = path.suffix.lstrip(".")
    log_audit_event("job_completed", job_id=_task_id(task), extra={"tool": getattr(task, "name", None)})
    return {"task_id": _task_id(task), "status": "success", "stage": "finalizing", **result, "error": None}


def _failure(task: Any, exc: Exception) -> dict[str, Any]:
    raw_detail = exc.detail if isinstance(exc, HTTPException) else str(exc)
    logger.exception("File tools task %s failed", _task_id(task))
    log_audit_event("job_failed", job_id=_task_id(task), extra={"tool": getattr(task, "name", None)})
    return {
        "task_id": _task_id(task),
        "status": "failure",
        "stage": "processing",
        "output_path": None,
        "output_paths": None,
        "error": sanitize_error_message(str(raw_detail) if raw_detail is not None else None),
    }


def _scan_failure(task: Any, filename: str) -> dict[str, Any]:
    log_audit_event("job_failed", job_id=_task_id(task), file_name=filename, extra={"tool": getattr(task, "name", None), "reason": "virus_scan"})
    return {
        "task_id": _task_id(task),
        "status": "failure",
        "stage": "processing",
        "output_path": None,
        "output_paths": None,
        "error": (
            "This file was flagged by virus scanning and cannot be processed. "
            "If you believe this is a false positive, contact support@wellfriend.online with the job ID. "
            f"File: {filename}"
        ),
    }


def _scan_inputs(task: Any, tool: str, input_paths: list[str]) -> dict[str, Any] | None:
    if tool in {"text-encoding-convert", "virus-scan"}:
        return None

    for index, input_path in enumerate(input_paths, start=1):
        file_path = Path(input_path)
        scan_result = VirusScanner.scan_file(file_path)
        if not scan_result["clean"]:
            return _scan_failure(task, file_path.name or f"file {index}")
    return None


def _run_service(coro: Awaitable[Any]) -> Any:
    return asyncio.run(coro)


async def _dispatch(tool: str, input_paths: list[str], output_dir: str, params: dict[str, Any]) -> dict[str, Any]:
    first = input_paths[0] if input_paths else ""
    if tool == "hash":
        return {"result": HashService().hash_file(first, json_list(params.get("algorithms"), ["sha256"]))}
    if tool == "hash-batch":
        return await HashService().batch_hash(input_paths, output_dir, json_list(params.get("algorithms"), ["sha256"]), str(params.get("output_format") or "json"))
    if tool == "checksum-verify":
        return {"result": HashService().verify(first, str(params.get("algorithm") or "sha256"), str(params.get("expected_hash") or ""))}
    if tool == "file-type":
        return {"result": await FileTypeService().detect(first)}
    if tool == "virus-scan":
        file_path = Path(first)
        result = VirusScanner.scan_file(file_path)
        return {
            "status": "success",
            "result": {
                "clean": result["clean"],
                "threat": result["threat"],
                "scanner": result["scanner"],
                "filename": file_path.name,
                "size_bytes": file_path.stat().st_size,
            },
        }
    if tool == "extension-check":
        return {"result": await FileTypeService().extension_report(input_paths, output_dir)}
    if tool == "metadata-view":
        return {"result": await MetadataService().view(first)}
    if tool == "metadata-clean":
        return await MetadataService().clean(first, output_dir, json_list(params.get("fields_to_remove"), ["all"]))
    if tool == "archive-create":
        return await ArchiveService().create(input_paths, output_dir, str(params.get("format") or "zip"), str(params.get("output_filename") or ""))
    if tool == "archive-extract":
        return await ArchiveService().extract(first, output_dir, params.get("password"))
    if tool == "archive-inspect":
        return {"result": await ArchiveService().inspect(first)}
    if tool == "archive-safety":
        return {"result": await ArchiveService().safety(first)}
    if tool == "batch-rename":
        return await RenameService().batch_rename(input_paths, output_dir, params)
    if tool == "filename-sanitize":
        return await RenameService().sanitize(input_paths, output_dir, params)
    if tool == "duplicate-find":
        return {"result": await DuplicateService().find(input_paths, output_dir, str(params.get("method") or "hash"))}
    if tool == "file-compare":
        return {"result": await CompareService().compare(input_paths[0], input_paths[1], str(params.get("mode") or "binary"))}
    if tool == "file-split":
        return await SplitJoinService().split(first, output_dir, params)
    if tool == "file-join":
        return await SplitJoinService().join(input_paths, output_dir, params)
    if tool == "office-metadata-clean":
        return await OfficeFileService().clean_metadata(first, output_dir, json_list(params.get("fields"), ["all"]))
    if tool == "office-media-extract":
        return await OfficeFileService().extract_media(first, output_dir)
    if tool == "macro-check":
        return {"result": await SecurityFileService().macro_check(first)}
    if tool == "filename-check":
        filename = str(params.get("filename") or Path(first).name)
        return {"result": SecurityFileService().filename_check(filename)}
    if tool == "inventory-report":
        return await ReportService().inventory(
            input_paths,
            output_dir,
            str(params.get("output_format") or "json"),
            bool(params.get("include_hashes")),
            bool(params.get("include_mime", True)),
        )
    if tool == "text-encoding-convert":
        return await TextEncodingService().convert_encoding(
            first,
            output_dir,
            from_encoding=str(params.get("from_encoding") or "auto-detect"),
            to_encoding=str(params.get("to_encoding") or "UTF-8"),
            line_endings=str(params.get("line_endings") or "preserve"),
            remove_bom=bool(params.get("remove_bom")),
            add_bom=bool(params.get("add_bom")),
        )
    raise HTTPException(status_code=400, detail="Unknown file tool.")


@celery_app.task(
    bind=True,
    name="app.workers.file_tools_tasks.file_tool_task",
    queue="fast",
    time_limit=300,
    soft_time_limit=290,
)
def file_tool_task(self: Any, tool: str, input_paths: list[str], output_dir: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
    try:
        scan_failure = _scan_inputs(self, tool, input_paths)
        if scan_failure:
            return scan_failure
        result = _run_service(_dispatch(tool, input_paths, output_dir, params or {}))
        return _success(self, **result)
    except Exception as exc:
        return _failure(self, exc)
