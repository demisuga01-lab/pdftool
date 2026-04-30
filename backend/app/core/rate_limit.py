"""Redis-backed rate limiting for the public API.

We keep this dependency-free of ``slowapi`` because the rate-limiting logic we
need is straightforward: per-IP fixed-window counters with bucket-specific
budgets. Using ``redis-py`` directly also lets us share the existing Celery
broker without adding another middleware stack.
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from ipaddress import ip_address
from typing import Iterable

from fastapi import Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from starlette.types import ASGIApp

from app.core.config import Settings, get_settings

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class RateRule:
    """A single bucket: ``limit`` requests per ``window_seconds`` per IP."""

    name: str
    limit: int
    window_seconds: int


# Window length is one hour for all buckets. Limits are configurable.
_HOUR = 3600


def _build_rules(settings: Settings) -> dict[str, RateRule]:
    return {
        "global": RateRule("global", max(1, settings.RATE_LIMIT_GLOBAL_PER_HOUR), _HOUR),
        "jobs": RateRule("jobs", max(1, settings.RATE_LIMIT_JOBS_PER_HOUR), _HOUR),
        "uploads": RateRule("uploads", max(1, settings.RATE_LIMIT_UPLOADS_PER_HOUR), _HOUR),
        "status": RateRule("status", max(1, settings.RATE_LIMIT_STATUS_PER_HOUR), _HOUR),
        "downloads": RateRule("downloads", max(1, settings.RATE_LIMIT_DOWNLOADS_PER_HOUR), _HOUR),
    }


def _bucket_for_path(method: str, path: str) -> str | None:
    """Map a request to the most relevant rate bucket.

    ``None`` means "global only" (the global limiter is always applied except
    for explicit allowlist matches).
    """

    method_upper = method.upper()
    lower = path.lower()

    if lower.startswith("/api/health"):
        return "skip"

    if method_upper == "GET":
        if "/status/" in lower:
            return "status"
        if "/download/" in lower:
            return "downloads"
        if "/preview/" in lower or "/thumbnail/" in lower or "/pdf-page/" in lower:
            return "downloads"
        return None

    if method_upper in {"POST", "PUT", "PATCH"}:
        if "/upload" in lower or lower.endswith("/upload-only"):
            return "uploads"
        # Any other write operation counts as a job submission.
        return "jobs"

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
        # Importing inside __init__ keeps redis-py optional until we actually
        # need it (e.g. unit tests where the server is not running).
        import redis

        self._client = redis.Redis.from_url(url, socket_timeout=0.5, socket_connect_timeout=0.5)

    def hit(self, key: str, window_seconds: int) -> tuple[int, int]:
        """Increment ``key`` and return ``(count, ttl_seconds)``.

        On Redis failures we surface the error so the middleware can fail open
        rather than block the request.
        """

        pipeline = self._client.pipeline()
        pipeline.incr(key)
        pipeline.expire(key, window_seconds, nx=True)
        pipeline.ttl(key)
        count, _, ttl = pipeline.execute()
        return int(count), int(ttl) if ttl and ttl > 0 else window_seconds


class RateLimitMiddleware(BaseHTTPMiddleware):
    """ASGI middleware that applies the global + per-bucket limits."""

    def __init__(self, app: ASGIApp, *, settings: Settings | None = None) -> None:
        super().__init__(app)
        self._settings = settings or get_settings()
        self._rules = _build_rules(self._settings)
        self._enabled = self._settings.RATE_LIMIT_ENABLED
        self._trust_proxy = self._settings.RATE_LIMIT_TRUST_PROXY
        self._limiter: _RedisLimiter | None = None
        self._failed_open = False

    def _ensure_limiter(self) -> _RedisLimiter | None:
        if self._limiter is not None:
            return self._limiter
        if self._failed_open:
            return None
        try:
            self._limiter = _RedisLimiter(self._settings.RATE_LIMIT_REDIS_URL or self._settings.REDIS_URL)
        except Exception as exc:  # pragma: no cover - depends on Redis being live
            logger.warning("Rate limiter disabled (redis unavailable): %s", exc)
            self._failed_open = True
        return self._limiter

    async def dispatch(self, request: Request, call_next):  # type: ignore[override]
        if not self._enabled:
            return await call_next(request)

        bucket = _bucket_for_path(request.method, request.url.path)
        if bucket == "skip":
            return await call_next(request)

        limiter = self._ensure_limiter()
        if limiter is None:
            return await call_next(request)

        ip = _client_ip(request, trust_proxy=self._trust_proxy)
        rules: list[RateRule] = [self._rules["global"]]
        if bucket and bucket in self._rules:
            rules.append(self._rules[bucket])

        worst_remaining: int | None = None
        worst_reset: int | None = None
        worst_limit: int | None = None
        for rule in rules:
            key = f"rl:{rule.name}:{ip}"
            try:
                count, ttl = limiter.hit(key, rule.window_seconds)
            except Exception as exc:  # pragma: no cover - depends on Redis
                logger.warning("Rate limiter pipeline failed (failing open): %s", exc)
                return await call_next(request)

            remaining = max(0, rule.limit - count)
            if worst_remaining is None or remaining < worst_remaining:
                worst_remaining = remaining
                worst_reset = ttl
                worst_limit = rule.limit

            if count > rule.limit:
                logger.info(
                    "Rate limit hit ip=%s bucket=%s count=%s limit=%s ttl=%s",
                    ip,
                    rule.name,
                    count,
                    rule.limit,
                    ttl,
                )
                response = JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={
                        "detail": "Rate limit exceeded. Please try again later.",
                        "retry_after_seconds": ttl,
                    },
                )
                self._apply_headers(response, rule.limit, 0, ttl)
                response.headers["Retry-After"] = str(ttl)
                return response

        response = await call_next(request)
        if worst_limit is not None and worst_remaining is not None and worst_reset is not None:
            self._apply_headers(response, worst_limit, worst_remaining, worst_reset)
        return response

    @staticmethod
    def _apply_headers(response: Response, limit: int, remaining: int, reset_in: int) -> None:
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(max(0, remaining))
        response.headers["X-RateLimit-Reset"] = str(int(time.time()) + max(0, reset_in))
