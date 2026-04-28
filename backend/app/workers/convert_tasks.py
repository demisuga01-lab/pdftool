import asyncio
import logging
import traceback
from typing import Any, Awaitable

from fastapi import HTTPException

from app.services.conversion_service import ConversionService
from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)


def _task_id(task: Any) -> str:
    return str(task.request.id)


def _success(task: Any, **result: Any) -> dict[str, Any]:
    return {
        "task_id": _task_id(task),
        "status": "success",
        "stage": "finalizing",
        **result,
        "error": None,
    }


def _failure(task: Any, exc: Exception) -> dict[str, Any]:
    error = exc.detail if isinstance(exc, HTTPException) else str(exc)
    logger.exception("Convert task %s failed", _task_id(task))
    return {
        "task_id": _task_id(task),
        "status": "failure",
        "stage": "processing",
        "output_path": None,
        "output_paths": None,
        "error": error,
        "traceback": traceback.format_exc(),
    }


def _run_service(coro: Awaitable[dict[str, Any]]) -> dict[str, Any]:
    return asyncio.run(coro)


@celery_app.task(
    bind=True,
    name="app.workers.convert_tasks.convert_file_task",
    queue="heavy",
    time_limit=300,
    soft_time_limit=290,
)
def convert_file_task(
    self: Any,
    input_path: str,
    output_dir: str,
    to_format: str,
    from_format: str | None = None,
    mime_type: str | None = None,
    settings: dict[str, Any] | None = None,
) -> dict[str, Any]:
    try:
        result = _run_service(
            ConversionService().convert(
                input_path,
                output_dir,
                to_format,
                from_format=from_format,
                mime_type=mime_type,
                settings=settings,
            )
        )
        return _success(self, **result)
    except Exception as exc:
        return _failure(self, exc)
