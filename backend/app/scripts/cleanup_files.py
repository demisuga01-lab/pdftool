"""Delete uploads, outputs and preview caches older than the retention window.

Run this from a cron job or systemd timer:

    0 * * * * /opt/pdftool/backend/venv/bin/python -m app.scripts.cleanup_files

Set ``FILE_RETENTION_HOURS`` in the backend ``.env`` to override the default
24-hour window. The script never touches files whose mtime is younger than the
retention window, so jobs that are still in flight are safe.
"""

from __future__ import annotations

import logging
import time
from pathlib import Path

from app.core.config import get_settings


logger = logging.getLogger(__name__)


def _purge_directory(directory: Path, *, cutoff: float) -> tuple[int, int]:
    """Remove files (and empty subdirs) below ``cutoff``.

    Returns ``(files_removed, bytes_removed)``.
    """

    if not directory.exists():
        return 0, 0

    files_removed = 0
    bytes_removed = 0

    for path in sorted(directory.rglob("*"), key=lambda p: len(p.parts), reverse=True):
        try:
            if path.is_file():
                stat = path.stat()
                if stat.st_mtime < cutoff:
                    bytes_removed += stat.st_size
                    path.unlink(missing_ok=True)
                    files_removed += 1
            elif path.is_dir():
                # Try to remove empty directories created by per-job folders.
                try:
                    next(path.iterdir())
                except StopIteration:
                    path.rmdir()
                except OSError:
                    pass
        except OSError as exc:
            logger.warning("cleanup error path=%s: %s", path, exc)

    return files_removed, bytes_removed


def run() -> None:
    settings = get_settings()
    retention_seconds = settings.FILE_RETENTION_HOURS * 3600
    cutoff = time.time() - retention_seconds

    targets = (settings.UPLOAD_DIR, settings.OUTPUT_DIR, settings.TEMP_DIR)
    total_files = 0
    total_bytes = 0

    for directory in targets:
        files_removed, bytes_removed = _purge_directory(Path(directory), cutoff=cutoff)
        logger.info(
            "cleanup directory=%s files=%s bytes=%s",
            directory,
            files_removed,
            bytes_removed,
        )
        total_files += files_removed
        total_bytes += bytes_removed

    logger.info("cleanup complete files=%s bytes=%s", total_files, total_bytes)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    run()
