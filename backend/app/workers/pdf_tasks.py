import asyncio
import logging
import mimetypes
from pathlib import Path
from typing import Any, Awaitable

from fastapi import HTTPException

from app.core.errors import sanitize_error_message
from app.services.compression_service import CompressionService
from app.services.ocr_service import OCRService
from app.services.pdf_service import PDFService
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
    return {
        "task_id": _task_id(task),
        "status": "success",
        "stage": "finalizing",
        **result,
        "error": None,
    }


def _failure(task: Any, exc: Exception) -> dict[str, Any]:
    raw_detail = exc.detail if isinstance(exc, HTTPException) else str(exc)
    logger.exception("PDF task %s failed", _task_id(task))
    return {
        "task_id": _task_id(task),
        "status": "failure",
        "stage": "processing",
        "output_path": None,
        "error": sanitize_error_message(str(raw_detail) if raw_detail is not None else None),
    }


def _run_service(coro: Awaitable[Any]) -> Any:
    return asyncio.run(coro)


@celery_app.task(
    bind=True,
    name="app.workers.pdf_tasks.compress_pdf_task",
    queue="heavy",
    time_limit=300,
    soft_time_limit=290,
)
def compress_pdf_task(
    self: Any,
    input_path: str,
    output_path: str,
    quality: str = "ebook",
    color_mode: str = "rgb",
    compatibility_level: str = "1.4",
    remove_metadata: bool = False,
    flatten_transparency: bool = False,
    linearize: bool = True,
    force_recompress: bool = False,
) -> dict[str, Any]:
    try:
        result = _run_service(
            CompressionService().compress_file(
                input_path,
                str(Path(output_path).parent),
                {
                    "type": "pdf",
                    "pdf_quality": quality,
                    "color_mode": color_mode,
                    "compatibility_level": compatibility_level,
                    "strip_metadata": remove_metadata,
                    "flatten_transparency": flatten_transparency,
                    "linearize": linearize,
                    "force_recompress": force_recompress,
                    "keep_original_if_smaller": True,
                },
            )
        )
        return _success(self, **result)
    except Exception as exc:
        return _failure(self, exc)


@celery_app.task(
    bind=True,
    name="app.workers.pdf_tasks.merge_pdfs_task",
    queue="fast",
    time_limit=60,
    soft_time_limit=55,
)
def merge_pdfs_task(
    self: Any,
    input_paths: list[str],
    output_path: str,
    add_bookmarks: bool = True,
    metadata_title: str = "",
) -> dict[str, Any]:
    try:
        output = _run_service(PDFService().merge_pdfs(input_paths, output_path, add_bookmarks, metadata_title))
        return _success(self, output_path=str(output))
    except Exception as exc:
        return _failure(self, exc)


@celery_app.task(
    bind=True,
    name="app.workers.pdf_tasks.split_pdf_task",
    queue="fast",
    time_limit=60,
    soft_time_limit=55,
)
def split_pdf_task(
    self: Any,
    input_path: str,
    output_dir: str,
    pages: str,
    naming_pattern: str = "page-{n}",
    output_format: str = "ranges",
) -> dict[str, Any]:
    try:
        outputs = _run_service(
            PDFService().split_pdf(input_path, output_dir, pages, naming_pattern, output_format)
        )
        return _success(self, output_paths=list(outputs))
    except Exception as exc:
        return _failure(self, exc)


@celery_app.task(
    bind=True,
    name="app.workers.pdf_tasks.rotate_pdf_task",
    queue="fast",
    time_limit=60,
    soft_time_limit=55,
)
def rotate_pdf_task(
    self: Any,
    input_path: str,
    output_path: str,
    angle: int,
    pages: str = "all",
) -> dict[str, Any]:
    try:
        output = _run_service(PDFService().rotate_pdf(input_path, output_path, angle, pages))
        return _success(self, output_path=str(output))
    except Exception as exc:
        return _failure(self, exc)


@celery_app.task(
    bind=True,
    name="app.workers.pdf_tasks.watermark_pdf_task",
    queue="fast",
    time_limit=120,
    soft_time_limit=110,
)
def watermark_pdf_task(
    self: Any,
    input_path: str,
    output_path: str,
    watermark_type: str = "text",
    text: str = "",
    watermark_image_path: str | None = None,
    opacity: float = 0.5,
    rotation: float = 0,
    x_percent: float = 50,
    y_percent: float = 50,
    width_percent: float = 25,
    font_size: int = 48,
    font_color: str = "#64748b",
    font_family: str = "Helvetica",
    bold: bool = True,
    italic: bool = False,
    apply_to: str = "all",
    selected_pages: str = "",
    page_range: str = "",
    current_page: int = 1,
    position_preset: str = "custom",
    tile: bool = False,
) -> dict[str, Any]:
    try:
        output = _run_service(
            PDFService().watermark_pdf(
                input_path,
                output_path,
                watermark_type,
                text,
                watermark_image_path,
                opacity,
                rotation,
                x_percent,
                y_percent,
                width_percent,
                font_size,
                font_color,
                font_family,
                bold,
                italic,
                apply_to,
                selected_pages,
                page_range,
                current_page,
                position_preset,
                tile,
            )
        )
        return _success(self, output_path=str(output))
    except Exception as exc:
        return _failure(self, exc)


