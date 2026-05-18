from __future__ import annotations

from collections import defaultdict
from pathlib import Path
from typing import Any

from app.services.file_tools_service import collect_files
from app.services.hash_service import HashService


class DuplicateService:
    async def find(self, input_paths: list[str], output_dir: str, method: str = "hash") -> dict[str, Any]:
        files = [path for path in await collect_files(input_paths, Path(output_dir) / "duplicate-inputs") if path.is_file()]
        groups: dict[str, list[Path]] = defaultdict(list)
        sizes: dict[str, int] = {}
        if method == "filename":
            for path in files:
                key = path.stem.lower().strip()
                groups[key].append(path)
                sizes[key] = path.stat().st_size
        else:
            hasher = HashService()
            for path in files:
                key = hasher.hash_file(path, ["sha256"])["hashes"]["sha256"]
                groups[key].append(path)
                sizes[key] = path.stat().st_size
        duplicate_groups = [
            {"hash": key, "size_bytes": sizes.get(key, 0), "files": [path.name for path in paths]}
            for key, paths in groups.items()
            if len(paths) > 1
        ]
        wasted = sum(group["size_bytes"] * (len(group["files"]) - 1) for group in duplicate_groups)
        return {"total_files": len(files), "duplicate_groups": duplicate_groups, "wasted_bytes": wasted}
