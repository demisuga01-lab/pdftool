import asyncio
import csv
import json
import logging
import os
import re
import shutil
import tempfile
import uuid
from pathlib import Path
from typing import Any, Literal

from fastapi import HTTPException, status

from app.services.command_runner import run_command, run_command_result
from app.services.output_naming import ensure_job_prefix, job_id_from_output_dir, safe_output_name

logger = logging.getLogger(__name__)

PdfQuality = Literal["screen", "ebook", "printer", "prepress"]
ImageFormat = Literal["png", "jpg", "jpeg", "pam", "pbm", "pgm", "ppm", "pnm"]
ColorMode = Literal["rgb", "cmyk", "gray"]
CompatibilityLevel = Literal["1.4", "1.5", "1.6", "1.7"]
SplitMode = Literal["split_all", "extract_selected", "split_selected", "custom_ranges", "reorder_export"]
PDF_COMMAND_TIMEOUT_SECONDS = 180
MAX_PUBLIC_DPI = 300
SAFE_SPLIT_NAME_MAX_LENGTH = 120
SPLIT_MODES: set[str] = {"split_all", "extract_selected", "split_selected", "custom_ranges", "reorder_export"}
RESERVED_WINDOWS_NAMES = {
    "CON",
    "PRN",
    "AUX",
    "NUL",
    *(f"COM{index}" for index in range(1, 10)),
    *(f"LPT{index}" for index in range(1, 10)),
}


def _write_password_file(password: str) -> str:
    """Write password to a temp file. Caller must delete it."""
    fd, path = tempfile.mkstemp(prefix="qpdf_pw_", suffix=".txt")
    try:
        os.write(fd, password.encode())
    finally:
        os.close(fd)
    os.chmod(path, 0o600)
    return path


def _write_qpdf_args_file(args: list[str]) -> str:
    fd, path = tempfile.mkstemp(prefix="qpdf_args_", suffix=".txt")
    try:
        for arg in args:
            os.write(fd, f"{arg}\n".encode())
    finally:
        os.close(fd)
    os.chmod(path, 0o600)
    return path


def _safe_output_name(job_id: str, original_name: str) -> str:
    """
    Create a safe output filename prefixed with job_id.
    Strips path separators and dangerous characters.
    """
    return safe_output_name(job_id, original_name)


def _clamp_dpi(dpi: int | None, default: int = 150) -> int:
    if dpi is None:
        return default
    return max(72, min(int(dpi), MAX_PUBLIC_DPI))