@celery_app.task(
    bind=True,
    name="app.workers.pdf_tasks.extract_text_task",
    queue="fast",
    time_limit=60,
    soft_time_limit=55,
)
def extract_text_task(
    self: Any,
    input_path: str,
    output_path: str,
    layout: bool = True,
    output_format: str = "txt",
) -> dict[str, Any]:
    try:
        output = _run_service(PDFService().extract_text(input_path, output_path, layout, output_format))
        return _success(self, output_path=str(output))
    except Exception as exc:
        return _failure(self, exc)


@celery_app.task(
    bind=True,
    name="app.workers.pdf_tasks.pdf_to_docx_task",
    queue="fast",
    time_limit=120,
    soft_time_limit=110,
)
def pdf_to_docx_task(self: Any, input_path: str, output_path: str) -> dict[str, Any]:
    try:
        output = _run_service(PDFService().pdf_to_docx(input_path, output_path))
        return _success(self, output_path=str(output))
    except Exception as exc:
        return _failure(self, exc)


@celery_app.task(
    bind=True,
    name="app.workers.pdf_tasks.pdf_to_excel_task",
    queue="fast",
    time_limit=120,
    soft_time_limit=110,
)
def pdf_to_excel_task(self: Any, input_path: str, output_path: str) -> dict[str, Any]:
    try:
        output = _run_service(PDFService().pdf_to_excel(input_path, output_path))
        return _success(self, output_path=str(output))
    except Exception as exc:
        return _failure(self, exc)


@celery_app.task(
    bind=True,
    name="app.workers.pdf_tasks.pdf_to_html_task",
    queue="fast",
    time_limit=120,
    soft_time_limit=110,
)
def pdf_to_html_task(self: Any, input_path: str, output_path: str) -> dict[str, Any]:
    try:
        output = _run_service(PDFService().pdf_to_html(input_path, output_path))
        return _success(self, output_path=str(output))
    except Exception as exc:
        return _failure(self, exc)


@celery_app.task(
    bind=True,
    name="app.workers.pdf_tasks.pdf_to_images_task",
    queue="fast",
    time_limit=60,
    soft_time_limit=55,
)
def pdf_to_images_task(
    self: Any,
    input_path: str,
    output_dir: str,
    dpi: int = 150,
    format: str = "png",
    jpeg_quality: int = 82,
    transparent: bool = False,
) -> dict[str, Any]:
    try:
        outputs = _run_service(
            PDFService().pdf_to_images(input_path, output_dir, dpi, format, jpeg_quality, transparent)
        )
        return _success(self, output_paths=list(outputs))
    except Exception as exc:
        return _failure(self, exc)


@celery_app.task(
    bind=True,
    name="app.workers.pdf_tasks.images_to_pdf_task",
    queue="fast",
    time_limit=60,
    soft_time_limit=55,
)
def images_to_pdf_task(self: Any, input_paths: list[str], output_path: str) -> dict[str, Any]:
    try:
        output = _run_service(PDFService().images_to_pdf(input_paths, output_path))
        return _success(self, output_path=str(output))
    except Exception as exc:
        return _failure(self, exc)


@celery_app.task(
    bind=True,
    name="app.workers.pdf_tasks.office_to_pdf_task",
    queue="heavy",
    time_limit=300,
    soft_time_limit=290,
)
def office_to_pdf_task(self: Any, input_path: str, output_dir: str) -> dict[str, Any]:
    try:
        output = _run_service(PDFService().office_to_pdf(input_path, output_dir))
        return _success(self, output_path=str(output))
    except Exception as exc:
        return _failure(self, exc)


@celery_app.task(
    bind=True,
    name="app.workers.pdf_tasks.encrypt_pdf_task",
    queue="fast",
    time_limit=60,
    soft_time_limit=55,
)
def encrypt_pdf_task(
    self: Any,
    input_path: str,
    output_path: str,
    user_password: str,
    owner_password: str = "",
) -> dict[str, Any]:
    try:
        output = _run_service(
            PDFService().encrypt_pdf(input_path, output_path, user_password, owner_password)
        )
        return _success(self, output_path=str(output))
    except Exception as exc:
        return _failure(self, exc)


@celery_app.task(
    bind=True,
    name="app.workers.pdf_tasks.decrypt_pdf_task",
    queue="fast",
    time_limit=60,
    soft_time_limit=55,
)
def decrypt_pdf_task(
    self: Any,
    input_path: str,
    output_path: str,
    password: str,
) -> dict[str, Any]:
    try:
        output = _run_service(PDFService().decrypt_pdf(input_path, output_path, password))
        return _success(self, output_path=str(output))
    except Exception as exc:
        return _failure(self, exc)


@celery_app.task(
    bind=True,
    name="app.workers.pdf_tasks.repair_pdf_task",
    queue="fast",
    time_limit=60,
    soft_time_limit=55,
)
def repair_pdf_task(self: Any, input_path: str, output_path: str) -> dict[str, Any]:
    try:
        output = _run_service(PDFService().repair_pdf(input_path, output_path))
        return _success(self, output_path=str(output))
    except Exception as exc:
        return _failure(self, exc)


@celery_app.task(
    bind=True,
    name="app.workers.pdf_tasks.ocr_pdf_task",
    queue="heavy",
    time_limit=300,
    soft_time_limit=290,
)
def ocr_pdf_task(
    self: Any,
    input_path: str,
    output_dir: str,
    language: str = "eng",
    output_format: str = "txt",
    dpi: int = 300,
) -> dict[str, Any]:
    try:
        output = _run_service(OCRService().ocr(input_path, output_dir, language, output_format, dpi))
        return _success(self, output_path=str(output))
    except Exception as exc:
        return _failure(self, exc)
