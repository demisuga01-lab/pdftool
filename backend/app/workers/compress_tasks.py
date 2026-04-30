import asyncio
import logging
import mimetypes
import time
import traceback
from pathlib import Path
from typing import Any, Awaitable

from celery.exceptions import SoftTimeLimitExceeded
from fastapi import HTTPException

from app.services.compression_service import CompressionService
from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)

COMPRESSION_TIMEOUT_MESSAGE = (
    "Compression took longer than allowed and was stopped. Try a smaller file, "
    "a less aggressive mode, or disable target-size matching."
)


def _task_id(task: Any) -> str:
    return str(task.request.id)


def _success(task: Any, **result: Any) -> dict[str, Any]:
    output_path = result.get("output_path")
    if output_path and not result.get("output_filename"):
        path = Path(str(output_path))
        result["output_filename"] = path.name
        result["media_type"] = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        result["extension"] = path.suffix.lstrip(".")
    return {
        "task_id": _task_id(task),
        "status": "success",
        "stage": "finalizing",
        "progress": 100,
        **result,
        "result": result,
        "error": None,
    }


def _failure(task: Any, exc: Exception, *, message: str | None = None) -> dict[str, Any]:
    if message is not None:
        error = message
    elif isinstance(exc, HTTPException):
        error = exc.detail
    else:
        error = str(exc) or exc.__class__.__name__
    logger.exception("Compression task %s failed", _task_id(task))
    return {
        "task_id": _task_id(task),
        "status": "failure",
        "stage": "processing",
        "progress": 100,
        "output_path": None,
        "result": None,
        "error": error,
        "traceback": traceback.format_exc(),
    }


def _run_service(coro: Awaitable[Any]) -> Any:
    return asyncio.run(coro)


@celery_app.task(
    bind=True,
    name="app.workers.compress_tasks.compress_file_task",
    queue="heavy",
    time_limit=240,
    soft_time_limit=210,
    acks_late=True,
    reject_on_worker_lost=True,
)
def compress_file_task(self: Any, input_path: str, output_dir: str, settings: dict[str, Any] | None = None) -> dict[str, Any]:
    job_id = _task_id(self)
    payload = settings or {}
    started = time.monotonic()
    logger.info(
        "compress_file_task start job_id=%s mode=%s type=%s target=%s lossless=%s",
        job_id,
        payload.get("mode"),
        payload.get("type"),
        payload.get("target_size_bytes"),
        payload.get("lossless"),
    )
    try:
        result = _run_service(CompressionService().compress_file(input_path, output_dir, payload))
        elapsed = time.monotonic() - started
        logger.info(
            "compress_file_task success job_id=%s elapsed=%.2fs method=%s reached_target=%s",
            job_id,
            elapsed,
            result.get("method"),
            result.get("reached_target"),
        )
        return _success(self, **result)
    except SoftTimeLimitExceeded as exc:
        elapsed = time.monotonic() - started
        logger.warning("compress_file_task soft-timeout job_id=%s elapsed=%.2fs", job_id, elapsed)
        return _failure(self, exc, message=COMPRESSION_TIMEOUT_MESSAGE)
    except Exception as exc:
        elapsed = time.monotonic() - started
        logger.warning("compress_file_task error job_id=%s elapsed=%.2fs error=%s", job_id, elapsed, exc)
        return _failure(self, exc)
