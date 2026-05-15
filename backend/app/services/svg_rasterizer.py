"""Safely rasterize untrusted SVG files to PNG before passing to PIL/ReportLab.

ReportLab's ``ImageReader`` (via PIL) cannot read SVG, and SVG itself is a
hostile input format: it can reference external URLs, embed scripts, and
include very large data URIs. We:

* Reject SVGs that look suspicious before rasterizing (external URLs,
  ``file://`` references, non-trivial scripts, oversize data URIs).
* Use Inkscape on the VPS to rasterize, with an argument list (no ``shell=True``)
  and a hard timeout.
* Cap output size and disable Inkscape's network/extension features where the
  CLI supports it.
"""

from __future__ import annotations

import logging
import re
import shutil
import subprocess
from pathlib import Path

from fastapi import HTTPException, status

logger = logging.getLogger(__name__)

# 4096 px is a generous upper bound for a watermark; anything larger is almost
# certainly a denial-of-service attempt.
MAX_RASTERIZED_DIMENSION = 4096
MAX_SVG_BYTES = 10 * 1024 * 1024  # SVG itself; the upload limit is enforced earlier.
RASTERIZE_TIMEOUT_SECONDS = 30

_SUSPICIOUS_PATTERNS = (
    re.compile(r"<\s*script", re.IGNORECASE),
    re.compile(r"\bxlink:href\s*=\s*\"\s*(?:https?:|file:|ftp:)", re.IGNORECASE),
    re.compile(r"\bhref\s*=\s*\"\s*(?:https?:|file:|ftp:)", re.IGNORECASE),
    re.compile(r"<\s*foreignObject", re.IGNORECASE),
    re.compile(r"<\s*!ENTITY", re.IGNORECASE),
)
_DATA_URI_PATTERN = re.compile(r"data:[^\"]+;base64,([A-Za-z0-9+/=]+)", re.IGNORECASE)


def _looks_suspicious(content: str) -> str | None:
    for pattern in _SUSPICIOUS_PATTERNS:
        if pattern.search(content):
            return "SVG contains a disallowed feature."

    # Reject oversize embedded data URIs that try to smuggle additional payloads.
    for match in _DATA_URI_PATTERN.finditer(content):
        if len(match.group(1)) > 2 * 1024 * 1024:
            return "SVG embeds an oversized data URI."

    return None


def _read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8", errors="replace")
    except OSError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not read SVG file.",
        ) from exc


def is_svg(path: str | Path) -> bool:
    return Path(path).suffix.lower() == ".svg"


def rasterize_svg_to_png(svg_path: str | Path, output_path: str | Path, *, width: int = 1024) -> Path:
    """Rasterize ``svg_path`` to ``output_path`` (PNG) using Inkscape.

    Raises ``HTTPException`` on any failure with a user-safe message. The full
    error is logged.
    """

    source = Path(svg_path)
    target = Path(output_path)

    if not source.exists():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Watermark file was not found.",
        )

    size = source.stat().st_size
    if size > MAX_SVG_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="SVG watermark is too large to process.",
        )

    content = _read_text(source)
    suspicious_reason = _looks_suspicious(content)
    if suspicious_reason:
        logger.warning("Rejected SVG watermark: %s (path=%s)", suspicious_reason, source)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "This SVG could not be processed safely. "
                "Upload a PNG, JPG, or WebP watermark instead."
            ),
        )

    inkscape = shutil.which("inkscape")
    if not inkscape:
        # Fallback: ImageMagick can read many SVGs via librsvg.
        magick = shutil.which("convert") or shutil.which("magick")
        if not magick:
            raise HTTPException(
                status_code=status.HTTP_501_NOT_IMPLEMENTED,
                detail=(
                    "SVG watermark could not be processed. "
                    "Upload PNG, JPG, or WebP instead."
                ),
            )
        target.parent.mkdir(parents=True, exist_ok=True)
        command = [
            magick,
            "-background", "none",
            "-density", "192",
            f"{source}",
            "-resize", f"{min(width, MAX_RASTERIZED_DIMENSION)}x",
            f"{target}",
        ]
        try:
            result = subprocess.run(
                command,
                capture_output=True,
                check=False,
                timeout=RASTERIZE_TIMEOUT_SECONDS,
            )
        except subprocess.TimeoutExpired as exc:
            logger.warning("SVG rasterize timeout (path=%s)", source)
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="SVG took too long to render. Use a simpler image.",
            ) from exc
        if result.returncode != 0:
            logger.warning(
                "ImageMagick SVG rasterize failed (rc=%s, path=%s): %s",
                result.returncode,
                source,
                result.stderr[:400],
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "SVG watermark could not be processed. "
                    "Upload PNG, JPG, or WebP instead."
                ),
            )
        return target

    target.parent.mkdir(parents=True, exist_ok=True)
    safe_width = max(16, min(width, MAX_RASTERIZED_DIMENSION))
    command = [
        inkscape,
        str(source),
        "--export-type=png",
        f"--export-filename={target}",
        f"--export-width={safe_width}",
        "--export-background-opacity=0",
    ]
    try:
        result = subprocess.run(
            command,
            capture_output=True,
            check=False,
            timeout=RASTERIZE_TIMEOUT_SECONDS,
        )
    except subprocess.TimeoutExpired as exc:
        logger.warning("Inkscape rasterize timeout (path=%s)", source)
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="SVG took too long to render. Use a simpler image.",
        ) from exc

    if result.returncode != 0 or not target.exists() or target.stat().st_size == 0:
        logger.warning(
            "Inkscape SVG rasterize failed (rc=%s, path=%s): %s",
            result.returncode,
            source,
            (result.stderr or b"").decode("utf-8", errors="replace")[:400],
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "SVG watermark could not be processed. "
                "Upload PNG, JPG, or WebP instead."
            ),
        )
    return target
