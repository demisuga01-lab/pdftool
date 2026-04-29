import asyncio
import logging
import mimetypes
import traceback
from pathlib import Path
from typing import Any, Awaitable

from fastapi import HTTPException

from app.services.compression_service import CompressionService
from app.services.image_service import ImageService
from app.services.ocr_service import OCRService
from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)


def _task_id(task: Any) -> str:
    return str(task.request.id)


def _success(task: Any, **result: str | list[str] | dict[str, Any]) -> dict[str, Any]:
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
        **result,
        "error": None,
    }


def _failure(task: Any, exc: Exception) -> dict[str, Any]:
    error = exc.detail if isinstance(exc, HTTPException) else str(exc)
    logger.exception("Image task %s failed", _task_id(task))
    return {
        "task_id": _task_id(task),
        "status": "failure",
        "stage": "processing",
        "output_path": None,
        "result": None,
        "error": error,
        "traceback": traceback.format_exc(),
    }


def _run_service(coro: Awaitable[str | list[str] | dict[str, Any]]) -> str | list[str] | dict[str, Any]:
    return asyncio.run(coro)


def _safe_stem(value: str | None, fallback: str) -> str:
    stem = Path(str(value or "").strip()).stem
    safe = "".join(char if char.isalnum() or char in "._-" else "-" for char in stem).strip(".-")
    fallback_safe = "".join(char if char.isalnum() or char in "._-" else "-" for char in fallback).strip(".-")
    return safe or fallback_safe or "output"


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
    quality: int = 85,
    preserve_metadata: bool = False,
    color_space: str = "srgb",
) -> dict[str, Any]:
    try:
        output = _run_service(
            ImageService().convert_image(
                input_path,
                output_path,
                format,
                quality,
                preserve_metadata,
                color_space,
            )
        )
        if isinstance(output, dict):
            return _success(self, output_path=str(output.get("output_path")), result=output)
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
    kernel: str = "lanczos3",
    without_enlargement: bool = False,
    quality: int = 85,
    mode: str = "pixels",
    percentage: float | None = None,
    allow_upscale: bool = True,
    background: str = "#ffffff",
) -> dict[str, Any]:
    try:
        output = _run_service(
            ImageService().resize_image(
                input_path,
                output_path,
                width,
                height,
                fit,
                kernel,
                without_enlargement,
                quality,
                mode,
                percentage,
                allow_upscale,
                background,
            )
        )
        if isinstance(output, dict):
            return _success(self, output_path=str(output.get("output_path")), result=output)
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
    progressive: bool = False,
    strip_metadata: bool = False,
    compression_level: int = 6,
    force_recompress: bool = False,
) -> dict[str, Any]:
    try:
        output = _run_service(
            CompressionService().compress_file(
                input_path,
                str(Path(output_path).parent),
                {
                    "type": "image",
                    "quality": quality,
                    "output_format": format or "keep",
                    "progressive": progressive,
                    "strip_metadata": strip_metadata,
                    "png_compression": compression_level,
                    "force_recompress": force_recompress,
                    "keep_original_if_smaller": True,
                },
            )
        )
        if isinstance(output, dict):
            return _success(self, output_path=str(output.get("output_path")), result=output)
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
def rotate_image_task(
    self: Any,
    input_path: str,
    output_path: str,
    angle: int,
    flip_horizontal: bool = False,
    flip_vertical: bool = False,
    output_format: str | None = None,
    expand_canvas: bool = True,
    background: str = "#00000000",
    auto_crop: bool = False,
) -> dict[str, Any]:
    try:
        output = _run_service(
            ImageService().rotate_image(
                input_path,
                output_path,
                angle,
                flip_horizontal,
                flip_vertical,
                output_format,
                expand_canvas,
                background,
                auto_crop,
            )
        )
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
    watermark_type: str = "text",
    watermark_text: str = "",
    watermark_image_path: str | None = None,
    opacity: float = 0.5,
    position: str = "bottom-right",
    x_percent: float | None = None,
    y_percent: float | None = None,
    width_percent: float = 22,
    height_percent: float | None = None,
    font_size: int = 36,
    font_color: str = "#ffffff",
    font_weight: str = "bold",
    font_family: str = "Arial",
    italic: bool = False,
    rotation: float = 0,
    tile: bool = False,
) -> dict[str, Any]:
    try:
        output = _run_service(
            ImageService().watermark_image(
                input_path,
                output_path,
                watermark_type,
                watermark_text,
                watermark_image_path,
                opacity,
                position,
                x_percent,
                y_percent,
                width_percent,
                height_percent,
                font_size,
                font_color,
                font_weight,
                font_family,
                italic,
                rotation,
                tile,
            )
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
    queue="heavy",
    time_limit=300,
    soft_time_limit=290,
)
def ocr_image_task(
    self: Any,
    input_path: str,
    output_dir: str,
    language: str = "eng",
    output_format: str = "txt",
    input_type: str = "auto",
    page_range: str = "all",
    deskew: bool = False,
    denoise: bool = False,
    enhance_contrast: bool = False,
    dpi: int = 300,
    password: str | None = None,
    output_filename: str | None = None,
) -> dict[str, Any]:
    try:
        output = Path(_run_service(OCRService().ocr(input_path, output_dir, language, output_format, dpi, password=password)))
        if output_filename and output_filename.strip():
            safe_name = f"{_safe_stem(output_filename, output.stem)}{output.suffix}"
            renamed = output.parent / safe_name
            output.replace(renamed)
            output = renamed
        return _success(self, output_path=str(output), output_filename=output.name)
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
