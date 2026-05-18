from __future__ import annotations

import asyncio
import logging
from contextlib import suppress
from dataclasses import dataclass
from pathlib import Path

from fastapi import HTTPException, status

logger = logging.getLogger(__name__)

REDACTED = "<redacted>"
PASSWORD_VALUE_FLAGS = {"--password", "-p"}


@dataclass(frozen=True)
class CommandResult:
    stdout: str
    stderr: str
    returncode: int


def _command_name(command: list[str]) -> str:
    return Path(str(command[0])).name if command else "command"


def redact_command(command: list[str]) -> list[str]:
    redacted: list[str] = []
    redact_next = 0

    for index, arg in enumerate(command):
        text = str(arg)

        if redact_next > 0:
            redacted.append(REDACTED)
            redact_next -= 1
            continue

        if text == "--encrypt" and index > 0 and Path(str(command[0])).name.lower().startswith("qpdf"):
            redacted.append(text)
            redact_next = 2
            continue

        if text in PASSWORD_VALUE_FLAGS:
            redacted.append(text)
            redact_next = 1
            continue

        if text.startswith("--password="):
            redacted.append("--password=" + REDACTED)
            continue

        redacted.append(text)

    return redacted


async def run_command_result(
    command: list[str],
    *,
    check: bool = True,
    failure_status: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
    timeout_seconds: int = 120,
    timeout_status: int = status.HTTP_504_GATEWAY_TIMEOUT,
    timeout_detail: str | None = None,
    log_prefix: str = "Running command",
) -> CommandResult:
    command_label = _command_name(command)
    logger.info("%s (timeout=%ss): %s", log_prefix, timeout_seconds, " ".join(redact_command(command)))

    try:
        process = await asyncio.create_subprocess_exec(
            *command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Required command not found: {command_label}",
        ) from exc
    except OSError as exc:
        raise HTTPException(
            status_code=failure_status,
            detail=f"Failed to run command: {command_label}",
        ) from exc

    communicate_task = asyncio.create_task(process.communicate())
    try:
        stdout, stderr = await asyncio.wait_for(asyncio.shield(communicate_task), timeout=timeout_seconds)
    except asyncio.TimeoutError as exc:
        with suppress(ProcessLookupError):
            process.kill()
        with suppress(Exception):
            await asyncio.wait_for(communicate_task, timeout=5)
        logger.warning("Command timed out after %s seconds: %s", timeout_seconds, command_label)
        raise HTTPException(
            status_code=timeout_status,
            detail=timeout_detail or f"{command_label} took too long to finish.",
        ) from exc

    stdout_text = stdout.decode("utf-8", errors="replace")
    stderr_text = stderr.decode("utf-8", errors="replace")

    result = CommandResult(stdout=stdout_text, stderr=stderr_text, returncode=int(process.returncode or 0))

    if check and result.returncode != 0:
        detail = stderr_text.strip() or stdout_text.strip() or f"{command_label} exited with code {process.returncode}"
        raise HTTPException(status_code=failure_status, detail=detail)

    return result


async def run_command(
    command: list[str],
    *,
    failure_status: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
    timeout_seconds: int = 120,
    timeout_status: int = status.HTTP_504_GATEWAY_TIMEOUT,
    timeout_detail: str | None = None,
    log_prefix: str = "Running command",
) -> tuple[str, str]:
    result = await run_command_result(
        command,
        failure_status=failure_status,
        timeout_seconds=timeout_seconds,
        timeout_status=timeout_status,
        timeout_detail=timeout_detail,
        log_prefix=log_prefix,
    )
    stdout_text = result.stdout
    stderr_text = result.stderr
    return stdout_text, stderr_text
