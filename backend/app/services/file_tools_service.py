from __future__ import annotations

import asyncio
import csv
import json
import mimetypes
import re
import shutil
import stat
import tarfile
import zipfile
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from fastapi import HTTPException, status

from app.core.config import get_settings
from app.services.command_runner import run_command, run_command_result

SUSPICIOUS_EXTENSIONS = {
    ".exe",
    ".bat",
    ".sh",
    ".ps1",
    ".cmd",
    ".scr",
    ".vbs",
    ".js",
    ".jar",
    ".com",
    ".pif",
    ".msi",
    ".dll",
    ".sys",
}
RESERVED_WINDOWS_NAMES = {"CON", "PRN", "AUX", "NUL", *(f"COM{index}" for index in range(1, 10)), *(f"LPT{index}" for index in range(1, 10))}


def bool_value(value: Any, default: bool = False) -> bool:
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "on"}
    return bool(value)


def json_list(value: Any, default: list[str] | None = None) -> list[str]:
    fallback = list(default or [])
    if value is None:
        return fallback
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    text = str(value).strip()
    if not text:
        return fallback
    if text.startswith("["):
        try:
            parsed = json.loads(text)
        except json.JSONDecodeError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="List input must be valid JSON.") from exc
        if not isinstance(parsed, list):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="List input must be a JSON array.")
        return [str(item).strip() for item in parsed if str(item).strip()]
    return [part.strip() for part in text.split(",") if part.strip()]


def safe_filename(value: str | None, fallback: str = "output", *, max_length: int = 180) -> str:
    raw = Path(str(value or "").strip()).name
    if not raw:
        raw = fallback
    if any(char in raw for char in ('/', '\\', "\x00")) or ".." in raw:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Output filename is unsafe.")
    if any(ord(char) < 32 or ord(char) == 127 for char in raw):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Output filename contains control characters.")
    stem = Path(raw).stem or fallback
    suffix = Path(raw).suffix
    cleaned_stem = re.sub(r"[^A-Za-z0-9._ ()-]+", "-", stem).strip(" .-")
    if not cleaned_stem:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Output filename cannot be empty.")
    if cleaned_stem.upper() in RESERVED_WINDOWS_NAMES:
        cleaned_stem = f"{cleaned_stem}-file"
    filename = f"{cleaned_stem[:max_length]}{suffix}"
    if not filename.strip(". "):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Output filename cannot be empty.")
    return filename


def ensure_inside(path: Path, root: Path) -> Path:
    resolved = path.resolve(strict=False)
    root_resolved = root.resolve(strict=False)
    if not resolved.is_relative_to(root_resolved):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Path resolves outside the working directory.")
    return resolved


def output_path(output_dir: str | Path, filename: str) -> Path:
    root = Path(output_dir)
    root.mkdir(parents=True, exist_ok=True)
    return ensure_inside(root / safe_filename(filename), root)


def file_record(path: str | Path, root: str | Path | None = None) -> dict[str, Any]:
    file_path = Path(path)
    name = str(file_path.relative_to(root)) if root else file_path.name
    return {
        "filename": name.replace("\\", "/"),
        "extension": file_path.suffix.lower().lstrip("."),
        "size_bytes": file_path.stat().st_size if file_path.exists() else 0,
        "modified_date": datetime.fromtimestamp(file_path.stat().st_mtime, UTC).isoformat() if file_path.exists() else None,
    }


def write_json(path: str | Path, payload: Any) -> str:
    output = Path(path)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    return str(output)


def write_csv(path: str | Path, rows: list[dict[str, Any]], fields: list[str]) -> str:
    output = Path(path)
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)
    return str(output)


