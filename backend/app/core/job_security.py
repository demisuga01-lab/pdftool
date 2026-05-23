from __future__ import annotations

import hmac
import secrets
from functools import lru_cache

from fastapi import HTTPException, status

from app.core.audit_log import log_audit_event
from app.core.config import Settings, get_settings

JOB_TOKEN_TTL_SECONDS = 86_400


@lru_cache
def _redis_client(redis_url: str):
    import redis

    return redis.Redis.from_url(redis_url, socket_connect_timeout=2, socket_timeout=2)


def _client(settings: Settings | None = None):
    resolved = settings or get_settings()
    return _redis_client(resolved.REDIS_URL)


def create_job_access(job_id: str, settings: Settings | None = None) -> str:
    access_token = secrets.token_urlsafe(32)
    _client(settings).set(f"job_token:{job_id}", access_token, ex=JOB_TOKEN_TTL_SECONDS)
    log_audit_event("job_created", job_id=job_id)
    return access_token


def verify_job_access(
    job_id: str,
    token: str | None = None,
    header_token: str | None = None,
    settings: Settings | None = None,
    ip_address: str | None = None,
) -> None:
    provided = (token or header_token or "").strip()
    if not provided:
        log_audit_event("access_denied", job_id=job_id, ip_address=ip_address, extra={"reason": "missing_token"})
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Job access token is required.")

    stored = _client(settings).get(f"job_token:{job_id}")
    if isinstance(stored, bytes):
        stored = stored.decode("utf-8", errors="replace")

    if not stored or not hmac.compare_digest(str(stored), provided):
        log_audit_event("access_denied", job_id=job_id, ip_address=ip_address, extra={"reason": "invalid_token"})
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid job access token.")
