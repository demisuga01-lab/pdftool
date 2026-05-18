from __future__ import annotations

from pathlib import Path
from typing import Any

from app.services.file_tools_service import collect_files, file_record, output_path, write_csv, write_json
from app.services.filetype_service import FileTypeService
from app.services.hash_service import HashService


class ReportService:
    async def inventory(self, input_paths: list[str], output_dir: str, output_format: str = "json", include_hashes: bool = False, include_mime: bool = True) -> dict[str, Any]:
        files = [path for path in await collect_files(input_paths, Path(output_dir) / "inventory-inputs") if path.is_file()]
        filetype = FileTypeService()
        hasher = HashService()
        rows: list[dict[str, Any]] = []
        for path in files:
            row = file_record(path)
            if include_mime:
                row["detected_mime"] = (await filetype.detect(path))["detected_mime"]
            if include_hashes:
                row["sha256"] = hasher.hash_file(path, ["sha256"])["hashes"]["sha256"]
            rows.append(row)
        if output_format.lower() == "csv":
            fields = ["filename", "extension", "detected_mime", "size_bytes", "sha256", "modified_date"]
            output = output_path(output_dir, "inventory.csv")
            write_csv(output, rows, fields)
        else:
            output = output_path(output_dir, "inventory.json")
            write_json(output, rows)
        return {"output_path": str(output), "output_filename": output.name, "media_type": "text/csv" if output.suffix == ".csv" else "application/json", "extension": output.suffix.lstrip(".")}
