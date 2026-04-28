from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import files, image, ocr, pdf
from app.core.config import get_settings

APP_VERSION = "0.1.0"


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    for directory in (settings.DATA_DIR, settings.UPLOAD_DIR, settings.OUTPUT_DIR, settings.TEMP_DIR):
        Path(directory).mkdir(parents=True, exist_ok=True)

    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="PDFTool API",
        version=APP_VERSION,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(pdf.router, prefix="/api/pdf", tags=["pdf"])
    app.include_router(image.router, prefix="/api/image", tags=["image"])
    app.include_router(files.router, prefix="/api/files", tags=["files"])
    app.include_router(ocr.router, prefix="/api/ocr", tags=["ocr"])

    @app.get("/api/health", tags=["health"])
    async def health_check() -> dict[str, Any]:
        return {
            "status": "ok",
            "version": APP_VERSION,
            "timestamp": datetime.now(UTC).isoformat(),
        }

    return app


app = create_app()
