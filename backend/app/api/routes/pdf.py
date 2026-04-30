import asyncio
import json
import mimetypes
import zipfile
from pathlib import Path
from typing import Annotated, Any
from uuid import uuid4

from celery.result import AsyncResult
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.core.config import Settings
from app.core.dependencies import (
    get_app_settings,
    save_temp_upload,
    validate_optional_upload,
    validate_saved_upload_path,
    validate_saved_upload_paths,
    validate_upload_batch,
    validate_upload_file_size,
    validate_upload_files_size,
)
from app.services.file_store import (
    read_upload_metadata as read_stored_upload_metadata,
    resolve_upload_path,
    save_upload_file as save_workspace_upload,
)
from app.workers.celery_app import celery_app
from app.workers.pdf_tasks import (
    compress_pdf_task,
    decrypt_pdf_task,
    encrypt_pdf_task,
    extract_text_task,
    images_to_pdf_task,
    merge_pdfs_task,
    ocr_pdf_task,
    office_to_pdf_task,
    pdf_to_docx_task,
    pdf_to_excel_task,
    pdf_to_html_task,
    pdf_to_images_task,
    rotate_pdf_task,
    split_pdf_task,
    watermark_pdf_task,
)

router = APIRouter()

ValidatedUpload = Annotated[UploadFile, Depends(validate_upload_file_size)]
ValidatedUploads = Annotated[list[UploadFile], Depends(validate_upload_files_size)]
AppSettings = Annotated[Settings, Depends(get_app_settings)]


class ConvertFromIdRequest(BaseModel):
    conversion_type: str
    dpi: int = 150
    file_id: str
    format: str = "png"
    jpeg_quality: int = 82
    layout: bool = True
    output_format: str = "txt"
    transparent: bool = False


def _queued_response(job_id: str, message: str) -> dict[str, str]:
    return {"job_id": job_id, "status": "queued", "message": message}


def _safe_stem(value: str | None, fallback_stem: str) -> str:
    stem = Path(str(value or "").strip()).stem
    safe = "".join(char if char.isalnum() or char in "._-" else "-" for char in stem).strip(".-")
    fallback = "".join(char if char.isalnum() or char in "._-" else "-" for char in fallback_stem).strip(".-")
    return safe or fallback or "output"


def _output_path(settings: Settings, suffix: str, requested_name: str | None = None, fallback_stem: str = "output") -> Path:
    settings.OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    if requested_name and requested_name.strip():
        return settings.OUTPUT_DIR / f"{_safe_stem(requested_name, fallback_stem)}{suffix}"
    return settings.OUTPUT_DIR / f"{uuid4().hex}{suffix}"


def _output_dir(settings: Settings) -> Path:
    output_dir = settings.OUTPUT_DIR / uuid4().hex
    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir


async def _save_uploads(files: list[UploadFile], settings: Settings) -> list[Path]:
    validate_upload_batch(files, settings)
    return [await save_temp_upload(file, settings) for file in files]


async def _input_path_from_file_or_id(
    settings: Settings,
    file: UploadFile | None = None,
    file_id: str | None = None,
) -> Path:
    if file_id:
        path = resolve_upload_path(file_id, settings)
        validate_saved_upload_path(path, settings)
        return path
    if file is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide either file_id or file",
        )
    validate_optional_upload(file, settings)
    return await save_temp_upload(file, settings)


async def _input_paths_from_files_or_ids(
    settings: Settings,
    files: list[UploadFile] | None = None,
    file_ids: list[str] | None = None,
) -> list[Path]:
    clean_ids = [file_id for file_id in (file_ids or []) if file_id]
    if clean_ids:
        paths = [resolve_upload_path(file_id, settings) for file_id in clean_ids]
        validate_saved_upload_paths(paths, settings)
        return paths
    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide either file_ids or files",
        )
    return await _save_uploads(files, settings)


def _meta_path(file_path: Path) -> Path:
    return file_path.with_suffix(f"{file_path.suffix}.json")


async def _page_count(file_path: Path) -> int:
    process = await asyncio.create_subprocess_exec(
        "qpdf",
        "--show-npages",
        str(file_path),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await process.communicate()
    if process.returncode != 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=stderr.decode("utf-8", errors="replace").strip() or "Unable to count PDF pages",
        )
    return int(stdout.decode("utf-8", errors="replace").strip() or 0)


