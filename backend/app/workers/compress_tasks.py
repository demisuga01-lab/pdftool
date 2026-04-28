import asyncio
import logging
import traceback
from typing import Any, Awaitable

from fastapi import HTTPException

from app.services.compression_service import CompressionService
from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)


def _task_id(task: Any) -> str:
    return str(task.request.id)


def _success(task: Any, **result: Any) -> dict[str, Any]:
    return {
        "task_id": _task_id(task),
        "status": "success",
        "stage": "finalizing",
        "progress": 100,
        **result,
        "result": result,
        "error": None,
    }


def _failure(task: Any, exc: Exception) -> dict[str, Any]:
    error = exc.detail if isinstance(exc, HTTPException) else str(exc)
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
    time_limit=600,
    soft_time_limit=590,
)
def compress_file_task(self: Any, input_path: str, output_dir: str, settings: dict[str, Any] | None = None) -> dict[str, Any]:
    try:
        result = _run_service(CompressionService().compress_file(input_path, output_dir, settings or {}))
        return _success(self, **result)
    except Exception as exc:
        return _failure(self, exc)
