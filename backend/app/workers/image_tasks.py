import asyncio
from typing import Any, Awaitable

from fastapi import HTTPException

from app.services.image_service import ImageService
from app.workers.celery_app import celery_app


def _task_id(task: Any) -> str:
    return str(task.request.id)


def _success(task: Any, **result: str | list[str] | dict[str, Any]) -> dict[str, Any]:
    return {
        "task_id": _task_id(task),
        "status": "completed",
        **result,
        "error": None,
    }


def _failure(task: Any, exc: Exception) -> dict[str, Any]:
    error = exc.detail if isinstance(exc, HTTPException) else str(exc)
    return {
        "task_id": _task_id(task),
        "status": "failed",
        "output_path": None,
        "result": None,
        "error": error,
    }


def _run_service(coro: Awaitable[str | list[str] | dict[str, Any]]) -> str | list[str] | dict[str, Any]:
    return asyncio.run(coro)


@celery_app.task(
    bind=True,
    name="app.workers.image_tasks.convert_image_task",
    queue="fast",
    time_limit=60,
    soft_time_limit=55,
)
def convert_image_task(
    self: Any,
    input_path: str,
    output_path: str,
    format: str,
) -> dict[str, Any]:
    try:
        output = _run_service(ImageService().convert_image(input_path, output_path, format))
        return _success(self, output_path=str(output))
    except Exception as exc:
        return _failure(self, exc)


@celery_app.task(
    bind=True,
    name="app.workers.image_tasks.resize_image_task",
    queue="fast",
    time_limit=60,
    soft_time_limit=55,
)
def resize_image_task(
    self: Any,
    input_path: str,
    output_path: str,
    width: int | None = None,
    height: int | None = None,
    fit: str = "cover",
) -> dict[str, Any]:
    try:
        output = _run_service(ImageService().resize_image(input_path, output_path, width, height, fit))
        return _success(self, output_path=str(output))
    except Exception as exc:
        return _failure(self, exc)


@celery_app.task(
    bind=True,
    name="app.workers.image_tasks.compress_image_task",
    queue="fast",
    time_limit=60,
    soft_time_limit=55,
)
def compress_image_task(
    self: Any,
    input_path: str,
    output_path: str,
    quality: int = 85,
    format: str | None = None,
) -> dict[str, Any]:
    try:
        output = _run_service(ImageService().compress_image(input_path, output_path, quality, format))
        return _success(self, output_path=str(output))
    except Exception as exc:
        return _failure(self, exc)


@celery_app.task(
    bind=True,
    name="app.workers.image_tasks.crop_image_task",
    queue="fast",
    time_limit=60,
    soft_time_limit=55,
)
def crop_image_task(
    self: Any,
    input_path: str,
    output_path: str,
    x: int,
    y: int,
    width: int,
    height: int,
) -> dict[str, Any]:
    try:
        output = _run_service(ImageService().crop_image(input_path, output_path, x, y, width, height))
        return _success(self, output_path=str(output))
    except Exception as exc:
        return _failure(self, exc)


@celery_app.task(
    bind=True,
    name="app.workers.image_tasks.rotate_image_task",
    queue="fast",
    time_limit=60,
    soft_time_limit=55,
)
def rotate_image_task(self: Any, input_path: str, output_path: str, angle: int) -> dict[str, Any]:
    try:
        output = _run_service(ImageService().rotate_image(input_path, output_path, angle))
        return _success(self, output_path=str(output))
    except Exception as exc:
        return _failure(self, exc)


@celery_app.task(
    bind=True,
    name="app.workers.image_tasks.watermark_image_task",
    queue="fast",
    time_limit=60,
    soft_time_limit=55,
)
def watermark_image_task(
    self: Any,
    input_path: str,
    output_path: str,
    watermark_text: str,
    opacity: float = 0.5,
    position: str = "bottom-right",
) -> dict[str, Any]:
    try:
        output = _run_service(
            ImageService().watermark_image(input_path, output_path, watermark_text, opacity, position)
        )
        return _success(self, output_path=str(output))
    except Exception as exc:
        return _failure(self, exc)


@celery_app.task(
    bind=True,
    name="app.workers.image_tasks.remove_background_task",
    queue="fast",
    time_limit=60,
    soft_time_limit=55,
)
def remove_background_task(self: Any, input_path: str, output_path: str) -> dict[str, Any]:
    try:
        output = _run_service(ImageService().remove_background(input_path, output_path))
        return _success(self, output_path=str(output))
    except Exception as exc:
        return _failure(self, exc)


@celery_app.task(
    bind=True,
    name="app.workers.image_tasks.ocr_image_task",
    queue="fast",
    time_limit=60,
    soft_time_limit=55,
)
def ocr_image_task(self: Any, input_path: str, language: str = "eng") -> dict[str, Any]:
    try:
        text = _run_service(ImageService().ocr_image(input_path, language))
        return _success(self, result=str(text))
    except Exception as exc:
        return _failure(self, exc)


@celery_app.task(
    bind=True,
    name="app.workers.image_tasks.batch_resize_task",
    queue="heavy",
    time_limit=300,
    soft_time_limit=290,
)
def batch_resize_task(
    self: Any,
    input_paths: list[str],
    output_dir: str,
    width: int,
    height: int,
) -> dict[str, Any]:
    try:
        outputs = _run_service(ImageService().batch_resize(input_paths, output_dir, width, height))
        return _success(self, output_paths=list(outputs))
    except Exception as exc:
        return _failure(self, exc)


@celery_app.task(
    bind=True,
    name="app.workers.image_tasks.get_image_info_task",
    queue="fast",
    time_limit=60,
    soft_time_limit=55,
)
def get_image_info_task(self: Any, input_path: str) -> dict[str, Any]:
    try:
        info = _run_service(ImageService().get_image_info(input_path))
        return _success(self, result=dict(info))
    except Exception as exc:
        return _failure(self, exc)
