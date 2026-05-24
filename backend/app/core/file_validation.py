from __future__ import annotations

from pathlib import Path

from fastapi import HTTPException

from app.core.audit_log import log_audit_event

ALLOWED_MIME_TYPES = {
    "pdf": ["application/pdf"],
    "image": [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "image/tiff",
        "image/bmp",
    ],
    "office": [
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/zip",
        "application/x-zip-compressed",
        "application/octet-stream",
        "application/vnd.ms-office",
        "application/x-ole-storage",
        "application/vnd.oasis.opendocument.text",
        "application/vnd.oasis.opendocument.spreadsheet",
        "application/vnd.oasis.opendocument.presentation",
        "application/rtf",
    ],
    "text": [
        "text/plain",
        "text/csv",
        "application/json",
        "text/html",
        "text/xml",
        "application/xml",
        "image/svg+xml",
    ],
    "archive": [
        "application/zip",
        "application/x-tar",
        "application/gzip",
        "application/x-gzip",
        "application/x-7z-compressed",
        "application/x-rar-compressed",
    ],
}

CATEGORY_BY_EXTENSION = {
    ".pdf": "pdf",
    ".jpg": "image",
    ".jpeg": "image",
    ".png": "image",
    ".gif": "image",
    ".webp": "image",
    ".tif": "image",
    ".tiff": "image",
    ".bmp": "image",
    ".doc": "office",
    ".docx": "office",
    ".xls": "office",
    ".xlsx": "office",
    ".ppt": "office",
    ".pptx": "office",
    ".odt": "office",
    ".ods": "office",
    ".odp": "office",
    ".rtf": "office",
    ".txt": "text",
    ".csv": "text",
    ".json": "text",
    ".html": "text",
    ".htm": "text",
    ".xml": "text",
    ".svg": "text",
    ".zip": "archive",
    ".tar": "archive",
    ".gz": "archive",
    ".7z": "archive",
    ".rar": "archive",
}


def expected_category_for_filename(filename: str) -> str | None:
    return CATEGORY_BY_EXTENSION.get(Path(filename or "").suffix.lower())


def validate_file_magic(
    file_bytes: bytes,
    expected_category: str,
    filename: str = "",
    ip_address: str | None = None,
) -> str:
    try:
        import magic

        detected_mime = magic.from_buffer(file_bytes[:8192], mime=True)
    except Exception as exc:
        log_audit_event(
            "invalid_file_type",
            file_name=filename,
            ip_address=ip_address,
            extra={"detected_mime": "unknown"},
        )
        raise HTTPException(status_code=400, detail="Could not determine file type.") from exc

    if expected_category == "office" and detected_mime in {"application/zip", "application/x-zip-compressed", "application/octet-stream"}:
        office_extensions = {".docx", ".xlsx", ".pptx", ".odt", ".ods", ".odp", ".doc", ".xls", ".ppt"}
        file_ext = Path(filename).suffix.lower()
        if file_ext in office_extensions:
            return detected_mime
        log_audit_event(
            "invalid_file_type",
            file_name=filename,
            ip_address=ip_address,
            extra={"detected_mime": detected_mime, "expected_category": expected_category},
        )
        raise HTTPException(
            status_code=400,
            detail="File appears to be a ZIP archive, not an office document.",
        )

    allowed = ALLOWED_MIME_TYPES.get(expected_category, [])
    is_allowed = any(detected_mime == mime or detected_mime.startswith(mime) for mime in allowed)

    if not is_allowed:
        log_audit_event(
            "invalid_file_type",
            file_name=filename,
            ip_address=ip_address,
            extra={"detected_mime": detected_mime, "expected_category": expected_category},
        )
        raise HTTPException(
            status_code=400,
            detail=(
                f"File '{Path(filename).name}' appears to be '{detected_mime}' which is not allowed. "
                f"Expected: {expected_category} file."
            ),
        )

    return detected_mime
