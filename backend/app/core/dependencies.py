from __future__ import annotations

from pathlib import Path
from typing import Annotated, Iterable
from uuid import uuid4

import aiofiles
from fastapi import Depends, File, HTTPException, UploadFile, status

from app.core.config import Settings, get_settings


# Allowed extensions per tool family. Routes can pass a tighter set; we always
# enforce a global allowlist so executables and shell scripts cannot be
# uploaded.
GLOBAL_ALLOWED_EXTENSIONS = frozenset(
    {
        ".pdf",
        ".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp",
        ".tiff", ".tif", ".avif", ".svg",
        ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
        ".odt", ".ods", ".odp", ".rtf",
        ".txt", ".html", ".htm", ".csv", ".json",
        ".zip",
    }
)

DANGEROUS_EXTENSIONS = frozenset(
    {
        ".exe", ".bat", ".cmd", ".com", ".sh", ".bash", ".zsh", ".ps1",
        ".js", ".mjs", ".vbs", ".jar", ".war", ".dll", ".so", ".dylib",
        ".php", ".asp", ".aspx", ".jsp",
    }
)


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


def _file_extension(file: UploadFile) -> str:
    return Path(file.filename or "").suffix.lower()


def _validate_size(file: UploadFile, settings: Settings, max_size_mb: int | None = None, limit_label: str = "Maximum size") -> None:
    configured_mb = max_size_mb or settings.MAX_FILE_SIZE_MB
    max_size_bytes = configured_mb * 1024 * 1024
    file_size = _upload_file_size(file)

    if file_size <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty",
        )

    if file_size > max_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=(
                f"File is too large. {limit_label} is {configured_mb} MB."
            ),
        )


def _validate_extension(file: UploadFile) -> None:
    extension = _file_extension(file)
    if not extension:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Files must include a recognizable extension.",
        )
    if extension in DANGEROUS_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This file type is not allowed.",
        )
    if extension not in GLOBAL_ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file type for this tool.",
        )


def _validate_batch(files: Iterable[UploadFile], settings: Settings, max_size_mb: int | None = None, limit_label: str = "Maximum size") -> None:
    total = 0
    for file in files:
        _validate_size(file, settings, max_size_mb=max_size_mb, limit_label=limit_label)
        _validate_extension(file)
        total += _upload_file_size(file)
    if total > settings.MAX_BATCH_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=(
                f"Batch is too large. Total upload must stay below "
                f"{settings.MAX_BATCH_BYTES // (1024 * 1024)} MB."
            ),
        )


def _validate_saved_size(file_size: int, settings: Settings, max_size_mb: int | None = None, limit_label: str = "Maximum size") -> None:
    configured_mb = max_size_mb or settings.MAX_FILE_SIZE_MB
    if file_size <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty",
        )
    if file_size > configured_mb * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File is too large. {limit_label} is {configured_mb} MB.",
        )


async def validate_upload_file_size(
    file: Annotated[UploadFile, File(...)],
    settings: Annotated[Settings, Depends(get_app_settings)],
) -> UploadFile:
    _validate_size(file, settings)
    _validate_extension(file)
    return file


async def validate_upload_files_size(
    files: Annotated[list[UploadFile], File(...)],
    settings: Annotated[Settings, Depends(get_app_settings)],
) -> list[UploadFile]:
    _validate_batch(files, settings)
    return files


def validate_optional_upload(
    file: UploadFile | None,
    settings: Settings,
    max_size_mb: int | None = None,
    limit_label: str = "Maximum size",
) -> None:
    if file is None:
        return
    _validate_size(file, settings, max_size_mb=max_size_mb, limit_label=limit_label)
    _validate_extension(file)


def validate_upload_batch(files: Iterable[UploadFile], settings: Settings, max_size_mb: int | None = None, limit_label: str = "Maximum size") -> None:
    _validate_batch(files, settings, max_size_mb=max_size_mb, limit_label=limit_label)


def validate_saved_upload_path(path: Path, settings: Settings, max_size_mb: int | None = None, limit_label: str = "Maximum size") -> None:
    try:
        file_size = path.stat().st_size
    except OSError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Uploaded file not found. It may have expired.",
        ) from exc
    _validate_saved_size(file_size, settings, max_size_mb=max_size_mb, limit_label=limit_label)


def validate_saved_upload_paths(paths: Iterable[Path], settings: Settings, max_size_mb: int | None = None, limit_label: str = "Maximum size") -> None:
    total = 0
    for path in paths:
        try:
            file_size = path.stat().st_size
        except OSError as exc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Uploaded file not found. It may have expired.",
            ) from exc
        _validate_saved_size(file_size, settings, max_size_mb=max_size_mb, limit_label=limit_label)
        total += file_size
    if total > settings.MAX_BATCH_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=(
                f"Batch is too large. Total upload must stay below "
                f"{settings.MAX_BATCH_BYTES // (1024 * 1024)} MB."
            ),
        )


async def save_temp_upload(file: UploadFile, settings: Settings, max_size_mb: int | None = None, limit_label: str = "Maximum size") -> Path:
    validate_optional_upload(file, settings, max_size_mb=max_size_mb, limit_label=limit_label)
    settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    suffix = _file_extension(file) or ".bin"
    destination = settings.UPLOAD_DIR / f"{uuid4().hex}{suffix}"

    configured_mb = max_size_mb or settings.MAX_FILE_SIZE_MB
    max_bytes = configured_mb * 1024 * 1024
    bytes_written = 0
    await file.seek(0)
    async with aiofiles.open(destination, "wb") as output_file:
        while chunk := await file.read(1024 * 1024):
            bytes_written += len(chunk)
            if bytes_written > max_bytes:
                await output_file.close()
                destination.unlink(missing_ok=True)
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"File is too large. {limit_label} is {configured_mb} MB.",
                )
            await output_file.write(chunk)
    await file.close()
    return destination
