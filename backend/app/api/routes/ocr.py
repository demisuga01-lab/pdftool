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
from app.services.file_store import resolve_upload_path
from app.workers.image_tasks import ocr_image_task

router = APIRouter()

ValidatedUpload = Annotated[UploadFile, Depends(validate_upload_file_size)]
AppSettings = Annotated[Settings, Depends(get_app_settings)]


def _output_dir(settings: Settings) -> Path:
    output_dir = settings.OUTPUT_DIR / uuid4().hex
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
    dpi: Annotated[int, Form()] = 300,
    password: Annotated[str, Form()] = "",
    output_filename: Annotated[str, Form()] = "",
) -> dict[str, str]:
    input_path = await _input_path(settings, file, file_id)
    output_dir = _output_dir(settings)
    task = ocr_image_task.apply_async(
        args=[str(input_path), str(output_dir), language, output_format, "auto", "all", False, False, False, dpi, password or None, output_filename or None],
        queue="heavy",
    )
    return {"job_id": str(task.id), "status": "queued", "message": "OCR queued"}