async def _write_upload_metadata(file_path: Path, *, filename: str, size: int, pages: int = 0) -> None:
    metadata = {
        "file_id": file_path.stem,
        "filename": filename,
        "pages": pages,
        "path": str(file_path),
        "size": size,
    }
    await asyncio.to_thread(_meta_path(file_path).write_text, json.dumps(metadata), "utf-8")


def _file_path_from_id(file_id: str, settings: Settings) -> Path:
    path = resolve_upload_path(file_id, settings)
    validate_saved_upload_path(path, settings)
    return path


def _read_upload_metadata(file_id: str, settings: Settings) -> dict[str, Any]:
    file_path = _file_path_from_id(file_id, settings)
    meta_path = _meta_path(file_path)
    if meta_path.exists():
        return json.loads(meta_path.read_text(encoding="utf-8"))
    return {
        "file_id": file_id,
        "filename": file_path.name,
        "pages": 0,
        "path": str(file_path),
        "size": file_path.stat().st_size,
    }


def _task_progress(state: str) -> int:
    return {
        "PENDING": 0,
        "RECEIVED": 10,
        "STARTED": 50,
        "RETRY": 50,
        "SUCCESS": 100,
        "FAILURE": 100,
        "REVOKED": 100,
    }.get(state, 0)


def _normalized_task_state(state: str) -> str:
    normalized = state.upper()
    if normalized in {"SUCCESS"}:
        return "success"
    if normalized in {"FAILURE", "REVOKED"}:
        return "failure"
    if normalized in {"STARTED", "RETRY", "RECEIVED"}:
        return "processing"
    return "queued"


def _task_result(job_id: str) -> AsyncResult:
    return AsyncResult(job_id, app=celery_app)


def _safe_output_path(path: str, settings: Settings) -> Path:
    candidate = Path(path).resolve(strict=False)
    output_root = settings.OUTPUT_DIR.resolve(strict=False)

    if not candidate.is_relative_to(output_root):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Task output is outside the configured output directory",
        )

    if not candidate.exists() or not candidate.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Output file not found",
        )

    return candidate


async def _zip_outputs(job_id: str, output_paths: list[str], settings: Settings, filename: str | None = None) -> Path:
    zip_path = settings.OUTPUT_DIR / (Path(filename).name if filename else f"{job_id}.zip")
    files = [_safe_output_path(path, settings) for path in output_paths]

    def write_zip() -> None:
        with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
            for file_path in files:
                archive.write(file_path, arcname=file_path.name)

    await asyncio.to_thread(write_zip)
    return zip_path


@router.post("/compress")
async def compress_pdf(
    settings: AppSettings,
    file: Annotated[UploadFile | None, File()] = None,
    file_id: Annotated[str | None, Form()] = None,
    quality: Annotated[str, Form()] = "ebook",
    color_mode: Annotated[str, Form()] = "rgb",
    compatibility_level: Annotated[str, Form()] = "1.4",
    remove_metadata: Annotated[bool, Form()] = False,
    flatten_transparency: Annotated[bool, Form()] = False,
    linearize: Annotated[bool, Form()] = True,
    force_recompress: Annotated[bool, Form()] = False,
) -> dict[str, str]:
    input_path = await _input_path_from_file_or_id(settings, file=file, file_id=file_id)
    output_path = _output_path(settings, ".pdf")
    task = compress_pdf_task.apply_async(
        args=[
            str(input_path),
            str(output_path),
            quality,
            color_mode,
            compatibility_level,
            remove_metadata,
            flatten_transparency,
            linearize,
            force_recompress,
        ],
        queue="heavy",
    )
    return _queued_response(str(task.id), "PDF compression queued")


