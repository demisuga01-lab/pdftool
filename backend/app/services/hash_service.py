from __future__ import annotations

import binascii
import hashlib
from pathlib import Path
from typing import Any

from fastapi import HTTPException, status

from app.services.file_tools_service import collect_files, output_path, write_csv, write_json

SUPPORTED_HASHES = {"md5", "sha1", "sha256", "sha512", "blake2b", "crc32"}
CHUNK_SIZE = 8 * 1024 * 1024


class HashService:
    def normalize_algorithms(self, algorithms: list[str] | None) -> list[str]:
        selected = [algorithm.lower().strip() for algorithm in (algorithms or ["sha256"]) if algorithm.strip()]
        invalid = sorted(set(selected) - SUPPORTED_HASHES)
        if invalid:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unsupported hash algorithm: {', '.join(invalid)}")
        return selected or ["sha256"]

    def hash_file(self, input_path: str | Path, algorithms: list[str] | None = None) -> dict[str, Any]:
        path = Path(input_path)
        selected = self.normalize_algorithms(algorithms)
        hashers = {algorithm: hashlib.new(algorithm) for algorithm in selected if algorithm != "crc32"}
        crc = 0
        with path.open("rb") as handle:
            while chunk := handle.read(CHUNK_SIZE):
                for hasher in hashers.values():
                    hasher.update(chunk)
                if "crc32" in selected:
                    crc = binascii.crc32(chunk, crc)
        hashes = {algorithm: hashers[algorithm].hexdigest() for algorithm in hashers}
        if "crc32" in selected:
            hashes["crc32"] = f"{crc & 0xFFFFFFFF:08x}"
        return {"filename": path.name, "size_bytes": path.stat().st_size, "hashes": hashes}

    def verify(self, input_path: str | Path, algorithm: str, expected_hash: str) -> dict[str, Any]:
        actual = self.hash_file(input_path, [algorithm])["hashes"][algorithm.lower()]
        expected = expected_hash.strip().lower()
        return {"match": actual.lower() == expected, "expected": expected, "actual": actual, "algorithm": algorithm.lower(), "filename": Path(input_path).name}

    async def batch_hash(self, input_paths: list[str], output_dir: str, algorithms: list[str], output_format: str = "json") -> dict[str, Any]:
        files = await collect_files(input_paths, Path(output_dir) / "hash-inputs")
        results = [self.hash_file(path, algorithms) for path in files if path.is_file()]
        if output_format.lower() == "csv":
            fields = ["filename", "size_bytes", *self.normalize_algorithms(algorithms)]
            rows = [{"filename": item["filename"], "size_bytes": item["size_bytes"], **item["hashes"]} for item in results]
            output = output_path(output_dir, "hashes.csv")
            write_csv(output, rows, fields)
        else:
            output = output_path(output_dir, "hashes.json")
            write_json(output, results)
        return {"output_path": str(output), "output_filename": output.name, "media_type": "text/csv" if output.suffix == ".csv" else "application/json", "extension": output.suffix.lstrip(".")}
