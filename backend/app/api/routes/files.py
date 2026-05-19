from typing import Annotated, Any

from fastapi import APIRouter, Depends, File, Form, UploadFile
from fastapi.responses import FileResponse

from app.core.config import Settings
from app.core.dependencies import (
    get_app_settings,
    validate_optional_upload,
    validate_upload_batch,
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

AppSettings = Annotated[Settings, Depends(get_app_settings)]
FILE_TOOLS_UPLOAD_SCOPE = "file-tools"
FILE_TOOLS_LIMIT_LABEL = "Maximum size for File Tools"


def _upload_limit(settings: Settings, scope: str) -> tuple[int | None, str]:
    if scope == FILE_TOOLS_UPLOAD_SCOPE:
        return settings.FILE_TOOLS_MAX_FILE_SIZE_MB, FILE_TOOLS_LIMIT_LABEL
    return None, "Maximum size"


@router.post("/upload")
async def upload_file(
    settings: AppSettings,
    file: Annotated[UploadFile, File()],
    scope: Annotated[str, Form()] = "",
) -> dict[str, Any]:
    max_size_mb, limit_label = _upload_limit(settings, scope)
    validate_optional_upload(file, settings, max_size_mb=max_size_mb, limit_label=limit_label)
    return await save_upload_file(file, settings, max_size_mb=max_size_mb, limit_label=limit_label)


@router.post("/upload-multiple")
async def upload_multiple(
    settings: AppSettings,
    files: Annotated[list[UploadFile], File()],
    scope: Annotated[str, Form()] = "",
) -> dict[str, Any]:
    max_size_mb, limit_label = _upload_limit(settings, scope)
    validate_upload_batch(files, settings, max_size_mb=max_size_mb, limit_label=limit_label)
    return {"files": await save_upload_files(files, settings, max_size_mb=max_size_mb, limit_label=limit_label)}


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