@router.post("/merge")
async def merge_pdfs(
    settings: AppSettings,
    files: Annotated[list[UploadFile] | None, File()] = None,
    file_ids: Annotated[list[str] | None, Form()] = None,
    add_bookmarks: Annotated[bool, Form()] = True,
    metadata_title: Annotated[str, Form()] = "",
    output_filename: Annotated[str, Form()] = "",
) -> dict[str, str]:
    input_paths = await _input_paths_from_files_or_ids(settings, files=files, file_ids=file_ids)
    if len(input_paths) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least two PDFs are required to merge",
        )

    output_path = _output_path(settings, ".pdf", output_filename, "merged")
    task = merge_pdfs_task.apply_async(
        args=[[str(path) for path in input_paths], str(output_path), add_bookmarks, metadata_title],
        queue="fast",
    )
    return _queued_response(str(task.id), "PDF merge queued")


@router.post("/split")
async def split_pdf(
    settings: AppSettings,
    pages: Annotated[str, Form()],
    file: Annotated[UploadFile | None, File()] = None,
    file_id: Annotated[str | None, Form()] = None,
    naming_pattern: Annotated[str, Form()] = "page-{n}",
    output_format: Annotated[str, Form()] = "ranges",
) -> dict[str, str]:
    input_path = await _input_path_from_file_or_id(settings, file=file, file_id=file_id)
    output_dir = _output_dir(settings)
    task = split_pdf_task.apply_async(
        args=[str(input_path), str(output_dir), pages, naming_pattern, output_format],
        queue="fast",
    )
    return _queued_response(str(task.id), "PDF split queued")


@router.post("/rotate")
async def rotate_pdf(
    settings: AppSettings,
    angle: Annotated[int, Form()],
    file: Annotated[UploadFile | None, File()] = None,
    file_id: Annotated[str | None, Form()] = None,
    pages: Annotated[str, Form()] = "all",
    output_filename: Annotated[str, Form()] = "",
) -> dict[str, str]:
    input_path = await _input_path_from_file_or_id(settings, file=file, file_id=file_id)
    output_path = _output_path(settings, ".pdf", output_filename, "rotated")
    task = rotate_pdf_task.apply_async(
        args=[str(input_path), str(output_path), angle, pages],
        queue="fast",
    )
    return _queued_response(str(task.id), "PDF rotation queued")


@router.post("/watermark")
async def watermark_pdf(
    settings: AppSettings,
    file: Annotated[UploadFile | None, File()] = None,
    file_id: Annotated[str | None, Form()] = None,
    watermark_file: Annotated[UploadFile | None, File()] = None,
    uploaded_watermark_file_id: Annotated[str | None, Form()] = None,
    watermark_file_id: Annotated[str | None, Form()] = None,
    watermark_type: Annotated[str, Form()] = "text",
    text: Annotated[str, Form()] = "",
    opacity: Annotated[float, Form()] = 0.5,
    rotation: Annotated[float, Form()] = 0,
    x_percent: Annotated[float, Form()] = 50,
    y_percent: Annotated[float, Form()] = 50,
    width_percent: Annotated[float, Form()] = 25,
    font_size: Annotated[int, Form()] = 48,
    font_color: Annotated[str, Form()] = "#64748b",
    font_family: Annotated[str, Form()] = "Helvetica",
    bold: Annotated[bool, Form()] = True,
    italic: Annotated[bool, Form()] = False,
    apply_to: Annotated[str, Form()] = "all",
    selected_pages: Annotated[str, Form()] = "",
    page_range: Annotated[str, Form()] = "",
    current_page: Annotated[int, Form()] = 1,
    position_preset: Annotated[str, Form()] = "custom",
    tile: Annotated[bool, Form()] = False,
    output_filename: Annotated[str, Form()] = "",
) -> dict[str, str]:
    input_path = await _input_path_from_file_or_id(settings, file=file, file_id=file_id)
    original_name = file.filename if file is not None else input_path.name
    output_path = _output_path(settings, ".pdf", output_filename, Path(original_name).stem)
    watermark_path: Path | None = None
    asset_id = uploaded_watermark_file_id or watermark_file_id
    if asset_id:
        watermark_path = resolve_upload_path(asset_id, settings)
        validate_saved_upload_path(watermark_path, settings)
    elif watermark_file is not None:
        validate_optional_upload(watermark_file, settings)
        watermark_path = await save_temp_upload(watermark_file, settings)

    task = watermark_pdf_task.apply_async(
        args=[
            str(input_path),
            str(output_path),
            watermark_type,
            text,
            str(watermark_path) if watermark_path else None,
            opacity,
            rotation,
            x_percent,
            y_percent,
            width_percent,
            font_size,
            font_color,
            font_family,
            bold,
            italic,
            apply_to,
            selected_pages,
            page_range,
            current_page,
            position_preset,
            tile,
        ],
        queue="fast",
    )
    return _queued_response(str(task.id), "PDF watermark queued")


