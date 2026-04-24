import asyncio
from typing import Any, Awaitable

from fastapi import HTTPException

from app.services.pdf_service import PDFService
from app.workers.celery_app import celery_app


def _task_id(task: Any) -> str:
    return str(task.request.id)


def _success(task: Any, **result: str | list[str]) -> dict[str, Any]:
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
        "error": error,
    }


def _run_service(coro: Awaitable[str | list[str]]) -> str | list[str]:
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
) -> dict[str, Any]:
    try:
        output = _run_service(PDFService().compress_pdf(input_path, output_path, quality))
        return _success(self, output_path=str(output))
    except Exception as exc:
        return _failure(self, exc)


@celery_app.task(
    bind=True,
    name="app.workers.pdf_tasks.merge_pdfs_task",
    queue="fast",
    time_limit=60,
    soft_time_limit=55,
)
def merge_pdfs_task(self: Any, input_paths: list[str], output_path: str) -> dict[str, Any]:
    try:
        output = _run_service(PDFService().merge_pdfs(input_paths, output_path))
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
def split_pdf_task(self: Any, input_path: str, output_dir: str, pages: str) -> dict[str, Any]:
    try:
        outputs = _run_service(PDFService().split_pdf(input_path, output_dir, pages))
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
) -> dict[str, Any]:
    try:
        output = _run_service(PDFService().extract_text(input_path, output_path, layout))
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
) -> dict[str, Any]:
    try:
        outputs = _run_service(PDFService().pdf_to_images(input_path, output_dir, dpi, format))
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
