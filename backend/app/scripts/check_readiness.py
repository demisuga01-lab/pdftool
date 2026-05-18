"""Operator readiness checks for a PDFTools backend deployment."""

from __future__ import annotations

import importlib
import os
import shutil
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import TYPE_CHECKING, Iterable
from urllib.parse import urlsplit, urlunsplit

BACKEND_DIR = Path(__file__).resolve().parents[2]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

if TYPE_CHECKING:
    from app.core.config import Settings


@dataclass
class Check:
    name: str
    status: str
    detail: str
    critical: bool = False


CRITICAL_TOOLS = [
    "file",
    "exiftool",
    "zip",
    "unzip",
    "7z",
    "tar",
    "gzip",
    "sha256sum",
    "md5sum",
    "diff",
    "cmp",
    "qpdf",
    "mutool",
    "pdftotext",
    "gs",
    "libreoffice",
    "tesseract",
    "inkscape",
]

OPTIONAL_TOOLS = [
    "sha1sum",
    "sha512sum",
    "b2sum",
    "bzip2",
    "xz",
    "xmllint",
    "rsync",
    "pngquant",
    "oxipng",
    "optipng",
    "jpegoptim",
    "cwebp",
    "avifenc",
    "gifsicle",
    "brotli",
    "ocrmypdf",
    "advzip",
]

IMPORT_CHECKS = [
    ("app.main", "FastAPI app import"),
    ("app.workers.celery_app", "Celery app import"),
    ("app.services.pdf_service", "PDF service import"),
    ("app.services.image_service", "Image service import"),
    ("app.services.compression_service", "Compression service import"),
    ("app.services.ocr_service", "OCR service import"),
    ("app.services.file_store", "File store import"),
    ("magic", "python-magic import"),
]

OPTIONAL_IMPORT_CHECKS = [
    ("rarfile", "rarfile import"),
    ("chardet", "chardet import"),
]


def mask_url(value: str) -> str:
    try:
        parsed = urlsplit(value)
    except ValueError:
        return "[invalid url]"

    if not parsed.password:
        return value

    username = parsed.username or ""
    host = parsed.hostname or ""
    port = f":{parsed.port}" if parsed.port else ""
    auth = f"{username}:****@" if username else "****@"
    return urlunsplit((parsed.scheme, f"{auth}{host}{port}", parsed.path, parsed.query, parsed.fragment))


def check_redis(settings: Settings) -> Check:
    try:
        import redis

        client = redis.Redis.from_url(settings.REDIS_URL, socket_connect_timeout=2, socket_timeout=2)
        client.ping()
        return Check("Redis connectivity", "OK", f"Connected to {mask_url(settings.REDIS_URL)}", critical=True)
    except Exception as exc:
        return Check("Redis connectivity", "FAIL", f"Could not connect to {mask_url(settings.REDIS_URL)}: {exc}", critical=True)


def check_directory(label: str, path: Path) -> Check:
    if not path.exists():
        return Check(label, "FAIL", f"{path} does not exist", critical=True)
    if not path.is_dir():
        return Check(label, "FAIL", f"{path} is not a directory", critical=True)

    try:
        with tempfile.NamedTemporaryFile(prefix=".readiness-", dir=path, delete=True) as handle:
            handle.write(b"ok")
            handle.flush()
        return Check(label, "OK", f"{path} exists and is writable", critical=True)
    except Exception as exc:
        return Check(label, "FAIL", f"{path} is not writable: {exc}", critical=True)


def check_tool(name: str, *, critical: bool) -> Check:
    resolved = shutil.which(name)
    if resolved:
        return Check(f"CLI: {name}", "OK", resolved, critical=critical)
    return Check(f"CLI: {name}", "MISSING" if critical else "WARNING", "Not found on PATH", critical=critical)


def check_imagemagick() -> Check:
    for name in ("magick", "convert"):
        resolved = shutil.which(name)
        if resolved:
            return Check("CLI: magick/convert", "OK", f"{name}: {resolved}", critical=True)
    return Check("CLI: magick/convert", "MISSING", "Neither magick nor convert was found on PATH", critical=True)