@router.post("/extract-text")
async def extract_text(
    settings: AppSettings,
    file: Annotated[UploadFile | None, File()] = None,
    file_id: Annotated[str | None, Form()] = None,
    layout: Annotated[bool, Form()] = True,
    output_format: Annotated[str, Form()] = "txt",
) -> dict[str, str]:
    input_path = await _input_path_from_file_or_id(settings, file=file, file_id=file_id)
    suffix = {"txt": ".txt", "html": ".html", "json": ".json"}.get(output_format.lower(), ".txt")
    output_path = _output_path(settings, suffix)
    task = extract_text_task.apply_async(args=[str(input_path), str(output_path), layout, output_format], queue="fast")
    return _queued_response(str(task.id), "Text extraction queued")


@router.post("/to-word")
async def pdf_to_word(
    settings: AppSettings,
    file: Annotated[UploadFile | None, File()] = None,
    file_id: Annotated[str | None, Form()] = None,
) -> dict[str, str]:
    input_path = await _input_path_from_file_or_id(settings, file=file, file_id=file_id)
    output_path = _output_path(settings, ".docx")
    task = pdf_to_docx_task.apply_async(args=[str(input_path), str(output_path)], queue="fast")
    return _queued_response(str(task.id), "PDF to Word conversion queued")


@router.post("/to-excel")
async def pdf_to_excel(
    settings: AppSettings,
    file: Annotated[UploadFile | None, File()] = None,
    file_id: Annotated[str | None, Form()] = None,
) -> dict[str, str]:
    input_path = await _input_path_from_file_or_id(settings, file=file, file_id=file_id)
    output_path = _output_path(settings, ".xlsx")
    task = pdf_to_excel_task.apply_async(args=[str(input_path), str(output_path)], queue="fast")
    return _queued_response(str(task.id), "PDF to Excel conversion queued")


@router.post("/to-html")
async def pdf_to_html(
    settings: AppSettings,
    file: Annotated[UploadFile | None, File()] = None,
    file_id: Annotated[str | None, Form()] = None,
) -> dict[str, str]:
    input_path = await _input_path_from_file_or_id(settings, file=file, file_id=file_id)
    output_path = _output_path(settings, ".html")
    task = pdf_to_html_task.apply_async(args=[str(input_path), str(output_path)], queue="fast")
    return _queued_response(str(task.id), "PDF to HTML conversion queued")


@router.post("/to-images")
async def pdf_to_images(
    settings: AppSettings,
    file: Annotated[UploadFile | None, File()] = None,
    file_id: Annotated[str | None, Form()] = None,
    dpi: Annotated[int, Form()] = 150,
    format: Annotated[str, Form()] = "png",
    jpeg_quality: Annotated[int, Form()] = 82,
    transparent: Annotated[bool, Form()] = False,
) -> dict[str, str]:
    input_path = await _input_path_from_file_or_id(settings, file=file, file_id=file_id)
    output_dir = _output_dir(settings)
    task = pdf_to_images_task.apply_async(
        args=[str(input_path), str(output_dir), dpi, format, jpeg_quality, transparent],
        queue="fast",
    )
    return _queued_response(str(task.id), "PDF to images conversion queued")


@router.post("/images-to-pdf")
async def images_to_pdf(
    settings: AppSettings,
    files: Annotated[list[UploadFile] | None, File()] = None,
    file_ids: Annotated[list[str] | None, Form()] = None,
    output_filename: Annotated[str, Form()] = "",
) -> dict[str, str]:
    input_paths = await _input_paths_from_files_or_ids(settings, files=files, file_ids=file_ids)
    output_path = _output_path(settings, ".pdf", output_filename, "images")
    task = images_to_pdf_task.apply_async(
        args=[[str(path) for path in input_paths], str(output_path)],
        queue="fast",
    )
    return _queued_response(str(task.id), "Images to PDF conversion queued")


