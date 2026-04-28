import asyncio
import json
import mimetypes
import re
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from uuid import uuid4

import aiofiles
from fastapi import HTTPException, UploadFile, status

from app.core.config import Settings

SAFE_FILE_ID_RE = re.compile(r"^[a-fA-F0-9]{32}$")
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff", ".avif", ".bmp", ".gif", ".svg"}
BROWSER_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".svg", ".avif"}


def _safe_original_name(filename: str | None) -> str:
    name = Path(filename or "upload").name.strip()
    return name or "upload"


def _safe_suffix(filename: str | None) -> str:
    suffix = Path(filename or "").suffix.lower()
    if not suffix or not re.fullmatch(r"\.[a-z0-9]+", suffix):
        return ".bin"
    return suffix


def _metadata_path(settings: Settings, file_id: str) -> Path:
    return settings.UPLOAD_DIR / f"{file_id}.json"


def _legacy_metadata_path(file_path: Path) -> Path:
    return file_path.with_suffix(f"{file_path.suffix}.json")


def _ensure_inside(child: Path, root: Path, *, label: str) -> Path:
    resolved_child = child.resolve(strict=False)
    resolved_root = root.resolve(strict=False)
    if not resolved_child.is_relative_to(resolved_root):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"{label} is outside the configured storage directory",
        )
    return resolved_child


def _validate_file_id(file_id: str) -> None:
    if not SAFE_FILE_ID_RE.fullmatch(file_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file_id",
        )


async def _run_command(command: list[str]) -> tuple[str, str]:
    try:
        process = await asyncio.create_subprocess_exec(
            *command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await process.communicate()
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Required command not found: {command[0]}",
        ) from exc
    except OSError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to run command: {command[0]}",
        ) from exc

    stdout_text = stdout.decode("utf-8", errors="replace").strip()
    stderr_text = stderr.decode("utf-8", errors="replace").strip()
    if process.returncode != 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=stderr_text or stdout_text or f"{command[0]} exited with code {process.returncode}",
        )
    return stdout_text, stderr_text


async def _pdf_page_count(file_path: Path) -> int:
    stdout, _ = await _run_command(["qpdf", "--show-npages", str(file_path)])
    try:
        return int(stdout.strip() or 0)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to read PDF page count",
        ) from exc


async def _image_metadata(file_path: Path) -> dict[str, Any]:
    if file_path.suffix.lower() == ".svg":
        return {}

    def read() -> dict[str, Any]:
        import pyvips

        image = pyvips.Image.new_from_file(str(file_path), access="sequential")
        return {
            "width": image.width,
            "height": image.height,
            "bands": image.bands,
            "format": image.get("vips-loader") if image.get_typeof("vips-loader") else file_path.suffix.lstrip("."),
        }

    try:
        return await asyncio.to_thread(read)
    except Exception:
        return {}


def metadata_response(metadata: dict[str, Any]) -> dict[str, Any]:
    file_id = str(metadata["file_id"])
    extension = str(metadata.get("extension") or "").lower().lstrip(".")
    fallback_filename = f"{file_id}.{extension}" if extension else file_id
    response = {
        "file_id": file_id,
        "filename": metadata.get("filename") or fallback_filename,
        "original_name": metadata.get("original_name") or metadata.get("filename") or "upload",
        "mime_type": metadata.get("mime_type") or "application/octet-stream",
        "size_bytes": metadata.get("size_bytes") or metadata.get("size") or 0,
        "extension": extension,
        "preview_url": f"/api/files/preview/{file_id}",
        "thumbnail_url": f"/api/files/thumbnail/{file_id}",
        "metadata": metadata.get("metadata") or {},
    }
    # Compatibility for existing frontend code that still reads pages/size.
    response["pages"] = response["metadata"].get("page_count", metadata.get("pages", 0))
    response["size"] = response["size_bytes"]
    return response


