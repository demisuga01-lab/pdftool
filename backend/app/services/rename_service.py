from __future__ import annotations

import re
import shutil
import unicodedata
from datetime import datetime
from pathlib import Path
from typing import Any

from fastapi import HTTPException, status

from app.services.file_tools_service import collect_files, output_path, safe_filename, zip_files


class RenameService:
    async def batch_rename(self, input_paths: list[str], output_dir: str, params: dict[str, Any]) -> dict[str, Any]:
        files = await collect_files(input_paths, Path(output_dir) / "rename-inputs")
        pattern = str(params.get("pattern") or "{name}-{n}.{ext}")
        start = int(params.get("start_number") or 1)
        padding = int(params.get("padding") or 2)
        names: list[str] = []
        for index, path in enumerate(files, start=start):
            stem = path.stem
            ext = path.suffix.lstrip(".")
            renamed_stem = stem.replace(str(params.get("find") or ""), str(params.get("replace") or "")) if params.get("find") else stem
            case = str(params.get("case") or "none").lower()
            if case == "upper":
                renamed_stem = renamed_stem.upper()
            elif case == "lower":
                renamed_stem = renamed_stem.lower()
            elif case == "title":
                renamed_stem = renamed_stem.title()
            name = pattern.format(
                name=renamed_stem,
                ext=ext,
                n=str(index).zfill(padding),
                date=datetime.utcnow().strftime("%Y%m%d"),
                upper=renamed_stem.upper(),
                lower=renamed_stem.lower(),
            )
            name = f"{params.get('prefix') or ''}{name}{params.get('suffix') or ''}"
            names.append(safe_filename(name, f"file-{index}.{ext}"))
        lowered = [name.lower() for name in names]
        if len(lowered) != len(set(lowered)):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rename pattern creates duplicate filenames.")
        output = output_path(output_dir, "renamed-files.zip")
        zip_files(files, output, names)
        return {"output_path": str(output), "output_filename": output.name, "media_type": "application/zip", "extension": "zip"}

    async def sanitize(self, input_paths: list[str], output_dir: str, params: dict[str, Any]) -> dict[str, Any]:
        files = await collect_files(input_paths, Path(output_dir) / "sanitize-inputs")
        names: list[str] = []
        max_length = int(params.get("max_length") or 255)
        for path in files:
            stem = path.stem
            if params.get("remove_unicode"):
                stem = unicodedata.normalize("NFKD", stem).encode("ascii", "ignore").decode("ascii")
            if params.get("remove_special_chars"):
                stem = re.sub(r"[^A-Za-z0-9 ._-]+", "", stem)
            replace_spaces = str(params.get("replace_spaces") or "none")
            if replace_spaces == "underscore":
                stem = stem.replace(" ", "_")
            elif replace_spaces == "dash":
                stem = stem.replace(" ", "-")
            if params.get("lowercase"):
                stem = stem.lower()
            names.append(safe_filename(f"{stem[:max_length]}{path.suffix}", path.name, max_length=max_length))
        output = output_path(output_dir, "sanitized-files.zip")
        zip_files(files, output, names)
        return {"output_path": str(output), "output_filename": output.name, "media_type": "application/zip", "extension": "zip"}
