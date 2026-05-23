"""Redis-backed rate limiting for the public API.

The public app needs separate budgets for uploads, job creation, status
polling, previews, and downloads. In particular, status polling must *not*
consume the same strict quota as job creation, otherwise long-running Celery
jobs can appear to fail even when the worker is still running normally.
"""

from __future__ import annotations

import logging
import threading
import time
from collections import defaultdict
from dataclasses import dataclass
from ipaddress import ip_address
from typing import Optional

import redis as redis_module

from fastapi import Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from starlette.types import ASGIApp

from app.core.config import Settings, get_settings
from app.core.audit_log import log_audit_event

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class RateRule:
    """A single bucket: ``limit`` requests per ``window_seconds`` per IP."""

    name: str
    limit: int
    window_seconds: int


@dataclass(frozen=True)
class RateBucket:
    """Resolved bucket target for a request."""

    bucket_type: str
    group: str
    rule_name: str
    include_global: bool

    @property
    def response_bucket(self) -> str:
        return f"{self.bucket_type}:{self.group}"

    def redis_key(self, ip: str) -> str:
        return f"rl:{ip}:{self.bucket_type}:{self.group}"


# Window length is one hour for all buckets. Limits are configurable.
_HOUR = 3600


class FallbackRateLimiter:
    """
    In-memory rate limiter used when Redis is unavailable.
    Uses a sliding window approach.
    Thread-safe via a lock.
    """

    def __init__(self):
        self._lock = threading.Lock()
        self._requests: dict[str, list[float]] = defaultdict(list)

    def is_allowed(self, key: str, limit: int, window_seconds: int) -> bool:
        now = time.time()
        window_start = now - window_seconds
        with self._lock:
            self._requests[key] = [timestamp for timestamp in self._requests[key] if timestamp > window_start]
            if len(self._requests[key]) >= limit:
                return False
            self._requests[key].append(now)
            return True

    def cleanup_old_keys(self) -> None:
        now = time.time()
        with self._lock:
            to_delete = [
                key
                for key, times in self._requests.items()
                if not times or max(times) < now - 3600
            ]
            for key in to_delete:
                del self._requests[key]


_fallback_limiter = FallbackRateLimiter()


def check_rate_limit(
    redis_client: Optional[redis_module.Redis],
    key: str,
    limit: int,
    window_seconds: int,
) -> bool:
    try:
        if redis_client is None:
            raise RuntimeError("Redis client is unavailable")
        pipe = redis_client.pipeline()
        now = time.time()
        window_start = now - window_seconds
        pipe.zremrangebyscore(key, 0, window_start)
        pipe.zadd(key, {str(now): now})
        pipe.zcard(key)
        pipe.expire(key, window_seconds + 1)
        results = pipe.execute()
        count = int(results[2])
        return count <= limit
    except Exception:
        logger.warning("Redis unavailable for rate limiting, using in-memory fallback")
        return _fallback_limiter.is_allowed(key, limit, window_seconds)


def _build_rules(settings: Settings) -> dict[str, RateRule]:
    preview_limit = max(1, settings.RATE_LIMIT_STATUS_PER_HOUR)
    return {
        "global": RateRule("global", max(1, settings.RATE_LIMIT_GLOBAL_PER_HOUR), _HOUR),
        "jobs": RateRule("jobs", max(1, settings.RATE_LIMIT_JOBS_PER_HOUR), _HOUR),
        "uploads": RateRule("uploads", max(1, settings.RATE_LIMIT_UPLOADS_PER_HOUR), _HOUR),
        "status": RateRule("status", max(1, settings.RATE_LIMIT_STATUS_PER_HOUR), _HOUR),
        "downloads": RateRule("downloads", max(1, settings.RATE_LIMIT_DOWNLOADS_PER_HOUR), _HOUR),
        "preview": RateRule("preview", preview_limit, _HOUR),
    }


def _classify_request(method: str, path: str) -> RateBucket | str | None:
    """Map a request to a rate-limited tool bucket.

    ``"skip"`` means "do not rate-limit this request".
    ``None`` means "fallback to the shared global bucket only".
    """

    method_upper = method.upper()
    normalized_path = path.lower().rstrip("/")

    if method_upper == "OPTIONS" or normalized_path.startswith("/api/health"):
        return "skip"

    if normalized_path.startswith("/api/files/"):
        if method_upper == "POST" and (
            normalized_path.endswith("/upload") or normalized_path.endswith("/upload-multiple")
        ):
            return RateBucket(bucket_type="upload", group="files", rule_name="uploads", include_global=True)
        if method_upper == "GET":
            return RateBucket(bucket_type="preview", group="files", rule_name="preview", include_global=False)

    for prefix, group in (
        ("/api/compress", "compress"),
        ("/api/convert", "convert"),
        ("/api/file-tools", "filetools"),
        ("/api/pdf", "pdf"),
        ("/api/image", "image"),
        ("/api/ocr", "ocr"),
    ):
        if not normalized_path.startswith(prefix):
            continue

        if method_upper == "GET":
            if "/status/" in normalized_path:
                return RateBucket(bucket_type="status", group=group, rule_name="status", include_global=False)
            if "/download/" in normalized_path:
                return RateBucket(bucket_type="download", group=group, rule_name="downloads", include_global=False)
            if group == "pdf" and "/file/" in normalized_path:
                return RateBucket(bucket_type="preview", group=group, rule_name="preview", include_global=False)
            return RateBucket(bucket_type="preview", group=group, rule_name="preview", include_global=False)

        if method_upper in {"POST", "PUT", "PATCH"}:
            if group == "pdf" and normalized_path.endswith("/upload-only"):
                return RateBucket(bucket_type="upload", group=group, rule_name="uploads", include_global=True)
            return RateBucket(bucket_type="job", group=group, rule_name="jobs", include_global=True)

        return None

    if path.lower().startswith("/api/"):
        if method_upper == "GET":
            return RateBucket(bucket_type="preview", group="api", rule_name="preview", include_global=False)
        if method_upper in {"POST", "PUT", "PATCH", "DELETE"}:
            return None

    return None