async def save_upload_file(file: UploadFile, settings: Settings) -> dict[str, Any]:
    settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    file_id = uuid4().hex
    suffix = _safe_suffix(file.filename)
    filename = f"{file_id}{suffix}"
    destination = _ensure_inside(settings.UPLOAD_DIR / filename, settings.UPLOAD_DIR, label="Upload path")
    original_name = _safe_original_name(file.filename)

    await file.seek(0)
    async with aiofiles.open(destination, "wb") as output_file:
        while chunk := await file.read(1024 * 1024):
            await output_file.write(chunk)
    await file.close()

    size_bytes = destination.stat().st_size
    mime_type = file.content_type or mimetypes.guess_type(original_name)[0] or "application/octet-stream"
    extension = suffix.lstrip(".")
    extra: dict[str, Any] = {}

    if suffix == ".pdf":
        try:
            extra["page_count"] = await _pdf_page_count(destination)
        except HTTPException:
            extra["page_count"] = 0
    elif suffix in IMAGE_EXTENSIONS:
        extra.update(await _image_metadata(destination))

    metadata = {
        "file_id": file_id,
        "filename": filename,
        "original_name": original_name,
        "mime_type": mime_type,
        "size_bytes": size_bytes,
        "extension": extension,
        "path": str(destination),
        "metadata": extra,
        "created_at": datetime.now(UTC).isoformat(),
    }
    await asyncio.to_thread(_metadata_path(settings, file_id).write_text, json.dumps(metadata, indent=2), "utf-8")
    return metadata_response(metadata)


async def save_upload_files(files: list[UploadFile], settings: Settings) -> list[dict[str, Any]]:
    return [await save_upload_file(file, settings) for file in files]


def resolve_upload_path(file_id: str, settings: Settings) -> Path:
    _validate_file_id(file_id)
    settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    upload_root = settings.UPLOAD_DIR.resolve(strict=False)

    meta_path = _metadata_path(settings, file_id)
    if meta_path.exists():
        try:
            metadata = json.loads(meta_path.read_text(encoding="utf-8"))
            stored_path = Path(str(metadata.get("path") or ""))
            candidate = _ensure_inside(stored_path, upload_root, label="Upload path")
            if candidate.exists() and candidate.is_file():
                return candidate
        except json.JSONDecodeError:
            pass

    matches = [path for path in settings.UPLOAD_DIR.glob(f"{file_id}.*") if path.suffix != ".json" and path.is_file()]
    if matches:
        return _ensure_inside(matches[0], upload_root, label="Upload path")

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Uploaded file not found. It may have expired.",
    )


def read_upload_metadata(file_id: str, settings: Settings) -> dict[str, Any]:
    file_path = resolve_upload_path(file_id, settings)
    meta_path = _metadata_path(settings, file_id)
    if not meta_path.exists():
        legacy_path = _legacy_metadata_path(file_path)
        meta_path = legacy_path if legacy_path.exists() else meta_path

    if meta_path.exists():
        try:
            metadata = json.loads(meta_path.read_text(encoding="utf-8"))
            metadata.setdefault("file_id", file_id)
            metadata.setdefault("filename", file_path.name)
            metadata.setdefault("original_name", metadata.get("filename", file_path.name))
            metadata.setdefault("size_bytes", file_path.stat().st_size)
            metadata.setdefault("extension", file_path.suffix.lower().lstrip("."))
            metadata.setdefault("mime_type", mimetypes.guess_type(file_path.name)[0] or "application/octet-stream")
            metadata.setdefault("metadata", {})
            return metadata_response(metadata)
        except json.JSONDecodeError:
            pass

    return metadata_response(
        {
            "file_id": file_id,
            "filename": file_path.name,
            "original_name": file_path.name,
            "mime_type": mimetypes.guess_type(file_path.name)[0] or "application/octet-stream",
            "size_bytes": file_path.stat().st_size,
            "extension": file_path.suffix.lower().lstrip("."),
            "path": str(file_path),
            "metadata": {},
        }
    )


