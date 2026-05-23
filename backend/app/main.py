import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from app.api.routes import compress, convert, files, files_tools, image, ocr, pdf
from app.core.audit_log import log_audit_event, reset_audit_ip, set_audit_ip
from app.core.config import get_settings
from app.core.errors import register_exception_handlers
from app.core.rate_limit import RateLimitMiddleware
from app.core.security_headers import SecurityHeadersMiddleware

APP_VERSION = "1.0.0"
ALLOWED_ORIGINS = [
    "https://tools.wellfriend.online",
    "https://devtools.wellfriend.online",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:8000",
]


class CSRFOriginMiddleware(BaseHTTPMiddleware):
    """
    Validates Origin or Referer header on state-changing requests.
    GET requests are allowed without Origin check.
    """

    EXEMPT_PATHS = [
        "/docs",
        "/openapi.json",
        "/redoc",
        "/api/health",
    ]

    async def dispatch(self, request: Request, call_next):  # type: ignore[override]
        if request.method in ("POST", "PUT", "DELETE", "PATCH"):
            if not any(request.url.path.startswith(path) for path in self.EXEMPT_PATHS):
                origin = request.headers.get("origin")
                referer = request.headers.get("referer")

                allowed = False
                if origin:
                    allowed = any(origin == allowed_origin for allowed_origin in ALLOWED_ORIGINS)
                elif referer:
                    allowed = any(referer.startswith(allowed_origin) for allowed_origin in ALLOWED_ORIGINS)
                else:
                    allowed = True

                if not allowed:
                    log_audit_event(
                        "access_denied",
                        ip_address=request.client.host if request.client else None,
                        extra={"reason": "invalid_origin", "path": request.url.path, "origin": origin, "referer": referer},
                    )
                    return Response(
                        content='{"detail":"Forbidden: invalid origin"}',
                        status_code=403,
                        media_type="application/json",
                    )

        return await call_next(request)


class AuditContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):  # type: ignore[override]
        token = set_audit_ip(request.client.host if request.client else None)
        try:
            return await call_next(request)
        finally:
            reset_audit_ip(token)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    for directory in (settings.DATA_DIR, settings.UPLOAD_DIR, settings.OUTPUT_DIR, settings.TEMP_DIR):
        Path(directory).mkdir(parents=True, exist_ok=True)

    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="PDFTools API",
        version=APP_VERSION,
        lifespan=lifespan,
    )

    register_exception_handlers(app)

    # Middleware order: outermost runs first (security headers + rate limiting),
    # innermost runs last (CORS preflight handling). Starlette applies them in
    # reverse registration order, so we add CORS first.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=ALLOWED_ORIGINS,
        allow_credentials=False,
        allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Requested-With", "X-Request-ID", "X-Access-Token"],
        expose_headers=["X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset", "Retry-After"],
        max_age=600,
    )
    app.add_middleware(CSRFOriginMiddleware)
    app.add_middleware(AuditContextMiddleware)
    app.add_middleware(RateLimitMiddleware, settings=settings)
    app.add_middleware(SecurityHeadersMiddleware)

    app.include_router(pdf.router, prefix="/api/pdf", tags=["pdf"])
    app.include_router(image.router, prefix="/api/image", tags=["image"])
    app.include_router(files.router, prefix="/api/files", tags=["files"])
    app.include_router(ocr.router, prefix="/api/ocr", tags=["ocr"])
    app.include_router(convert.router, prefix="/api/convert", tags=["convert"])
    app.include_router(compress.router, prefix="/api/compress", tags=["compress"])
    app.include_router(files_tools.router, prefix="/api/file-tools", tags=["file-tools"])

    @app.get("/api/health", tags=["health"])
    async def health_check() -> dict[str, Any]:
        return {
            "status": "ok",
            "version": APP_VERSION,
            "timestamp": datetime.now(UTC).isoformat(),
        }

    return app


app = create_app()
