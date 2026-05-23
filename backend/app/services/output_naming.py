from __future__ import annotations

import re
import uuid
from pathlib import Path


def job_id_from_output_dir(output_dir: str | Path) -> str:
    name = Path(output_dir).name.strip()
    return re.sub(r"[^a-zA-Z0-9._-]", "_", name) or str(uuid.uuid4())[:8]


def safe_output_name(job_id: str, original_name: str) -> str:
    safe_name = Path(original_name).name
    safe_name = re.sub(r"[^a-zA-Z0-9._-]", "_", safe_name)
    if len(safe_name) > 100:
        ext = Path(safe_name).suffix
        safe_name = safe_name[:96] + ext
    return f"{job_id}_{safe_name}"


def ensure_job_prefix(job_id: str, filename: str) -> str:
    safe_name = safe_output_name(job_id, filename)
    prefix = f"{job_id}_"
    return safe_name if not Path(filename).name.startswith(prefix) else Path(filename).name
