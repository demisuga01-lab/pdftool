"""Centralized safe error handling for the public API.

We never want to leak Python tracebacks, internal filesystem paths, or
subprocess command lines to end users. This module provides:

* ``SafeHTTPException`` -- a thin wrapper around ``HTTPException`` carrying a
  user-safe message plus an optional internal detail for the server log.
* ``sanitize_error_message`` -- strips internal path fragments and normalizes
  the message so it can be returned to the browser.
* ``register_exception_handlers`` -- attaches the handlers to FastAPI.
"""

from __future__ import annotations

import logging
import re
import uuid
from typing import Any

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)

SUPPORT_EMAIL = "support@wellfriend.online"
GENERIC_ERROR_MESSAGE = (
    "Processing failed. Please try again. If this keeps happening, "
    f"contact {SUPPORT_EMAIL} with the job/request ID."
)

# Patterns that should never be returned to the browser.
_INTERNAL_PATH_PATTERN = re.compile(
    r"(/opt/pdftool[^\s'\"]*|/var/[^\s'\"]*|"
    r"[A-Za-z]:\\\\?[^\s'\"]+|"
    r"site-packages[^\s'\"]*|venv/[^\s'\"]*|__pycache__[^\s'\"]*)"
)
_TRACEBACK_PATTERN = re.compile(r"Traceback \(most recent call last\):.*", re.DOTALL)


def sanitize_error_message(message: str | None, *, fallback: str | None = None) -> str:
    """Remove internal paths and Python traceback markers from an error message."""

    fallback_message = fallback or GENERIC_ERROR_MESSAGE
    if not message:
        return fallback_message

    text = str(message)
    text = _TRACEBACK_PATTERN.sub("", text)
    text = _INTERNAL_PATH_PATTERN.sub("[redacted]", text)
    text = re.sub(r"\s+", " ", text).strip()

    if not text or len(text) > 600:
        return fallback_message
    return text


def safe_failure_payload(
    *,
    job_id: str | None,
    error: Any,
    fallback: str | None = None,
) -> dict[str, Any]:
    """Return a JSON-safe failure payload that never leaks internals."""

    detail = error.detail if isinstance(error, HTTPException) else error
    message = sanitize_error_message(str(detail) if detail is not None else None, fallback=fallback)
    payload: dict[str, Any] = {
        "status": "failure",
        "error": message,
    }
    if job_id:
        payload["job_id"] = job_id
    return payload


def _request_id(request: Request) -> str:
    rid = request.headers.get("x-request-id")
    if rid and re.fullmatch(r"[A-Za-z0-9._-]{1,64}", rid):
        return rid
    return uuid.uuid4().hex


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(HTTPException)
    async def handle_http_exception(request: Request, exc: HTTPException) -> JSONResponse:
        request_id = _request_id(request)
        # Trust HTTPException details we explicitly raise (already user-safe), but
        # still sanitize them as a defensive measure.
        message = sanitize_error_message(str(exc.detail) if exc.detail is not None else None)
        if exc.status_code >= 500:
            logger.exception(
                "Unhandled HTTPException %s (request_id=%s) on %s %s: %s",
                exc.status_code,
                request_id,
                request.method,
                request.url.path,
                exc.detail,
            )
        else:
            logger.info(
                "HTTPException %s (request_id=%s) on %s %s: %s",
                exc.status_code,
                request_id,
                request.method,
                request.url.path,
                exc.detail,
            )
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": message, "request_id": request_id},
            headers=dict(exc.headers or {}),
        )

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
        request_id = _request_id(request)
        logger.info(
            "Validation error (request_id=%s) on %s %s: %s",
            request_id,
            request.method,
            request.url.path,
            exc.errors(),
        )
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "detail": "The request was invalid. Please review the form and try again.",
                "request_id": request_id,
            },
        )

    @app.exception_handler(Exception)
    async def handle_unexpected_exception(request: Request, exc: Exception) -> JSONResponse:
        request_id = _request_id(request)
        logger.exception(
            "Unhandled exception (request_id=%s) on %s %s",
            request_id,
            request.method,
            request.url.path,
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "detail": GENERIC_ERROR_MESSAGE,
                "request_id": request_id,
            },
        )
