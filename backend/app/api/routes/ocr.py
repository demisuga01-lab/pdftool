from pathlib import Path
from typing import Annotated
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from app.core.config import Settings
from app.core.dependencies import (
    get_app_settings,
    save_temp_upload,
    validate_saved_upload_path,
    validate_upload_file_size,
)
from app.core.job_security import create_job_access
from app.services.file_store import resolve_upload_path
from app.workers.image_tasks import ocr_image_task

router = APIRouter()

ValidatedUpload = Annotated[UploadFile, Depends(validate_upload_file_size)]
AppSettings = Annotated[Settings, Depends(get_app_settings)]


def _new_job(settings: Settings) -> tuple[str, str]:
    job_id = uuid4().hex
    return job_id, create_job_access(job_id, settings)


def _output_dir(settings: Settings, job_id: str) -> Path:
    output_dir = settings.OUTPUT_DIR / job_id
    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir


async def _input_path(settings: Settings, file: UploadFile | None, file_id: str | None) -> Path:
    if file_id:
        path = resolve_upload_path(file_id, settings)
        validate_saved_upload_path(path, settings)
        return path
    if file is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide either file_id or file",
        )
    return await save_temp_upload(file, settings)


@router.post("")
@router.post("/")
async def ocr(
    settings: AppSettings,
    file: Annotated[UploadFile | None, File()] = None,
    file_id: Annotated[str | None, Form()] = None,
    language: Annotated[str, Form()] = "eng",
    output_format: Annotated[str, Form()] = "txt",
    dpi: Annotated[int, Form(ge=72, le=300)] = 300,
    password: Annotated[str, Form()] = "",
    output_filename: Annotated[str, Form()] = "",
) -> dict[str, str]:
    input_path = await _input_path(settings, file, file_id)
    job_id, access_token = _new_job(settings)
    output_dir = _output_dir(settings, job_id)
    task = ocr_image_task.apply_async(
        args=[str(input_path), str(output_dir), language, output_format, "auto", "all", False, False, False, dpi, password or None, output_filename or None],
        queue="heavy",
        task_id=job_id,
    )
    return {"job_id": str(task.id), "access_token": access_token, "status": "queued", "message": "OCR queued"}
