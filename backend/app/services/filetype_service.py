from __future__ import annotations

import mimetypes
from pathlib import Path
from typing import Any

from app.services.command_runner import run_command_result
from app.services.file_tools_service import collect_files, output_path, write_json


class FileTypeService:
    async def detect(self, input_path: str | Path) -> dict[str, Any]:
        path = Path(input_path)
        detected = ""
        try:
            import magic

            detected = str(magic.from_file(str(path), mime=True))
        except Exception:
            detected = ""
        try:
            result = await run_command_result(["file", "--mime-type", "-b", str(path)], check=False, timeout_seconds=15)
            cli_mime = result.stdout.strip()
        except Exception:
            cli_mime = ""
        detected_mime = detected or cli_mime or "application/octet-stream"
        expected_mime = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        mismatch = expected_mime != "application/octet-stream" and detected_mime != expected_mime
        return {
            "filename": path.name,
            "extension": path.suffix.lower().lstrip("."),
            "detected_mime": detected_mime,
            "expected_mime": expected_mime,
            "mismatch": mismatch,
            "description": "Extension does not match detected MIME type." if mismatch else "Extension matches the detected type.",
            "size_bytes": path.stat().st_size,
        }

    async def extension_report(self, input_paths: list[str], output_dir: str) -> dict[str, Any]:
        files = await collect_files(input_paths, Path(output_dir) / "extension-inputs")
        results = [await self.detect(path) for path in files if path.is_file()]
        report = {"total_files": len(results), "mismatches": [item for item in results if item["mismatch"]], "results": results}
        output = output_path(output_dir, "extension-mismatch-report.json")
        write_json(output, report)
        return {
            "output_path": str(output),
            "output_filename": output.name,
            "media_type": "application/json",
            "extension": "json",
            "result": report,
        }
