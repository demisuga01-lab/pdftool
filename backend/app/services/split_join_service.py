from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

from fastapi import HTTPException, status

from app.services.file_tools_service import collect_files, natural_key, output_path, safe_filename, zip_files
from app.services.hash_service import HashService


class SplitJoinService:
    async def split(self, input_path: str, output_dir: str, params: dict[str, Any]) -> dict[str, Any]:
        source = Path(input_path)
        mode = str(params.get("mode") or "by_size")
        if mode == "by_count":
            count = int(params.get("chunk_count") or 2)
            if count < 1 or count > 999:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="chunk_count must be between 1 and 999.")
            chunk_size = math.ceil(source.stat().st_size / count)
        else:
            chunk_size = int(params.get("chunk_size_bytes") or 1024 * 1024)
            if chunk_size < 1024:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="chunk_size_bytes must be at least 1024.")
        prefix = safe_filename(str(params.get("output_prefix") or source.stem), source.stem)
        parts_dir = Path(output_dir) / "parts"
        parts_dir.mkdir(parents=True, exist_ok=True)
        manifest: list[dict[str, Any]] = []
        hasher = HashService()
        with source.open("rb") as handle:
            index = 1
            while chunk := handle.read(chunk_size):
                part = parts_dir / f"{prefix}.part{index:03d}"
                part.write_bytes(chunk)
                manifest.append({"name": part.name, "size": part.stat().st_size, "sequence": index, "sha256": hasher.hash_file(part, ["sha256"])["hashes"]["sha256"]})
                index += 1
        (parts_dir / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
        output = output_path(output_dir, f"{prefix}-parts.zip")
        zip_files([*sorted(parts_dir.glob(f"{prefix}.part*")), parts_dir / "manifest.json"], output)
        return {"output_path": str(output), "output_filename": output.name, "media_type": "application/zip", "extension": "zip", "result": {"parts": manifest}}

    async def join(self, input_paths: list[str], output_dir: str, params: dict[str, Any]) -> dict[str, Any]:
        files = sorted([path for path in await collect_files(input_paths, Path(output_dir) / "join-inputs") if path.is_file() and path.name != "manifest.json"], key=natural_key)
        if not files:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="At least one part file is required.")
        manifest = params.get("manifest")
        if manifest:
            expected = {item["name"]: item["sha256"] for item in json.loads(str(manifest))}
            hasher = HashService()
            for part in files:
                if part.name in expected and hasher.hash_file(part, ["sha256"])["hashes"]["sha256"] != expected[part.name]:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Part checksum mismatch: {part.name}")
        output = output_path(output_dir, safe_filename(str(params.get("output_filename") or "joined-file.bin"), "joined-file.bin"))
        with output.open("wb") as target:
            for part in files:
                with part.open("rb") as source:
                    while chunk := source.read(1024 * 1024):
                        target.write(chunk)
        return {"output_path": str(output), "output_filename": output.name, "media_type": "application/octet-stream", "extension": output.suffix.lstrip(".")}
