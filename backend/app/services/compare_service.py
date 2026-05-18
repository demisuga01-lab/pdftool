from __future__ import annotations

import filecmp
from pathlib import Path
from typing import Any

from app.services.command_runner import run_command_result


class CompareService:
    async def compare(self, file_a: str, file_b: str, mode: str = "binary") -> dict[str, Any]:
        path_a = Path(file_a)
        path_b = Path(file_b)
        if mode == "text":
            result = await run_command_result(["diff", "-u", str(path_a), str(path_b)], check=False, timeout_seconds=30)
            lines = result.stdout.splitlines()
            truncated = len(lines) > 500
            return {
                "identical": result.returncode == 0,
                "size_a": path_a.stat().st_size,
                "size_b": path_b.stat().st_size,
                "mode": "text",
                "diff_lines": len(lines),
                "diff_preview": "\n".join(lines[:500]),
                "truncated": truncated,
            }
        return {"identical": filecmp.cmp(path_a, path_b, shallow=False), "size_a": path_a.stat().st_size, "size_b": path_b.stat().st_size, "mode": "binary", "truncated": False}
