from __future__ import annotations

import json
import logging
import time
from contextvars import ContextVar
from pathlib import Path
from typing import Any

audit_logger = logging.getLogger("pdftool.audit")
_audit_ip: ContextVar[str | None] = ContextVar("audit_ip", default=None)

if not audit_logger.handlers:
    try:
        Path("/var/log/pdftool").mkdir(parents=True, exist_ok=True)
        handler: logging.Handler = logging.FileHandler("/var/log/pdftool/audit.log")
    except OSError:
        handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(message)s"))
    audit_logger.addHandler(handler)
    audit_logger.setLevel(logging.INFO)
    audit_logger.propagate = False


def log_audit_event(
    event_type: str,
    job_id: str | None = None,
    file_name: str | None = None,
    file_size: int | None = None,
    ip_address: str | None = None,
    extra: dict[str, Any] | None = None,
) -> None:
    event: dict[str, Any] = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "event": event_type,
    }

    if job_id:
        event["job_id"] = job_id
    if file_name:
        event["file_name"] = Path(file_name).name
    if file_size is not None:
        event["file_size_bytes"] = file_size
    resolved_ip = ip_address or _audit_ip.get()
    if resolved_ip:
        event["ip"] = resolved_ip
    if extra:
        event.update(extra)

    audit_logger.info(json.dumps(event, separators=(",", ":"), sort_keys=True))


def set_audit_ip(ip_address: str | None):
    return _audit_ip.set(ip_address)


def reset_audit_ip(token) -> None:
    _audit_ip.reset(token)