def _safe_ip(value: str | None) -> str | None:
    if not value:
        return None
    candidate = value.strip()
    if not candidate:
        return None
    try:
        return str(ip_address(candidate))
    except ValueError:
        return None


def _client_ip(request: Request, *, trust_proxy: bool) -> str:
    if trust_proxy:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            for part in forwarded.split(","):
                candidate = _safe_ip(part)
                if candidate:
                    return candidate
        real_ip = request.headers.get("x-real-ip")
        candidate = _safe_ip(real_ip)
        if candidate:
            return candidate
    if request.client and request.client.host:
        candidate = _safe_ip(request.client.host)
        if candidate:
            return candidate
    return "unknown"


class _RedisLimiter:
    """Thin wrapper around redis-py for rate-limit bookkeeping."""

    def __init__(self, url: str) -> None:
        self._client = redis_module.Redis.from_url(url, socket_timeout=0.5, socket_connect_timeout=0.5)

    @property
    def client(self) -> redis_module.Redis:
        return self._client


class RateLimitMiddleware(BaseHTTPMiddleware):
    """ASGI middleware that applies the global and per-bucket limits."""

    def __init__(self, app: ASGIApp, *, settings: Settings | None = None) -> None:
        super().__init__(app)
        self._settings = settings or get_settings()
        self._rules = _build_rules(self._settings)
        self._enabled = self._settings.RATE_LIMIT_ENABLED
        self._trust_proxy = self._settings.RATE_LIMIT_TRUST_PROXY
        self._limiter: _RedisLimiter | None = None

    def _ensure_limiter(self) -> _RedisLimiter | None:
        if self._limiter is not None:
            return self._limiter
        try:
            self._limiter = _RedisLimiter(self._settings.RATE_LIMIT_REDIS_URL or self._settings.REDIS_URL)
        except Exception as exc:  # pragma: no cover - depends on Redis being live
            logger.warning("Redis unavailable for rate limiting, using in-memory fallback: %s", exc)
        return self._limiter

    async def dispatch(self, request: Request, call_next):  # type: ignore[override]
        if not self._enabled:
            return await call_next(request)

        bucket = _classify_request(request.method, request.url.path)
        if bucket == "skip":
            return await call_next(request)

        limiter = self._ensure_limiter()
        redis_client = limiter.client if limiter is not None else None

        ip = _client_ip(request, trust_proxy=self._trust_proxy)
        rules_to_apply: list[tuple[RateRule, str, str]] = []
        if bucket is None:
            rules_to_apply.append((self._rules["global"], f"rl:{ip}:global", "global"))
        else:
            if bucket.include_global:
                rules_to_apply.append((self._rules["global"], f"rl:{ip}:global", "global"))
            rules_to_apply.append((self._rules[bucket.rule_name], bucket.redis_key(ip), bucket.response_bucket))

        worst_remaining: int | None = None
        worst_reset: int | None = None
        worst_limit: int | None = None
        worst_bucket = "global"

        for rule, redis_key, response_bucket in rules_to_apply:
            allowed = check_rate_limit(redis_client, redis_key, rule.limit, rule.window_seconds)
            ttl = rule.window_seconds
            remaining = rule.limit if allowed else 0
            if worst_remaining is None or remaining < worst_remaining:
                worst_remaining = remaining
                worst_reset = ttl
                worst_limit = rule.limit
                worst_bucket = response_bucket

            if not allowed:
                logger.info(
                    "Rate limit hit ip=%s path=%s bucket=%s limit=%s retry_after=%s",
                    ip,
                    request.url.path,
                    response_bucket,
                    rule.limit,
                    ttl,
                )
                log_audit_event(
                    "rate_limited",
                    ip_address=ip,
                    extra={"path": request.url.path, "bucket": response_bucket, "limit": rule.limit},
                )
                response = JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={
                        "detail": "Rate limit exceeded. Please try again later.",
                        "retry_after_seconds": ttl,
                        "bucket": response_bucket,
                    },
                )
                self._apply_headers(response, rule.limit, 0, ttl)
                response.headers["Retry-After"] = str(ttl)
                return response

        response = await call_next(request)
        if worst_limit is not None and worst_remaining is not None and worst_reset is not None:
            self._apply_headers(response, worst_limit, worst_remaining, worst_reset)
            response.headers.setdefault("X-RateLimit-Bucket", worst_bucket)
        return response

    @staticmethod
    def _apply_headers(response: Response, limit: int, remaining: int, reset_in: int) -> None:
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(max(0, remaining))
        response.headers["X-RateLimit-Reset"] = str(int(time.time()) + max(0, reset_in))