def check_import(module_name: str, label: str, *, critical: bool = True) -> Check:
    try:
        importlib.import_module(module_name)
        return Check(label, "OK", module_name, critical=critical)
    except Exception as exc:
        return Check(label, "FAIL" if critical else "WARNING", f"{module_name}: {exc}", critical=critical)


def positive_int_check(name: str, value: int) -> Check:
    if isinstance(value, int) and value > 0:
        return Check(f"Config: {name}", "OK", str(value), critical=True)
    return Check(f"Config: {name}", "FAIL", f"Expected a positive integer, got {value!r}", critical=True)


def config_checks(settings: Settings) -> list[Check]:
    checks = [
        positive_int_check("MAX_FILE_SIZE_MB", settings.MAX_FILE_SIZE_MB),
        positive_int_check("MAX_BATCH_BYTES", settings.MAX_BATCH_BYTES),
        positive_int_check("MAX_ARCHIVE_EXTRACTED_BYTES", settings.MAX_ARCHIVE_EXTRACTED_BYTES),
        positive_int_check("MAX_ARCHIVE_FILES", settings.MAX_ARCHIVE_FILES),
        positive_int_check("FILE_RETENTION_HOURS", settings.FILE_RETENTION_HOURS),
    ]

    if "*" in settings.ALLOWED_ORIGINS:
        checks.append(Check("Config: ALLOWED_ORIGINS", "FAIL", "Wildcard origin is not allowed", critical=True))
    else:
        checks.append(Check("Config: ALLOWED_ORIGINS", "OK", f"{len(settings.ALLOWED_ORIGINS)} explicit origin(s)", critical=True))

    checks.append(
        Check(
            "Config: RATE_LIMIT_ENABLED",
            "OK" if settings.RATE_LIMIT_ENABLED else "WARNING",
            "enabled" if settings.RATE_LIMIT_ENABLED else "disabled",
            critical=False,
        )
    )
    return checks


def collect_checks(settings: Settings) -> list[Check]:
    checks: list[Check] = [check_redis(settings)]

    for label, path in [
        ("Directory: DATA_DIR", settings.DATA_DIR),
        ("Directory: UPLOAD_DIR", settings.UPLOAD_DIR),
        ("Directory: OUTPUT_DIR", settings.OUTPUT_DIR),
        ("Directory: TEMP_DIR", settings.TEMP_DIR),
    ]:
        checks.append(check_directory(label, path))

    checks.extend(check_tool(name, critical=True) for name in CRITICAL_TOOLS)
    checks.append(check_imagemagick())
    checks.extend(check_tool(name, critical=False) for name in OPTIONAL_TOOLS)
    checks.extend(check_import(module_name, label) for module_name, label in IMPORT_CHECKS)
    checks.extend(check_import(module_name, label, critical=False) for module_name, label in OPTIONAL_IMPORT_CHECKS)
    checks.extend(config_checks(settings))
    return checks


def print_table(checks: Iterable[Check]) -> None:
    rows = list(checks)
    name_width = max(len("Check"), *(len(check.name) for check in rows))
    status_width = max(len("Status"), *(len(check.status) for check in rows))
    detail_width = max(len("Detail"), *(len(check.detail) for check in rows))
    border = f"+-{'-' * name_width}-+-{'-' * status_width}-+-{'-' * detail_width}-+"
    print(border)
    print(f"| {'Check'.ljust(name_width)} | {'Status'.ljust(status_width)} | {'Detail'.ljust(detail_width)} |")
    print(border)
    for check in rows:
        print(f"| {check.name.ljust(name_width)} | {check.status.ljust(status_width)} | {check.detail.ljust(detail_width)} |")
    print(border)


def main() -> int:
    os.environ.setdefault("PYTHONUNBUFFERED", "1")
    try:
        from app.core.config import get_settings

        settings = get_settings()
    except Exception as exc:
        print_table([Check("Config load", "FAIL", str(exc), critical=True)])
        return 1

    checks = collect_checks(settings)
    print_table(checks)

    critical_failed = any(check.critical and check.status in {"FAIL", "MISSING"} for check in checks)
    return 1 if critical_failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
