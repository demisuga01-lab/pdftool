import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import compress, convert, files, image, ocr, pdf
from app.core.config import get_settings
from app.core.errors import register_exception_handlers
from app.core.rate_limit import RateLimitMiddleware
from app.core.security_headers import SecurityHeadersMiddleware

APP_VERSION = "1.0.0"

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
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=False,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Requested-With", "X-Request-ID"],
        expose_headers=["X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset", "Retry-After"],
        max_age=600,
    )
    app.add_middleware(RateLimitMiddleware, settings=settings)
    app.add_middleware(SecurityHeadersMiddleware)

    app.include_router(pdf.router, prefix="/api/pdf", tags=["pdf"])
    app.include_router(image.router, prefix="/api/image", tags=["image"])
    app.include_router(files.router, prefix="/api/files", tags=["files"])
    app.include_router(ocr.router, prefix="/api/ocr", tags=["ocr"])
    app.include_router(convert.router, prefix="/api/convert", tags=["convert"])
    app.include_router(compress.router, prefix="/api/compress", tags=["compress"])

    @app.get("/api/health", tags=["health"])
    async def health_check() -> dict[str, Any]:
        return {
            "status": "ok",
            "version": APP_VERSION,
            "timestamp": datetime.now(UTC).isoformat(),
        }

    return app


app = create_app()