@router.post("/office-to-pdf")
async def office_to_pdf(
    settings: AppSettings,
    file: Annotated[UploadFile | None, File()] = None,
    file_id: Annotated[str | None, Form()] = None,
) -> dict[str, str]:
    input_path = await _input_path_from_file_or_id(settings, file=file, file_id=file_id)
    task = office_to_pdf_task.apply_async(args=[str(input_path), str(settings.OUTPUT_DIR)], queue="heavy")
    return _queued_response(str(task.id), "Office to PDF conversion queued")


@router.post("/upload-only")
async def upload_only(file: ValidatedUpload, settings: AppSettings) -> dict[str, Any]:
    return await save_workspace_upload(file, settings)


@router.get("/file/{file_id}")
async def get_uploaded_file(file_id: str, settings: AppSettings) -> FileResponse:
    file_path = _file_path_from_id(file_id, settings)
    metadata = read_stored_upload_metadata(file_id, settings)
    return FileResponse(path=file_path, filename=str(metadata.get("original_name") or file_path.name))


@router.post("/convert-from-id")
async def convert_from_id(payload: ConvertFromIdRequest, settings: AppSettings) -> dict[str, str]:
    input_path = _file_path_from_id(payload.file_id, settings)

    if payload.conversion_type == "to-word":
        output_path = _output_path(settings, ".docx")
        task = pdf_to_docx_task.apply_async(args=[str(input_path), str(output_path)], queue="fast")
    elif payload.conversion_type == "to-excel":
        output_path = _output_path(settings, ".xlsx")
        task = pdf_to_excel_task.apply_async(args=[str(input_path), str(output_path)], queue="fast")
    elif payload.conversion_type == "to-images":
        output_dir = _output_dir(settings)
        task = pdf_to_images_task.apply_async(
            args=[str(input_path), str(output_dir), payload.dpi, payload.format, payload.jpeg_quality, payload.transparent],
            queue="fast",
        )
    elif payload.conversion_type == "to-html":
        output_path = _output_path(settings, ".html")
        task = pdf_to_html_task.apply_async(args=[str(input_path), str(output_path)], queue="fast")
    elif payload.conversion_type == "to-text":
        suffix = {"txt": ".txt", "html": ".html", "json": ".json"}.get(payload.output_format.lower(), ".txt")
        output_path = _output_path(settings, suffix)
        task = extract_text_task.apply_async(
            args=[str(input_path), str(output_path), payload.layout, payload.output_format],
            queue="fast",
        )
    elif payload.conversion_type == "office-to-pdf":
        task = office_to_pdf_task.apply_async(args=[str(input_path), str(settings.OUTPUT_DIR)], queue="heavy")
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="conversion_type must be one of: to-word, to-excel, to-images, to-html, to-text, office-to-pdf",
        )

    return _queued_response(str(task.id), "PDF conversion queued")


@router.post("/encrypt")
async def encrypt_pdf(
    settings: AppSettings,
    user_password: Annotated[str, Form()],
    file: Annotated[UploadFile | None, File()] = None,
    file_id: Annotated[str | None, Form()] = None,
    owner_password: Annotated[str, Form()] = "",
) -> dict[str, str]:
    input_path = await _input_path_from_file_or_id(settings, file=file, file_id=file_id)
    output_path = _output_path(settings, ".pdf")
    task = encrypt_pdf_task.apply_async(
        args=[str(input_path), str(output_path), user_password, owner_password],
        queue="fast",
    )
    return _queued_response(str(task.id), "PDF encryption queued")


@router.post("/decrypt")
async def decrypt_pdf(
    settings: AppSettings,
    password: Annotated[str, Form()],
    file: Annotated[UploadFile | None, File()] = None,
    file_id: Annotated[str | None, Form()] = None,
) -> dict[str, str]:
    input_path = await _input_path_from_file_or_id(settings, file=file, file_id=file_id)
    output_path = _output_path(settings, ".pdf")
    task = decrypt_pdf_task.apply_async(
        args=[str(input_path), str(output_path), password],
        queue="fast",
    )
    return _queued_response(str(task.id), "PDF decryption queued")


