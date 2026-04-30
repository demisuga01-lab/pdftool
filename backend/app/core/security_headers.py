"""Security headers middleware applied to every response."""

from __future__ import annotations

from starlette.middleware.base import BaseHTTPMiddleware


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):  # type: ignore[override]
        response = await call_next(request)
        headers = response.headers
        headers.setdefault("X-Content-Type-Options", "nosniff")
        headers.setdefault("X-Frame-Options", "DENY")
        headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        headers.setdefault(
            "Permissions-Policy",
            "geolocation=(), microphone=(), camera=(), payment=(), usb=()",
        )
        # ``no-referrer`` is too strict for downloads; we rely on the
        # FileResponse to set its own Cache-Control where needed.
        if request.url.path.startswith("/api/"):
            # Browsers should not index API responses.
            headers.setdefault("X-Robots-Tag", "noindex, nofollow")
        return response
