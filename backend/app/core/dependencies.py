from typing import Annotated

from fastapi import Depends, File, HTTPException, UploadFile, status

from app.core.config import Settings, get_settings


async def get_app_settings() -> Settings:
    return get_settings()


def _upload_file_size(file: UploadFile) -> int:
    try:
        file.file.seek(0, 2)
        file_size = file.file.tell()
        file.file.seek(0)
    except OSError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not read uploaded file size",
        ) from exc

    return file_size


def _validate_size(file: UploadFile, settings: Settings) -> None:
    max_size_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    file_size = _upload_file_size(file)

    if file_size > max_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum size of {settings.MAX_FILE_SIZE_MB} MB",
        )


async def validate_upload_file_size(
    file: Annotated[UploadFile, File(...)],
    settings: Annotated[Settings, Depends(get_app_settings)],
) -> UploadFile:
    _validate_size(file, settings)
    return file


async def validate_upload_files_size(
    files: Annotated[list[UploadFile], File(...)],
    settings: Annotated[Settings, Depends(get_app_settings)],
) -> list[UploadFile]:
    for file in files:
        _validate_size(file, settings)

    return files
