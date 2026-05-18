from __future__ import annotations

import shutil
import tarfile
import zipfile
from pathlib import Path
from typing import Any

from fastapi import HTTPException, status

from app.services.command_runner import run_command
from app.services.file_tools_service import archive_warnings, inspect_archive, output_path, safe_extract_archive, safe_filename, zip_directory


class ArchiveService:
    async def create(self, input_paths: list[str], output_dir: str, format: str = "zip", output_filename: str = "") -> dict[str, Any]:
        fmt = format.lower()
        suffix = {"zip": ".zip", "7z": ".7z", "tar": ".tar", "tar.gz": ".tar.gz", "tar.bz2": ".tar.bz2", "tar.xz": ".tar.xz"}.get(fmt)
        if not suffix:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported archive format.")
        output = output_path(output_dir, safe_filename(output_filename or f"archive{suffix}", f"archive{suffix}"))
        paths = [Path(path) for path in input_paths]
        if fmt == "zip":
            with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
                for path in paths:
                    archive.write(path, arcname=path.name)
        elif fmt == "7z":
            await run_command(["7z", "a", str(output), *[str(path) for path in paths]], timeout_seconds=120)
        else:
            mode = {"tar": "w", "tar.gz": "w:gz", "tar.bz2": "w:bz2", "tar.xz": "w:xz"}[fmt]
            with tarfile.open(output, mode) as archive:
                for path in paths:
                    archive.add(path, arcname=path.name)
        return {"output_path": str(output), "output_filename": output.name, "media_type": "application/octet-stream", "extension": output.suffix.lstrip(".")}

    async def extract(self, input_path: str, output_dir: str, password: str | None = None) -> dict[str, Any]:
        extract_dir = Path(output_dir) / "extracted"
        await safe_extract_archive(input_path, extract_dir, password)
        output = output_path(output_dir, "extracted-files.zip")
        zip_directory(extract_dir, output)
        return {"output_path": str(output), "output_filename": output.name, "media_type": "application/zip", "extension": "zip"}

    async def inspect(self, input_path: str) -> dict[str, Any]:
        archive_format, entries = await inspect_archive(input_path)
        total_size = sum(int(entry.get("size") or 0) for entry in entries)
        return {
            "format": archive_format,
            "total_files": len([entry for entry in entries if not entry.get("is_dir")]),
            "total_size_bytes": total_size,
            "compressed_size_bytes": Path(input_path).stat().st_size,
            "entries": [{key: entry.get(key) for key in ("name", "size", "compressed", "modified")} for entry in entries],
        }

    async def safety(self, input_path: str) -> dict[str, Any]:
        _archive_format, entries = await inspect_archive(input_path)
        compressed_size = Path(input_path).stat().st_size
        warnings = archive_warnings(entries, compressed_size)
        estimated = sum(int(entry.get("size") or 0) for entry in entries)
        return {
            "safe": not warnings,
            "warnings": warnings,
            "member_count": len(entries),
            "estimated_extracted_bytes": estimated,
            "compression_ratio": round((estimated / compressed_size) if compressed_size else 0, 2),
        }