def zip_directory(input_dir: str | Path, output: str | Path) -> str:
    source_root = Path(input_dir)
    output_path = Path(output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(output_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for path in sorted(source_root.rglob("*")):
            if path.is_file():
                archive.write(path, arcname=path.relative_to(source_root))
    return str(output_path)


def zip_files(paths: list[str | Path], output: str | Path, names: list[str] | None = None) -> str:
    output_path = Path(output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    used: set[str] = set()
    with zipfile.ZipFile(output_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for index, item in enumerate(paths):
            path = Path(item)
            arcname = safe_filename(names[index] if names and index < len(names) else path.name, path.name)
            candidate = arcname
            counter = 2
            while candidate.lower() in used:
                candidate = f"{Path(arcname).stem}-{counter}{Path(arcname).suffix}"
                counter += 1
            used.add(candidate.lower())
            archive.write(path, arcname=candidate)
    return str(output_path)


def _validate_member_name(name: str) -> Path:
    if not name.strip() or "\x00" in name or "\\" in name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Archive contains an unsafe path.")
    member_path = Path(name)
    if member_path.is_absolute() or ".." in member_path.parts:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Archive contains an unsafe path.")
    return member_path


def inspect_zip(path: str | Path) -> list[dict[str, Any]]:
    with zipfile.ZipFile(path) as archive:
        entries = archive.infolist()
        if len(entries) > get_settings().MAX_ARCHIVE_FILES:
            raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Archive contains too many files.")
        return [
            {
                "name": item.filename,
                "size": int(item.file_size),
                "compressed": int(item.compress_size),
                "modified": datetime(*item.date_time, tzinfo=UTC).isoformat(),
                "is_dir": item.is_dir(),
                "is_symlink": stat.S_ISLNK(item.external_attr >> 16),
            }
            for item in entries
        ]


def inspect_tar(path: str | Path) -> list[dict[str, Any]]:
    with tarfile.open(path) as archive:
        members = archive.getmembers()
        if len(members) > get_settings().MAX_ARCHIVE_FILES:
            raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Archive contains too many files.")
        return [
            {
                "name": item.name,
                "size": int(item.size),
                "compressed": 0,
                "modified": datetime.fromtimestamp(item.mtime, UTC).isoformat() if item.mtime else None,
                "is_dir": item.isdir(),
                "is_symlink": item.issym() or item.islnk(),
            }
            for item in members
        ]


async def inspect_7z(path: str | Path) -> list[dict[str, Any]]:
    result = await run_command_result(["7z", "l", "-slt", str(path)], check=True, timeout_seconds=60)
    entries: list[dict[str, Any]] = []
    current: dict[str, Any] = {}
    for line in result.stdout.splitlines():
        if not line.strip():
            if current.get("Path"):
                entries.append(current)
            current = {}
            continue
        if " = " in line:
            key, value = line.split(" = ", 1)
            current[key] = value
    if current.get("Path"):
        entries.append(current)
    normalized = [
        {
            "name": str(entry.get("Path") or ""),
            "size": int(entry.get("Size") or 0),
            "compressed": int(entry.get("Packed Size") or 0),
            "modified": entry.get("Modified"),
            "is_dir": str(entry.get("Folder") or "-") == "+",
            "is_symlink": False,
        }
        for entry in entries
        if entry.get("Path") and str(entry.get("Path")) != str(path)
    ]
    if len(normalized) > get_settings().MAX_ARCHIVE_FILES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Archive contains too many files.")
    return normalized


async def inspect_archive(path: str | Path) -> tuple[str, list[dict[str, Any]]]:
    archive_path = Path(path)
    suffixes = "".join(archive_path.suffixes[-2:]).lower()
    suffix = archive_path.suffix.lower()
    if zipfile.is_zipfile(archive_path):
        return "zip", inspect_zip(archive_path)
    if tarfile.is_tarfile(archive_path):
        return suffixes.lstrip(".") if suffixes in {".tar.gz", ".tar.bz2", ".tar.xz"} else "tar", inspect_tar(archive_path)
    if suffix in {".7z", ".rar"}:
        return suffix.lstrip("."), await inspect_7z(archive_path)
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported archive format.")


def archive_warnings(entries: list[dict[str, Any]], compressed_size: int) -> list[dict[str, str]]:
    warnings: list[dict[str, str]] = []
    settings = get_settings()
    total_size = sum(int(entry.get("size") or 0) for entry in entries)
    if len(entries) > settings.MAX_ARCHIVE_FILES:
        warnings.append({"type": "member_count", "detail": "Archive contains too many entries."})
    if total_size > settings.MAX_ARCHIVE_EXTRACTED_BYTES:
        warnings.append({"type": "extracted_size", "detail": "Archive expands beyond the configured safety limit."})
    ratio = (total_size / compressed_size) if compressed_size else 0
    if ratio > 100:
        warnings.append({"type": "compression_ratio", "detail": "Archive has a very high compression ratio."})
    for entry in entries:
        name = str(entry.get("name") or "")
        try:
            _validate_member_name(name)
        except HTTPException:
            warnings.append({"type": "path_traversal", "detail": name})
        suffixes = [suffix.lower() for suffix in Path(name).suffixes]
        if suffixes and suffixes[-1] in SUSPICIOUS_EXTENSIONS:
            warnings.append({"type": "suspicious_extension", "detail": name})
        if len(suffixes) >= 2 and suffixes[-1] in SUSPICIOUS_EXTENSIONS:
            warnings.append({"type": "double_extension", "detail": name})
        if entry.get("is_symlink"):
            warnings.append({"type": "symlink", "detail": name})
    return warnings


def safe_extract_zip(path: str | Path, output_dir: str | Path) -> list[Path]:
    archive_path = Path(path)
    root = Path(output_dir)
    root.mkdir(parents=True, exist_ok=True)
    root_resolved = root.resolve(strict=False)
    settings = get_settings()
    extracted: list[Path] = []
    total = 0
    with zipfile.ZipFile(archive_path) as archive:
        members = archive.infolist()
        if len(members) > settings.MAX_ARCHIVE_FILES:
            raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Archive contains too many files.")
        for member in members:
            relative = _validate_member_name(member.filename)
            if stat.S_ISLNK(member.external_attr >> 16):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Archive contains an unsafe path.")
            destination = ensure_inside(root / relative, root_resolved)
            if member.is_dir():
                destination.mkdir(parents=True, exist_ok=True)
                continue
            destination.parent.mkdir(parents=True, exist_ok=True)
            with archive.open(member) as source, destination.open("wb") as target:
                while chunk := source.read(1024 * 1024):
                    total += len(chunk)
                    if total > settings.MAX_ARCHIVE_EXTRACTED_BYTES:
                        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Archive is too large to process safely.")
                    target.write(chunk)
            extracted.append(destination)
    return extracted


def safe_extract_tar(path: str | Path, output_dir: str | Path) -> list[Path]:
    archive_path = Path(path)
    root = Path(output_dir)
    root.mkdir(parents=True, exist_ok=True)
    root_resolved = root.resolve(strict=False)
    settings = get_settings()
    extracted: list[Path] = []
    total = 0
    with tarfile.open(archive_path) as archive:
        members = archive.getmembers()
        if len(members) > settings.MAX_ARCHIVE_FILES:
            raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Archive contains too many files.")
        for member in members:
            relative = _validate_member_name(member.name)
            if member.issym() or member.islnk():
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Archive contains an unsafe path.")
            destination = ensure_inside(root / relative, root_resolved)
            if member.isdir():
                destination.mkdir(parents=True, exist_ok=True)
                continue
            extracted_file = archive.extractfile(member)
            if extracted_file is None:
                continue
            destination.parent.mkdir(parents=True, exist_ok=True)
            with extracted_file, destination.open("wb") as target:
                while chunk := extracted_file.read(1024 * 1024):
                    total += len(chunk)
                    if total > settings.MAX_ARCHIVE_EXTRACTED_BYTES:
                        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Archive is too large to process safely.")
                    target.write(chunk)
            extracted.append(destination)
    return extracted


async def safe_extract_archive(path: str | Path, output_dir: str | Path, password: str | None = None) -> list[Path]:
    archive_path = Path(path)
    if zipfile.is_zipfile(archive_path):
        return safe_extract_zip(archive_path, output_dir)
    if tarfile.is_tarfile(archive_path):
        return safe_extract_tar(archive_path, output_dir)
    if archive_path.suffix.lower() in {".7z", ".rar"}:
        output = Path(output_dir)
        output.mkdir(parents=True, exist_ok=True)
        command = ["7z", "x", "-y", f"-o{output}", str(archive_path)]
        if password:
            command.insert(2, f"-p{password}")
        await run_command(command, timeout_seconds=120, timeout_detail="Archive extraction took too long to finish.")
        files = [path for path in output.rglob("*") if path.is_file()]
        settings = get_settings()
        if len(files) > settings.MAX_ARCHIVE_FILES or sum(path.stat().st_size for path in files) > settings.MAX_ARCHIVE_EXTRACTED_BYTES:
            shutil.rmtree(output, ignore_errors=True)
            raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Archive is too large to process safely.")
        for item in files:
            ensure_inside(item, output)
        return files
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported archive format.")


async def collect_files(input_paths: list[str | Path], work_dir: str | Path) -> list[Path]:
    paths = [Path(path) for path in input_paths]
    if len(paths) == 1 and (zipfile.is_zipfile(paths[0]) or tarfile.is_tarfile(paths[0]) or paths[0].suffix.lower() in {".7z", ".rar"}):
        return await safe_extract_archive(paths[0], Path(work_dir) / "extracted")
    return paths


def natural_key(path: str | Path) -> list[Any]:
    return [int(part) if part.isdigit() else part.lower() for part in re.split(r"(\d+)", Path(path).name)]


class TextEncodingService:
    async def convert_encoding(
        self,
        input_path: str | Path,
        output_dir: str | Path,
        *,
        from_encoding: str = "auto-detect",
        to_encoding: str = "UTF-8",
        line_endings: str = "preserve",
        remove_bom: bool = False,
        add_bom: bool = False,
    ) -> dict[str, Any]:
        source = Path(input_path)
        raw = source.read_bytes()
        source_encoding = from_encoding
        if from_encoding.lower() in {"auto", "auto-detect", "detect"}:
            try:
                import chardet

                source_encoding = chardet.detect(raw).get("encoding") or "utf-8"
            except Exception:
                source_encoding = "utf-8"
        text = raw.decode(source_encoding, errors="replace")
        if remove_bom:
            text = text.lstrip("\ufeff")
        if line_endings in {"lf", "crlf", "cr"}:
            text = text.replace("\r\n", "\n").replace("\r", "\n")
            text = text.replace("\n", {"lf": "\n", "crlf": "\r\n", "cr": "\r"}[line_endings])
        encoding_map = {
            "utf-8": "utf-8-sig" if add_bom else "utf-8",
            "utf-16": "utf-16",
            "latin-1": "latin-1",
            "windows-1252": "cp1252",
            "ascii": "ascii",
        }
        target = encoding_map.get(to_encoding.lower(), to_encoding)
        output = output_path(output_dir, f"{source.stem}-converted{source.suffix or '.txt'}")
        output.write_bytes(text.encode(target, errors="replace"))
        return {"output_path": str(output), "output_filename": output.name, "media_type": "text/plain", "extension": output.suffix.lstrip(".")}
