from __future__ import annotations

import json
import shutil
from pathlib import Path
from typing import Any

from fastapi import HTTPException, status

from app.services.command_runner import run_command
from app.services.file_tools_service import output_path

SENSITIVE_KEYS = {"directory", "filepath", "sourcefile", "filename", "filepermissions", "fileinodechangdate"}


class MetadataService:
    def _sanitize(self, value: Any) -> Any:
        if isinstance(value, dict):
            clean = {}
            for key, item in value.items():
                lowered = str(key).lower()
                if any(token in lowered for token in SENSITIVE_KEYS):
                    continue
                if isinstance(item, str) and (":\\" in item or item.startswith("/") or "/home/" in item.lower() or "\\users\\" in item.lower()):
                    continue
                clean[key] = self._sanitize(item)
            return clean
        if isinstance(value, list):
            return [self._sanitize(item) for item in value]
        return value

    async def view(self, input_path: str | Path) -> dict[str, Any]:
        stdout, _ = await run_command(["exiftool", "-json", str(input_path)], timeout_seconds=30)
        try:
            payload = json.loads(stdout or "[]")
        except json.JSONDecodeError as exc:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Metadata output could not be parsed.") from exc
        return {"metadata": self._sanitize(payload[0] if payload else {})}

    async def clean(self, input_path: str | Path, output_dir: str | Path, fields_to_remove: list[str] | str = "all") -> dict[str, Any]:
        source = Path(input_path)
        output = output_path(output_dir, f"{source.stem}-cleaned{source.suffix}")
        shutil.copy2(source, output)
        if fields_to_remove == "all" or fields_to_remove == ["all"]:
            command = ["exiftool", "-all=", "-overwrite_original", str(output)]
        else:
            command = ["exiftool", *[f"-{field}=" for field in fields_to_remove], "-overwrite_original", str(output)]
        await run_command(command, timeout_seconds=60)
        return {"output_path": str(output), "output_filename": output.name, "media_type": "application/octet-stream", "extension": output.suffix.lstrip(".")}