class PDFService:
    async def _run_command(
        self,
        command: list[str],
        *,
        failure_status: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        timeout_seconds: int = PDF_COMMAND_TIMEOUT_SECONDS,
    ) -> None:
        await run_command(
            command,
            failure_status=failure_status,
            timeout_seconds=timeout_seconds,
            timeout_detail="PDF processing took too long to finish.",
        )

    async def _run_command_output(
        self,
        command: list[str],
        *,
        failure_status: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        timeout_seconds: int = PDF_COMMAND_TIMEOUT_SECONDS,
    ) -> tuple[str, str]:
        return await run_command(
            command,
            failure_status=failure_status,
            timeout_seconds=timeout_seconds,
            timeout_detail="PDF processing took too long to finish.",
        )

    def _ensure_parent(self, output_path: str | Path) -> Path:
        path = Path(output_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        return path

    def _validate_split_naming_template(self, pattern: str) -> str:
        template = (pattern or "page-{n}").strip()
        if not template:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Split output naming pattern cannot be empty.",
            )
        if len(template) > SAFE_SPLIT_NAME_MAX_LENGTH:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Split output naming pattern is too long.",
            )
        if any(ord(char) < 32 or ord(char) == 127 for char in template) or "\x00" in template:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Split output naming pattern contains unsafe characters.",
            )
        if any(char in template for char in '/\\<>:"|?*'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Split output naming pattern must be a filename, not a path.",
            )
        if ".." in template:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Split output naming pattern cannot contain '..'.",
            )

        placeholder_stripped = template.replace("{n}", "").replace("{original}", "").replace("{range}", "")
        if "{" in placeholder_stripped or "}" in placeholder_stripped:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Split output naming pattern only supports {n}, {range}, and {original}.",
            )
        return template

    def _sanitize_split_output_stem(self, stem: str) -> str:
        if any(char in stem for char in '/\\<>:"|?*') or ".." in stem or "\x00" in stem:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Split output filename contains unsafe characters.",
            )
        safe = "".join(
            char
            for char in stem
            if char.isalnum() or char in {" ", "-", "_", ".", "(", ")"}
        ).strip(" .")
        if not safe:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Split output filename cannot be empty.",
            )
        if safe.upper() in RESERVED_WINDOWS_NAMES:
            safe = f"{safe}-file"
        return safe[:SAFE_SPLIT_NAME_MAX_LENGTH].rstrip(" .") or "page"

    def _safe_split_output_path(self, output_directory: Path, output_name: str) -> Path:
        root = output_directory.resolve(strict=False)
        candidate = (output_directory / f"{output_name}.pdf").resolve(strict=False)
        if not candidate.is_relative_to(root):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Split output filename is outside the job output directory.",
            )
        return candidate

    async def _strip_pdf_metadata(self, path: Path) -> Path:
        sanitized_path = path.with_name(f"{path.stem}-sanitized{path.suffix}")

        def write() -> None:
            from pypdf import PdfReader, PdfWriter

            reader = PdfReader(str(path))
            writer = PdfWriter()
            for page in reader.pages:
                writer.add_page(page)
            writer.add_metadata({})
            with sanitized_path.open("wb") as output_file:
                writer.write(output_file)

        await asyncio.to_thread(write)
        sanitized_path.replace(path)
        return path

    async def _linearize_pdf(self, path: Path) -> Path:
        linearized_path = path.with_name(f"{path.stem}-linearized{path.suffix}")
        await self._run_command(["qpdf", "--linearize", str(path), str(linearized_path)])
        linearized_path.replace(path)
        return path

    async def _set_pdf_title(self, path: Path, title: str) -> Path:
        if not title.strip():
            return path

        titled_path = path.with_name(f"{path.stem}-title{path.suffix}")
        command = [
            "gs",
            "-dBATCH",
            "-dNOPAUSE",
            "-sDEVICE=pdfwrite",
            f"-sTitle={title}",
            f"-sOutputFile={titled_path}",
            str(path),
        ]
        await self._run_command(command)
        titled_path.replace(path)
        return path

    def _format_output_name(self, pattern: str, original_stem: str, index: int, range_label: str = "") -> str:
        template = self._validate_split_naming_template(pattern)
        output_name = (
            template
            .replace("{n}", str(index))
            .replace("{range}", range_label or str(index))
            .replace("{original}", original_stem)
        )
        return self._sanitize_split_output_stem(output_name)

    def _safe_split_output_filename(self, requested_name: str, fallback_stem: str, suffix: str) -> str:
        requested_stem = Path(str(requested_name or "").strip()).stem
        stem = self._sanitize_split_output_stem(requested_stem or fallback_stem)
        return f"{stem}{suffix}"

    async def _pdf_page_count(self, input_path: str | Path) -> int:
        stdout, _ = await self._run_command_output(
            ["qpdf", "--show-npages", str(input_path)],
            failure_status=status.HTTP_400_BAD_REQUEST,
            timeout_seconds=15,
        )
        try:
            page_count = int(stdout.strip() or 0)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to read PDF page count.",
            ) from exc
        if page_count < 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="PDF must contain at least one page.",
            )
        return page_count

    def _normalize_split_mode(self, mode: str | None, pages: str, output_format: str) -> SplitMode:
        normalized = (mode or "").strip().lower()
        if not normalized:
            normalized = "split_all" if pages.strip().lower() == "all" or output_format == "individual" else "custom_ranges"
        if normalized not in SPLIT_MODES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="mode must be one of: split_all, extract_selected, split_selected, custom_ranges, reorder_export",
            )
        return normalized  # type: ignore[return-value]

    def _validate_page_numbers(
        self,
        values: list[Any],
        page_count: int,
        field_name: str,
        *,
        allow_duplicates: bool = False,
        dedupe: bool = True,
    ) -> list[int]:
        pages: list[int] = []
        seen: set[int] = set()
        for value in values:
            if isinstance(value, bool):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"{field_name} must contain page numbers.")
            try:
                page = int(value)
            except (TypeError, ValueError) as exc:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"{field_name} must contain page numbers.") from exc
            if str(value).strip() != str(page):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"{field_name} must contain integer page numbers.")
            if page < 1 or page > page_count:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"{field_name} pages must be between 1 and {page_count}.",
                )
            if page in seen:
                if allow_duplicates:
                    pages.append(page)
                elif not dedupe:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"{field_name} cannot contain duplicate pages.",
                    )
                continue
            seen.add(page)
            pages.append(page)
        return pages

    def _range_tokens_for_split(self, ranges: str, page_count: int) -> list[str]:
        tokens = [token.strip() for token in ranges.split(",") if token.strip()]
        if not tokens:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="At least one page range is required.")
        for token in tokens:
            if not re.fullmatch(r"\d+(?:-\d+)?", token):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Page ranges must look like 1, 3-5, 8.")
            start_text, end_text = token.split("-", 1) if "-" in token else (token, token)
            start = int(start_text)
            end = int(end_text)
            if start < 1 or end < 1:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Page ranges cannot include page 0 or negative pages.")
            if end < start:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Page ranges must start before they end.")
            if end > page_count:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Page ranges must be between 1 and {page_count}.")
        return tokens

    def _expand_split_ranges(self, tokens: list[str]) -> list[int]:
        pages: list[int] = []
        for token in tokens:
            if "-" not in token:
                pages.append(int(token))
                continue
            start_text, end_text = token.split("-", 1)
            pages.extend(range(int(start_text), int(end_text) + 1))
        return pages

    def _parse_page_selection(
        self,
        value: str,
        page_count: int,
        field_name: str,
        *,
        required: bool = True,
        dedupe: bool = True,
    ) -> list[int]:
        raw = (value or "").strip()
        if not raw or raw.lower() == "all":
            if required:
                if field_name == "page_order":
                    detail = "Restore at least one page before processing."
                elif field_name == "pages":
                    detail = "Select at least one page for this mode."
                else:
                    detail = f"{field_name} is required."
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)
            return []
        if raw.startswith("["):
            try:
                parsed = json.loads(raw)
            except json.JSONDecodeError as exc:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"{field_name} must be valid JSON.") from exc
            if not isinstance(parsed, list):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"{field_name} must be a JSON array.")
            return self._validate_page_numbers(parsed, page_count, field_name, dedupe=dedupe)
        tokens = self._range_tokens_for_split(raw, page_count)
        return self._validate_page_numbers(self._expand_split_ranges(tokens), page_count, field_name, dedupe=dedupe)

    def _qpdf_page_selection(self, pages: list[int]) -> str:
        return ",".join(str(page) for page in pages)

    def _split_range_label(self, selection: str) -> str:
        return self._sanitize_split_output_stem(selection.replace(",", "-").replace(" ", ""))

    async def _write_pdf_selection(
        self,
        input_path: str | Path,
        output_path: Path,
        pages: list[int],
    ) -> str:
        if not pages:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="At least one page is required.")
        await self._run_command(["qpdf", str(input_path), "--pages", ".", self._qpdf_page_selection(pages), "--", str(output_path)])
        return str(output_path)

    def _normalize_ocr_output_format(self, output_format: str) -> str:
        normalized = output_format.lower().strip()
        aliases = {"text": "txt", "searchable_pdf": "pdf"}
        normalized = aliases.get(normalized, normalized)

        if normalized not in {"txt", "pdf", "json", "docx", "hocr", "html"}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="output_format must be one of: txt, pdf, json, docx, hocr, html",
            )

        return normalized

    def _parse_tsv_page(self, tsv_content: str, fallback_page_number: int) -> dict[str, object]:
        reader = csv.DictReader(tsv_content.splitlines(), delimiter="\t")
        words: list[dict[str, object]] = []

        for row in reader:
            text = (row.get("text") or "").strip()
            if row.get("level") != "5" or not text:
                continue

            words.append(
                {
                    "text": text,
                    "confidence": float(row.get("conf") or -1),
                    "left": int(row.get("left") or 0),
                    "top": int(row.get("top") or 0),
                    "width": int(row.get("width") or 0),
                    "height": int(row.get("height") or 0),
                    "block_num": int(row.get("block_num") or 0),
                    "par_num": int(row.get("par_num") or 0),
                    "line_num": int(row.get("line_num") or 0),
                    "word_num": int(row.get("word_num") or 0),
                }
            )

        return {
            "page": fallback_page_number,
            "words": words,
        }

    async def _extract_text_content(self, input_path: str | Path, layout: bool = True) -> str:
        command = ["pdftotext"]
        if layout:
            command.append("-layout")
        command.extend([str(input_path), "-"])
        stdout, _ = await self._run_command_output(command)
        return stdout

    async def _write_docx(self, text: str, output_path: str | Path) -> str:
        output = self._ensure_parent(output_path)

        def write() -> None:
            from docx import Document

            document = Document()
            paragraphs = text.splitlines() or [text]
            for paragraph in paragraphs:
                document.add_paragraph(paragraph)
            document.save(output)

        await asyncio.to_thread(write)
        return str(output)

    async def _write_json(self, payload: dict[str, object], output_path: str | Path) -> str:
        output = self._ensure_parent(output_path)
        await asyncio.to_thread(output.write_text, json.dumps(payload, indent=2), "utf-8")
        return str(output)

    def _split_page_tokens(self, pages: str) -> list[str]:
        tokens = [token.strip() for token in pages.split(",") if token.strip()]

        if not tokens:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one page selection is required",
            )

        for token in tokens:
            if not re.fullmatch(r"\d+(?:-\d+)?", token):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Page ranges must look like 1, 3-5, 8",
                )

        return tokens

    def _expand_page_tokens(self, tokens: list[str]) -> list[str]:
        pages: list[str] = []

        for token in tokens:
            if "-" not in token:
                pages.append(token)
                continue

            start_text, end_text = token.split("-", 1)
            start = int(start_text)
            end = int(end_text)
            if end < start:
                start, end = end, start
            pages.extend(str(page) for page in range(start, end + 1))

        return pages

    async def compress_pdf(
        self,
        input_path: str | Path,
        output_path: str | Path,
        quality: PdfQuality = "ebook",
        color_mode: ColorMode = "rgb",
        compatibility_level: CompatibilityLevel = "1.4",
        remove_metadata: bool = False,
        flatten_transparency: bool = False,
        linearize: bool = True,
        force_recompress: bool = False,
    ) -> dict[str, str | int | float]:
        if quality not in {"screen", "ebook", "printer", "prepress"}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="quality must be one of: screen, ebook, printer, prepress",
            )
        if color_mode not in {"rgb", "cmyk", "gray"}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="color_mode must be one of: rgb, cmyk, gray",
            )
        if compatibility_level not in {"1.4", "1.5", "1.6", "1.7"}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="compatibility_level must be one of: 1.4, 1.5, 1.6, 1.7",
            )

        input_file = Path(input_path)
        output = self._ensure_parent(output_path)
        color_strategy = {
            "rgb": ("RGB", "DeviceRGB"),
            "cmyk": ("CMYK", "DeviceCMYK"),
            "gray": ("Gray", "DeviceGray"),
        }[color_mode]
        command = [
            "gs",
            "-dBATCH",
            "-dNOPAUSE",
            "-sDEVICE=pdfwrite",
            f"-dPDFSETTINGS=/{quality}",
            f"-dCompatibilityLevel={compatibility_level}",
            f"-sColorConversionStrategy={color_strategy[0]}",
            f"-sProcessColorModel={color_strategy[1]}",
            "-dColorImageDownsampleType=/Bicubic",
            "-dColorImageResolution=150",
            "-dGrayImageResolution=150",
            "-dMonoImageResolution=300",
            f"-sOutputFile={output}",
            str(input_file),
        ]
        if flatten_transparency:
            command.insert(-2, "-dNOTRANSPARENCY")
        await self._run_command(command)

        if remove_metadata:
            await self._strip_pdf_metadata(output)
        if linearize:
            await self._linearize_pdf(output)

        original_size = input_file.stat().st_size
        output_size = output.stat().st_size
        optimized = output_size < original_size
        message = None

        if output_size >= original_size and not force_recompress:
            shutil.copy2(input_file, output)
            output_size = output.stat().st_size
            optimized = False
            message = "Original PDF was already smaller; kept original to avoid increasing size."

        saved_bytes = max(original_size - output_size, 0)
        saved_percent = round((saved_bytes / original_size) * 100, 2) if original_size else 0.0

        return {
            "output_path": str(output),
            "optimized": optimized,
            "message": message,
            "original_size": original_size,
            "output_size": output_size,
            "saved_bytes": saved_bytes,
            "saved_percent": saved_percent,
            "original_size_bytes": original_size,
            "compressed_size_bytes": output_size,
            "reduction_percent": saved_percent,
        }

    async def merge_pdfs(
        self,
        input_paths: list[str | Path],
        output_path: str | Path,
        add_bookmarks: bool = True,
        metadata_title: str = "",
    ) -> str:
        if len(input_paths) < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least two PDFs are required to merge",
            )

        output = self._ensure_parent(output_path)
        if add_bookmarks:
            primary_input = str(input_paths[0])
            command = ["qpdf", primary_input, "--pages", *[str(path) for path in input_paths], "--", str(output)]
        else:
            command = ["qpdf", "--empty", "--pages", *[str(path) for path in input_paths], "--", str(output)]
        await self._run_command(command)
        await self._set_pdf_title(output, metadata_title)
        return str(output)

    async def split_pdf(
        self,
        input_path: str | Path,
        output_dir: str | Path,
        pages: str = "",
        naming_pattern: str = "page-{n}",
        output_format: str = "ranges",
        mode: str | None = None,
        page_order: str = "",
        ranges: str = "",
        output_filename: str = "",
    ) -> dict[str, Any]:
        output_directory = Path(output_dir)
        output_directory.mkdir(parents=True, exist_ok=True)
        job_id = job_id_from_output_dir(output_directory)
        input_stem = Path(input_path).stem
        page_count = await self._pdf_page_count(input_path)
        normalized_mode = self._normalize_split_mode(mode, pages, output_format)

        if normalized_mode == "split_all":
            selected_pages = self._parse_page_selection(pages, page_count, "pages", required=False) or list(range(1, page_count + 1))
            outputs: list[str] = []
            for index, page in enumerate(selected_pages, start=1):
                range_label = str(page)
                output_name = self._format_output_name(naming_pattern, input_stem, index, range_label)
                output_name = Path(ensure_job_prefix(job_id, f"{output_name}.pdf")).stem
                output = self._safe_split_output_path(output_directory, output_name)
                await self._write_pdf_selection(input_path, output, [page])
                outputs.append(str(output))
            return {
                "output_paths": outputs,
                "output_filename": _safe_output_name(job_id, self._safe_split_output_filename(output_filename, f"{input_stem}-split-pages", ".zip")),
                "result": {
                    "mode": normalized_mode,
                    "output_type": "zip",
                    "file_count": len(outputs),
                    "page_count": page_count,
                    "active_page_count": len(selected_pages),
                    "selected_page_count": len(selected_pages),
                },
            }

        if normalized_mode == "split_selected":
            selected_pages = self._parse_page_selection(pages, page_count, "pages")
            outputs = []
            for index, page in enumerate(selected_pages, start=1):
                range_label = str(page)
                output_name = self._format_output_name(naming_pattern, input_stem, index, range_label)
                output_name = Path(ensure_job_prefix(job_id, f"{output_name}.pdf")).stem
                output = self._safe_split_output_path(output_directory, output_name)
                await self._write_pdf_selection(input_path, output, [page])
                outputs.append(str(output))
            return {
                "output_paths": outputs,
                "output_filename": _safe_output_name(job_id, self._safe_split_output_filename(output_filename, f"{input_stem}-selected-pages", ".zip")),
                "result": {
                    "mode": normalized_mode,
                    "output_type": "zip",
                    "file_count": len(outputs),
                    "page_count": page_count,
                    "active_page_count": len(selected_pages),
                    "selected_page_count": len(selected_pages),
                },
            }

        if normalized_mode == "extract_selected":
            selected_pages = self._parse_page_selection(pages, page_count, "pages")
            output_name = self._safe_split_output_filename(output_filename, f"{input_stem}-selected", ".pdf")
            output = self._safe_split_output_path(output_directory, Path(_safe_output_name(job_id, output_name)).stem)
            await self._write_pdf_selection(input_path, output, selected_pages)
            return {
                "output_path": str(output),
                "result": {
                    "mode": normalized_mode,
                    "output_type": "pdf",
                    "file_count": 1,
                    "page_count": page_count,
                    "active_page_count": len(selected_pages),
                    "selected_page_count": len(selected_pages),
                },
            }

        if normalized_mode == "reorder_export":
            ordered_pages = self._parse_page_selection(page_order or pages, page_count, "page_order", dedupe=False)
            output_name = self._safe_split_output_filename(output_filename, f"{input_stem}-organized", ".pdf")
            output = self._safe_split_output_path(output_directory, Path(_safe_output_name(job_id, output_name)).stem)
            await self._write_pdf_selection(input_path, output, ordered_pages)
            return {
                "output_path": str(output),
                "result": {
                    "mode": normalized_mode,
                    "output_type": "pdf",
                    "file_count": 1,
                    "page_count": page_count,
                    "active_page_count": len(ordered_pages),
                    "selected_page_count": len(ordered_pages),
                },
            }

        range_text = ranges or pages
        tokens = self._range_tokens_for_split(range_text, page_count)
        selections = tokens if output_format == "ranges" else [str(page) for page in self._expand_split_ranges(tokens)]
        outputs = []
        for index, selection in enumerate(selections, start=1):
            selection_pages = self._validate_page_numbers(self._expand_split_ranges([selection]), page_count, "ranges")
            range_label = self._split_range_label(selection)
            output_name = self._format_output_name(naming_pattern, input_stem, index, range_label)
            output_name = Path(ensure_job_prefix(job_id, f"{output_name}.pdf")).stem
            output = self._safe_split_output_path(output_directory, output_name)
            await self._write_pdf_selection(input_path, output, selection_pages)
            outputs.append(str(output))

        expanded_pages = self._expand_split_ranges(tokens)
        result = {
            "mode": normalized_mode,
            "output_type": "pdf" if len(outputs) == 1 else "zip",
            "file_count": len(outputs),
            "page_count": page_count,
            "active_page_count": len(expanded_pages),
            "selected_page_count": len(expanded_pages),
        }
        if len(outputs) == 1:
            return {
                "output_path": outputs[0],
                "output_filename": _safe_output_name(job_id, self._safe_split_output_filename(output_filename, f"{input_stem}-range", ".pdf")),
                "result": result,
            }
        return {
            "output_paths": outputs,
            "output_filename": _safe_output_name(job_id, self._safe_split_output_filename(output_filename, f"{input_stem}-ranges", ".zip")),
            "result": result,
        }

    async def rotate_pdf(
        self,
        input_path: str | Path,
        output_path: str | Path,
        angle: int,
        pages: str = "all",
    ) -> str:
        normalized_angle = angle % 360
        if normalized_angle not in {0, 90, 180, 270}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="angle must be one of: 0, 90, 180, 270",
            )

        output = self._ensure_parent(output_path)
        selected_pages: set[int] = set()
        if str(pages).strip().lower() != "all":
            selected_pages = {int(value) for value in self._expand_page_tokens(self._split_page_tokens(pages))}

        def write_rotated() -> None:
            from pypdf import PdfReader, PdfWriter

            reader = PdfReader(str(input_path))
            writer = PdfWriter()
            total_pages = len(reader.pages)

            if selected_pages and any(page < 1 or page > total_pages for page in selected_pages):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Selected pages must be between 1 and {total_pages}",
                )

            for page_number, page in enumerate(reader.pages, start=1):
                if not selected_pages or page_number in selected_pages:
                    page.rotate(normalized_angle)
                writer.add_page(page)

            with output.open("wb") as target:
                writer.write(target)

        await asyncio.to_thread(write_rotated)
        return str(output)

    def _watermark_selected_pages(
        self,
        total_pages: int,
        apply_to: str,
        selected_pages: str,
        page_range: str,
        current_page: int,
    ) -> set[int]:
        normalized = (apply_to or "all").strip().lower()
        if normalized == "all":
            return set(range(1, total_pages + 1))
        if normalized == "current":
            return {max(1, min(total_pages, current_page))}
        if normalized == "selected":
            tokens = self._split_page_tokens(selected_pages or "")
            return {int(page) for page in self._expand_page_tokens(tokens) if 1 <= int(page) <= total_pages}
        if normalized == "range":
            tokens = self._split_page_tokens(page_range or "")
            return {int(page) for page in self._expand_page_tokens(tokens) if 1 <= int(page) <= total_pages}
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="apply_to must be one of: all, current, selected, range",
        )

    async def watermark_pdf(
        self,
        input_path: str | Path,
        output_path: str | Path,
        watermark_type: str = "text",
        text: str = "",
        watermark_image_path: str | None = None,
        opacity: float = 0.5,
        rotation: float = 0,
        x_percent: float = 50,
        y_percent: float = 50,
        width_percent: float = 25,
        font_size: int = 48,
        font_color: str = "#64748b",
        font_family: str = "Helvetica",
        bold: bool = True,
        italic: bool = False,
        apply_to: str = "all",
        selected_pages: str = "",
        page_range: str = "",
        current_page: int = 1,
        position_preset: str = "custom",
        tile: bool = False,
    ) -> str:
        normalized_type = (watermark_type or "text").strip().lower()
        if normalized_type not in {"text", "image"}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="watermark_type must be text or image",
            )
        if normalized_type == "text" and not text.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="text is required",
            )
        if normalized_type == "image" and not watermark_image_path:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="uploaded_watermark_file_id or watermark_file is required",
            )
        if opacity < 0 or opacity > 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="opacity must be between 0 and 1",
            )

        output = self._ensure_parent(output_path)

        # ReportLab/PIL cannot read SVG natively. If the watermark is SVG (or
        # something else PIL refuses), rasterize it to a temporary PNG first.
        _resolved_watermark: Path | None = None
        _temp_watermark: Path | None = None
        if normalized_type == "image" and watermark_image_path:
            from app.services.svg_rasterizer import is_svg, rasterize_svg_to_png

            source = Path(str(watermark_image_path))
            if is_svg(source):
                _temp_watermark = source.with_name(f"{source.stem}-rasterized.png")
                _resolved_watermark = rasterize_svg_to_png(source, _temp_watermark, width=2048)
            else:
                _resolved_watermark = source

        def write_watermarked() -> None:
            from io import BytesIO

            from pypdf import PdfReader, PdfWriter
            from reportlab.lib.colors import Color
            from reportlab.lib.utils import ImageReader
            from reportlab.pdfgen import canvas

            reader = PdfReader(str(input_path))
            writer = PdfWriter()
            total_pages = len(reader.pages)
            selected = self._watermark_selected_pages(total_pages, apply_to, selected_pages, page_range, current_page)
            use_tile = tile or position_preset == "tiled"

            def parse_color(value: str) -> Color:
                normalized = (value or "#64748b").strip()
                if normalized.startswith("#") and len(normalized) == 7:
                    red = int(normalized[1:3], 16) / 255
                    green = int(normalized[3:5], 16) / 255
                    blue = int(normalized[5:7], 16) / 255
                    return Color(red, green, blue, alpha=opacity)
                return Color(0.39, 0.45, 0.55, alpha=opacity)

            def reportlab_font() -> str:
                family = font_family if font_family in {"Helvetica", "Times-Roman", "Courier"} else "Helvetica"
                if family == "Helvetica":
                    if bold and italic:
                        return "Helvetica-BoldOblique"
                    if bold:
                        return "Helvetica-Bold"
                    if italic:
                        return "Helvetica-Oblique"
                    return "Helvetica"
                if family == "Times-Roman":
                    if bold and italic:
                        return "Times-BoldItalic"
                    if bold:
                        return "Times-Bold"
                    if italic:
                        return "Times-Italic"
                    return "Times-Roman"
                return "Courier-BoldOblique" if bold and italic else "Courier-Bold" if bold else "Courier-Oblique" if italic else "Courier"

            def overlay_for_page(page_width: float, page_height: float) -> PdfReader:
                packet = BytesIO()
                overlay = canvas.Canvas(packet, pagesize=(page_width, page_height))
                overlay.saveState()
                if hasattr(overlay, "setFillAlpha"):
                    overlay.setFillAlpha(opacity)
                if hasattr(overlay, "setStrokeAlpha"):
                    overlay.setStrokeAlpha(opacity)

                positions = (
                    [(page_width * x / 100, page_height * (1 - y / 100)) for y in (18, 50, 82) for x in (18, 40, 62, 84)]
                    if use_tile
                    else [(page_width * x_percent / 100, page_height * (1 - y_percent / 100))]
                )

                if normalized_type == "image":
                    image_reader = ImageReader(str(_resolved_watermark))
                    natural_width, natural_height = image_reader.getSize()
                    draw_width = max(1, page_width * max(1, min(width_percent, 100)) / 100)
                    draw_height = draw_width * (natural_height / natural_width)
                    for position_x, position_y in positions:
                        overlay.saveState()
                        overlay.translate(position_x, position_y)
                        overlay.rotate(rotation)
                        overlay.drawImage(
                            image_reader,
                            -draw_width / 2,
                            -draw_height / 2,
                            width=draw_width,
                            height=draw_height,
                            mask="auto",
                        )
                        overlay.restoreState()
                else:
                    overlay.setFillColor(parse_color(font_color))
                    overlay.setFont(reportlab_font(), font_size)
                    for position_x, position_y in positions:
                        overlay.saveState()
                        overlay.translate(position_x, position_y)
                        overlay.rotate(rotation)
                        overlay.drawCentredString(0, 0, text)
                        overlay.restoreState()

                overlay.restoreState()
                overlay.save()
                packet.seek(0)
                return PdfReader(packet)

            for page_number, page in enumerate(reader.pages, start=1):
                if page_number in selected:
                    page_width = float(page.mediabox.width)
                    page_height = float(page.mediabox.height)
                    overlay_reader = overlay_for_page(page_width, page_height)
                    page.merge_page(overlay_reader.pages[0])
                writer.add_page(page)

            with output.open("wb") as target:
                writer.write(target)

        try:
            await asyncio.to_thread(write_watermarked)
        finally:
            if _temp_watermark is not None:
                try:
                    Path(_temp_watermark).unlink(missing_ok=True)
                except OSError:
                    pass
        return str(output)

    async def extract_text(
        self,
        input_path: str | Path,
        output_path: str | Path,
        layout: bool = True,
        output_format: str = "txt",
    ) -> str:
        normalized_output = self._normalize_ocr_output_format(output_format)
        output = self._ensure_parent(output_path)

        if normalized_output == "txt":
            command = ["pdftotext"]
            if layout:
                command.append("-layout")
            command.extend([str(input_path), str(output)])
            await self._run_command(command)
            return str(output)

        if normalized_output == "html":
            command = ["pdftotext", "-htmlmeta", str(input_path), str(output)]
            await self._run_command(command)
            return str(output)

        text = await self._extract_text_content(input_path, layout=layout)

        if normalized_output == "json":
            pages = [page.strip() for page in text.split("\f")]
            payload = {
                "text": text,
                "pages": [
                    {"page": index, "text": page}
                    for index, page in enumerate(pages, start=1)
                    if page
                ],
            }
            return await self._write_json(payload, output)

        return str(output)

    async def pdf_to_docx(
        self,
        input_path: str | Path,
        output_path: str | Path,
        layout: bool = True,
    ) -> str:
        text = await self._extract_text_content(input_path, layout=layout)
        return await self._write_docx(text, output_path)

    async def pdf_to_excel(
        self,
        input_path: str | Path,
        output_path: str | Path,
        layout: bool = True,
    ) -> str:
        output = self._ensure_parent(output_path)
        text = await self._extract_text_content(input_path, layout=layout)
        pages = [page for page in text.split("\f") if page.strip()]

        def write() -> None:
            from openpyxl import Workbook

            workbook = Workbook()
            default_sheet = workbook.active
            workbook.remove(default_sheet)

            for page_number, page_text in enumerate(pages or [text], start=1):
                worksheet = workbook.create_sheet(title=f"Page {page_number}"[:31])
                for row_index, line in enumerate(page_text.splitlines(), start=1):
                    cells = [cell for cell in re.split(r"\s{2,}", line.strip()) if cell] or [line.strip()]
                    for column_index, cell in enumerate(cells, start=1):
                        worksheet.cell(row=row_index, column=column_index, value=cell)

            workbook.save(output)

        await asyncio.to_thread(write)
        return str(output)

    async def pdf_to_html(self, input_path: str | Path, output_path: str | Path) -> str:
        return await self.extract_text(input_path, output_path, layout=True, output_format="html")

    async def pdf_to_images(
        self,
        input_path: str | Path,
        output_dir: str | Path,
        dpi: int = 150,
        format: ImageFormat = "png",
        jpeg_quality: int = 82,
        transparent: bool = False,
    ) -> list[str]:
        dpi = _clamp_dpi(dpi)

        output_directory = Path(output_dir)
        output_directory.mkdir(parents=True, exist_ok=True)
        job_id = job_id_from_output_dir(output_directory)
        mutool_format = "png" if format == "webp" else "jpg" if format in {"jpg", "jpeg"} else format
        output_pattern = output_directory / f"{job_id}_page-%03d.{mutool_format}"
        command = ["mutool", "draw", "-r", str(dpi), "-F", mutool_format, "-o", str(output_pattern)]
        if transparent and format == "png":
            command.extend(["-c", "rgba"])
        command.append(str(input_path))
        result = await run_command_result(
            command,
            check=False,
            timeout_seconds=PDF_COMMAND_TIMEOUT_SECONDS,
            timeout_detail="PDF page rendering took too long to finish.",
        )

        outputs = sorted(output_directory.glob(f"{job_id}_page-*.{mutool_format}"))
        stderr_text = result.stderr.strip()
        stdout_text = result.stdout.strip()
        meaningful_error = "\n".join(
            line for line in stderr_text.splitlines() if "icc support is not available" not in line.lower()
        ).strip()

        if result.returncode != 0 and not any(path.exists() and path.stat().st_size > 0 for path in outputs):
            detail = meaningful_error or stdout_text or f"mutool exited with code {result.returncode}"
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=detail)

        if format == "webp":
            from app.services.image_service import ImageService

            converted_outputs: list[Path] = []
            for path in outputs:
                target = path.with_suffix(".webp")
                await ImageService().convert_image(path, target, "webp", jpeg_quality, False, "srgb")
                path.unlink(missing_ok=True)
                converted_outputs.append(target)
            outputs = converted_outputs

        if format in {"jpg", "jpeg"}:
            import pyvips

            normalized_outputs: list[Path] = []
            for path in outputs:
                target = path.with_suffix(".jpg")
                image = pyvips.Image.new_from_file(str(path), access="sequential")
                image.jpegsave(str(target), Q=jpeg_quality, optimize_coding=True)
                if path != target and path.exists():
                    path.unlink(missing_ok=True)
                normalized_outputs.append(target)
            outputs = normalized_outputs

        return [str(path) for path in outputs]

    async def images_to_pdf(self, input_paths: list[str | Path], output_path: str | Path) -> str:
        if not input_paths:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one image is required",
            )

        output = self._ensure_parent(output_path)
        logger.info("Running img2pdf conversion for %s image(s)", len(input_paths))

        try:
            import img2pdf

            def convert() -> None:
                with output.open("wb") as output_file:
                    output_file.write(img2pdf.convert([str(path) for path in input_paths]))

            await asyncio.to_thread(convert)
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to convert images to PDF: {exc}",
            ) from exc

        return str(output)

    async def office_to_pdf(self, input_path: str | Path, output_dir: str | Path) -> str:
        output_directory = Path(output_dir)
        output_directory.mkdir(parents=True, exist_ok=True)
        job_id = job_id_from_output_dir(output_directory)
        command = [
            "libreoffice",
            "--headless",
            "--convert-to",
            "pdf",
            "--outdir",
            str(output_directory),
            str(input_path),
        ]
        await self._run_command(command)
        output_path = output_directory / f"{Path(input_path).stem}.pdf"
        prefixed = output_directory / _safe_output_name(job_id, output_path.name)
        if output_path.exists() and output_path != prefixed:
            output_path.replace(prefixed)
            return str(prefixed)
        return str(prefixed if prefixed.exists() else output_path)

    async def encrypt_pdf(
        self,
        input_path: str | Path,
        output_path: str | Path,
        user_password: str,
        owner_password: str = "",
    ) -> str:
        if not user_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="user_password is required",
            )

        output = self._ensure_parent(output_path)
        args_path = _write_qpdf_args_file(
            [
                "--encrypt",
                user_password,
                owner_password,
                "256",
                "--",
                str(input_path),
                str(output),
            ]
        )
        try:
            await self._run_command(["qpdf", f"@{args_path}"])
        finally:
            try:
                os.unlink(args_path)
            except Exception:
                pass
        return str(output)

    async def decrypt_pdf(
        self,
        input_path: str | Path,
        output_path: str | Path,
        password: str,
    ) -> str:
        if not password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="password is required",
            )

        output = self._ensure_parent(output_path)
        password_path = _write_password_file(password)
        command = ["qpdf", "--decrypt", f"--password-file={password_path}", str(input_path), str(output)]
        try:
            await self._run_command(command)
        finally:
            try:
                os.unlink(password_path)
            except Exception:
                pass
        return str(output)

    async def repair_pdf(self, input_path: str | Path, output_path: str | Path) -> str:
        output = self._ensure_parent(output_path)
        command = ["qpdf", str(input_path), str(output)]
        await self._run_command(command)
        return str(output)

    async def ocr_pdf(
        self,
        input_path: str | Path,
        output_dir: str | Path,
        language: str = "eng",
        output_format: str = "txt",
    ) -> str:
        logger.info("Starting ocr_pdf for file %s", input_path)
        normalized_output = self._normalize_ocr_output_format(output_format)
        output_directory = Path(output_dir)
        output_directory.mkdir(parents=True, exist_ok=True)
        job_id = job_id_from_output_dir(output_directory)
        page_pattern = output_directory / f"{job_id}_page-%04d.png"

        await self._run_command(
            [
                "mutool",
                "draw",
                "-F",
                "png",
                "-r",
                "300",
                "-o",
                str(page_pattern),
                str(input_path),
            ]
        )

        page_images = sorted(output_directory.glob(f"{job_id}_page-*.png"))
        if not page_images:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to render PDF pages for OCR",
            )

        if normalized_output in {"txt", "docx"}:
            page_texts: list[str] = []
            for page_image in page_images:
                stdout, _ = await self._run_command_output(
                    ["tesseract", str(page_image), "stdout", "-l", language]
                )
                page_texts.append(stdout.strip())

            combined_text = "\n\n".join(text for text in page_texts if text).strip()
            if normalized_output == "docx":
                return await self._write_docx(combined_text, output_directory / _safe_output_name(job_id, "ocr-output.docx"))
            output = self._ensure_parent(output_directory / _safe_output_name(job_id, "ocr-output.txt"))
            await asyncio.to_thread(output.write_text, combined_text, "utf-8")
            return str(output)

        if normalized_output == "json":
            pages: list[dict[str, object]] = []
            for page_number, page_image in enumerate(page_images, start=1):
                output_base = output_directory / f"{job_id}_ocr-page-{page_number:04d}"
                await self._run_command(
                    ["tesseract", str(page_image), str(output_base), "-l", language, "tsv"]
                )
                tsv_content = output_base.with_suffix(".tsv").read_text(encoding="utf-8")
                pages.append(self._parse_tsv_page(tsv_content, page_number))

            return await self._write_json(
                {"language": language, "pages": pages},
                output_directory / _safe_output_name(job_id, "ocr-output.json"),
            )

        if normalized_output == "hocr":
            output_files: list[Path] = []
            for page_number, page_image in enumerate(page_images, start=1):
                output_base = output_directory / f"{job_id}_ocr-page-{page_number:04d}"
                await self._run_command(
                    ["tesseract", str(page_image), str(output_base), "-l", language, "hocr"]
                )
                output_files.append(output_base.with_suffix(".hocr"))

            merged_output = self._ensure_parent(output_directory / _safe_output_name(job_id, "ocr-output.hocr"))
            content = "".join(path.read_text(encoding="utf-8") for path in output_files)
            await asyncio.to_thread(merged_output.write_text, content, "utf-8")
            return str(merged_output)

        page_pdfs: list[Path] = []
        for page_number, page_image in enumerate(page_images, start=1):
            output_base = output_directory / f"{job_id}_ocr-page-{page_number:04d}"
            await self._run_command(
                ["tesseract", str(page_image), str(output_base), "-l", language, "pdf"]
            )
            page_pdfs.append(output_base.with_suffix(".pdf"))

        merged_output = self._ensure_parent(output_directory / _safe_output_name(job_id, "ocr-searchable.pdf"))
        await self._run_command(
            ["qpdf", "--empty", "--pages", *[str(path) for path in page_pdfs], "--", str(merged_output)]
        )
        return str(merged_output)
