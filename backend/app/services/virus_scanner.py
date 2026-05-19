from pathlib import Path
import logging

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class VirusScanner:
    @staticmethod
    def is_available() -> bool:
        try:
            import clamd

            settings = get_settings()
            cd = clamd.ClamdUnixSocket(path=settings.CLAMD_SOCKET)
            cd.ping()
            return True
        except Exception:
            return False

    @staticmethod
    def scan_file(file_path: Path) -> dict:
        """
        Scan a file with ClamAV daemon.

        Returns:
          {
            "clean": bool,
            "threat": str | None,
            "scanner": "clamav" | "unavailable"
          }

        FAIL OPEN: if ClamAV is unavailable for any reason, log a warning
        and return clean=True. Never block uploads because scanner is down.
        Never raise exceptions to the caller.
        """
        try:
            import clamd

            settings = get_settings()
            cd = clamd.ClamdUnixSocket(path=settings.CLAMD_SOCKET)
            result = cd.scan(str(file_path))
            if result is None:
                return {
                    "clean": True,
                    "threat": None,
                    "scanner": "clamav",
                }
            status, threat = result.get(str(file_path), ("OK", None))
            if status == "FOUND":
                logger.warning("ClamAV FOUND threat in %s: %s", file_path.name, threat)
                return {
                    "clean": False,
                    "threat": threat,
                    "scanner": "clamav",
                }
            return {
                "clean": True,
                "threat": None,
                "scanner": "clamav",
            }
        except Exception as e:
            logger.warning("ClamAV unavailable, skipping scan for %s: %s", file_path.name, e)
            return {
                "clean": True,
                "threat": None,
                "scanner": "unavailable",
            }