async def pdf_info(file_id: str, settings: Settings) -> dict[str, Any]:
    file_path = resolve_upload_path(file_id, settings)
    if file_path.suffix.lower() != ".pdf":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="file_id does not reference a PDF")
    metadata = read_upload_metadata(file_id, settings)
    page_count = int(metadata.get("metadata", {}).get("page_count") or 0)
    if page_count <= 0:
        page_count = await _pdf_page_count(file_path)
    return {
        "file_id": file_id,
        "page_count": page_count,
        "pages": page_count,
        "size_bytes": file_path.stat().st_size,
        "original_name": metadata.get("original_name"),
        "extension": "pdf",
    }


def preview_cache_path(settings: Settings, file_id: str, name: str) -> Path:
    _validate_file_id(file_id)
    cache_dir = settings.TEMP_DIR / "previews" / file_id
    cache_dir.mkdir(parents=True, exist_ok=True)
    return _ensure_inside(cache_dir / name, settings.TEMP_DIR, label="Preview path")


async def render_pdf_page(file_id: str, page_number: int, settings: Settings, zoom: int = 100) -> Path:
    file_path = resolve_upload_path(file_id, settings)
    if file_path.suffix.lower() != ".pdf":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="file_id does not reference a PDF")

    info = await pdf_info(file_id, settings)
    page_count = int(info["page_count"])
    if page_number < 1 or page_number > page_count:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"page_number must be between 1 and {page_count}",
        )

    safe_zoom = max(25, min(int(zoom or 100), 500))
    dpi = max(72, min(round(180 * safe_zoom / 100), 900))
    output = preview_cache_path(settings, file_id, f"page-{page_number}-z{safe_zoom}.png")
    if output.exists() and output.stat().st_size > 0:
        return output

    await _run_command(
        [
            "mutool",
            "draw",
            "-r",
            str(dpi),
            "-F",
            "png",
            "-o",
            str(output),
            str(file_path),
            str(page_number),
        ]
    )
    return output


async def thumbnail_path(file_id: str, settings: Settings) -> Path:
    file_path = resolve_upload_path(file_id, settings)
    suffix = file_path.suffix.lower()
    output = preview_cache_path(settings, file_id, "thumbnail.png")
    if output.exists() and output.stat().st_size > 0:
        return output

    if suffix == ".pdf":
        await _run_command(
            [
                "mutool",
                "draw",
                "-r",
                "120",
                "-F",
                "png",
                "-o",
                str(output),
                str(file_path),
                "1",
            ]
        )
        return output

    if suffix in IMAGE_EXTENSIONS:
        def render() -> None:
            import pyvips

            image = pyvips.Image.thumbnail(str(file_path), 480, height=480, crop="none", auto_rotate=True)
            image.pngsave(str(output), compression=6, strip=True)

        try:
            await asyncio.to_thread(render)
            return output
        except Exception:
            await _run_command(["magick", str(file_path), "-thumbnail", "480x480", str(output)])
            return output

    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Thumbnail is not available for this file type")


async def browser_safe_preview_path(file_id: str, settings: Settings) -> tuple[Path, str | None]:
    file_path = resolve_upload_path(file_id, settings)
    suffix = file_path.suffix.lower()
    if suffix in BROWSER_IMAGE_EXTENSIONS or suffix == ".pdf":
        return file_path, mimetypes.guess_type(file_path.name)[0]
    if suffix in IMAGE_EXTENSIONS:
        output = preview_cache_path(settings, file_id, "preview.png")
        if not output.exists() or output.stat().st_size == 0:
            def render() -> None:
                import pyvips

                image = pyvips.Image.thumbnail(str(file_path), 2400, height=2400, crop="none", auto_rotate=True)
                image.pngsave(str(output), compression=6, strip=True)

            try:
                await asyncio.to_thread(render)
            except Exception:
                await _run_command(["magick", str(file_path), str(output)])
        return output, "image/png"

    return file_path, mimetypes.guess_type(file_path.name)[0]