@router.post("/ocr")
async def ocr_pdf(
    settings: AppSettings,
    file: Annotated[UploadFile | None, File()] = None,
    file_id: Annotated[str | None, Form()] = None,
    language: Annotated[str, Form()] = "eng",
    output_format: Annotated[str, Form()] = "txt",
    dpi: Annotated[int, Form()] = 300,
) -> dict[str, str]:
    input_path = await _input_path_from_file_or_id(settings, file=file, file_id=file_id)
    output_dir = _output_dir(settings)
    task = ocr_pdf_task.apply_async(
        args=[str(input_path), str(output_dir), language, output_format, dpi],
        queue="heavy",
    )
    return _queued_response(str(task.id), "PDF OCR queued")


@router.get("/status/{job_id}")
async def get_status(job_id: str) -> dict[str, Any]:
    task = _task_result(job_id)
    response: dict[str, Any] = {
        "job_id": job_id,
        "status": _normalized_task_state(task.state),
        "stage": "queued" if _normalized_task_state(task.state) == "queued" else "processing",
        "progress": _task_progress(task.state),
    }

    if task.successful():
        result = task.result or {}
        if isinstance(result, dict):
            response["status"] = "failure" if result.get("status") in {"failure", "failed"} else "success"
            response["stage"] = result.get("stage", "finalizing")
            response["progress"] = result.get("progress", 100)
            response["output_path"] = result.get("output_path")
            response["output_paths"] = result.get("output_paths")
            response["output_filename"] = result.get("output_filename")
            response["media_type"] = result.get("media_type")
            response["extension"] = result.get("extension")
            response["result"] = result.get("result")
            if "original_size" in result or "original_size_bytes" in result:
                response["result"] = {
                    "optimized": result.get("optimized"),
                    "message": result.get("message"),
                    "method": result.get("method"),
                    "output_filename": result.get("output_filename"),
                    "original_size": result.get("original_size", result.get("original_size_bytes")),
                    "output_size": result.get("output_size", result.get("compressed_size_bytes")),
                    "target_size_bytes": result.get("target_size_bytes"),
                    "reached_target": result.get("reached_target"),
                    "saved_bytes": result.get("saved_bytes"),
                    "saved_percent": result.get("saved_percent", result.get("reduction_percent")),
                    "original_size_bytes": result.get("original_size_bytes"),
                    "compressed_size_bytes": result.get("compressed_size_bytes"),
                    "reduction_percent": result.get("reduction_percent"),
                }
            from app.core.errors import sanitize_error_message

            raw_error = result.get("error")
            response["error"] = sanitize_error_message(str(raw_error)) if raw_error else None
    elif task.failed():
        from app.core.errors import sanitize_error_message

        response["status"] = "failure"
        response["stage"] = "processing"
        response["error"] = sanitize_error_message(str(task.result) if task.result else None)

    return response


@router.get("/download/{job_id}")
async def download_output(job_id: str, settings: AppSettings) -> FileResponse:
    task = _task_result(job_id)

    if not task.ready():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Task is not complete yet",
        )

    if task.failed():
        from app.core.errors import sanitize_error_message

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=sanitize_error_message(str(task.result) if task.result else None),
        )

    result = task.result or {}
    if not isinstance(result, dict) or result.get("status") == "failed":
        from app.core.errors import sanitize_error_message

        raw = result.get("error") if isinstance(result, dict) else None
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=sanitize_error_message(str(raw) if raw is not None else None),
        )

    output_path = result.get("output_path")
    output_paths = result.get("output_paths")
    output_filename = str(result.get("output_filename") or "").strip() or None
    media_type = str(result.get("media_type") or "").strip() or None

    if output_path:
        file_path = _safe_output_path(str(output_path), settings)
    elif isinstance(output_paths, list) and output_paths:
        file_path = await _zip_outputs(job_id, [str(path) for path in output_paths], settings, output_filename)
    else:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Output file not found. The job may have failed or expired.",
        )

    return FileResponse(
        path=file_path,
        media_type=media_type or mimetypes.guess_type(file_path.name)[0] or "application/octet-stream",
        filename=output_filename or file_path.name,
        headers={"Cache-Control": "no-store"},
    )
