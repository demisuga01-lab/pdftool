from typing import Annotated, Any

from fastapi import APIRouter, Depends, UploadFile
from fastapi.responses import FileResponse

from app.core.config import Settings
from app.core.dependencies import (
    get_app_settings,
    validate_upload_file_size,
    validate_upload_files_size,
)
from app.services.file_store import (
    browser_safe_preview_path,
    pdf_info,
    read_upload_metadata,
    render_pdf_page,
    save_upload_file,
    save_upload_files,
    thumbnail_path,
)

router = APIRouter()

ValidatedUpload = Annotated[UploadFile, Depends(validate_upload_file_size)]
ValidatedUploads = Annotated[list[UploadFile], Depends(validate_upload_files_size)]
AppSettings = Annotated[Settings, Depends(get_app_settings)]


@router.post("/upload")
async def upload_file(file: ValidatedUpload, settings: AppSettings) -> dict[str, Any]:
    return await save_upload_file(file, settings)


@router.post("/upload-multiple")
async def upload_multiple(files: ValidatedUploads, settings: AppSettings) -> dict[str, Any]:
    return {"files": await save_upload_files(files, settings)}


@router.get("/preview/{file_id}")
async def preview_file(file_id: str, settings: AppSettings) -> FileResponse:
    file_path, media_type = await browser_safe_preview_path(file_id, settings)
    return FileResponse(path=file_path, media_type=media_type)


@router.get("/thumbnail/{file_id}")
async def thumbnail_file(file_id: str, settings: AppSettings) -> FileResponse:
    file_path = await thumbnail_path(file_id, settings)
    return FileResponse(path=file_path, media_type="image/png")


@router.get("/pdf-page/{file_id}/{page_number}")
async def pdf_page(file_id: str, page_number: int, settings: AppSettings, zoom: int = 100) -> FileResponse:
    file_path = await render_pdf_page(file_id, page_number, settings, zoom=zoom)
    return FileResponse(path=file_path, media_type="image/png")


@router.get("/pdf-info/{file_id}")
async def get_pdf_info(file_id: str, settings: AppSettings) -> dict[str, Any]:
    return await pdf_info(file_id, settings)


@router.get("/{file_id}")
async def get_uploaded_file_metadata(file_id: str, settings: AppSettings) -> dict[str, Any]:
    return read_upload_metadata(file_id, settings)
