import asyncio
import gzip
import json
import logging
import mimetypes
import re
import shutil
import tempfile
import zipfile
from pathlib import Path
from typing import Any

from fastapi import HTTPException, status

from app.services.image_service import normalize_image_output_format

logger = logging.getLogger(__name__)

PDF_EXTENSIONS = {".pdf"}
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif", ".tif", ".tiff", ".bmp", ".svg"}
OFFICE_EXTENSIONS = {".docx", ".xlsx", ".pptx", ".odt", ".ods", ".odp"}
TEXT_EXTENSIONS = {".txt", ".csv", ".json", ".html", ".htm", ".css", ".js", ".xml", ".svg"}
ARCHIVE_EXTENSIONS = {".zip", ".7z", ".rar", ".tar", ".gz", ".bz2", ".xz"}

ALREADY_OPTIMIZED_MESSAGE = "Already optimized — original kept because recompression would increase size."
ORIGINAL_BELOW_TARGET_MESSAGE = "Original file is already below the target size."
TARGET_NOT_REACHED_MESSAGE = "Could not reach the exact target size safely. This is the smallest valid output produced."
UNSUPPORTED_MESSAGE = "This format cannot be compressed meaningfully. Use ZIP or 7z packaging instead."
UNSUPPORTED_ARCHIVE_MESSAGE = "This archive type is not safely supported for extraction yet. You can package it as ZIP/7z instead."
MAX_ARCHIVE_MEMBERS = 10_000
MAX_ARCHIVE_UNCOMPRESSED_BYTES = 2 * 1024 * 1024 * 1024

def get_imagemagick_command() -> str:
    import shutil
    if shutil.which("magick"):
        return "magick"
    if shutil.which("convert"):
        return "convert"
    raise RuntimeError("ImageMagick is not installed. Expected either 'magick' or 'convert'.")


class CompressionService:
    async def compress_file(self, input_path: str | Path, output_dir: str | Path, settings: dict[str, Any] | None = None) -> dict[str, Any]:
        input_file = Path(input_path)
        if not input_file.exists() or not input_file.is_file():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Input file not found")

        output_directory = Path(output_dir)
        output_directory.mkdir(parents=True, exist_ok=True)
        normalized_settings = self._settings(settings)
        category = self._detect_category(input_file, normalized_settings)

        with tempfile.TemporaryDirectory(prefix="compress-") as temp_name:
            temp_dir = Path(temp_name)
            if category == "pdf":
                candidates = await self._compress_pdf(input_file, temp_dir, normalized_settings)
            elif category == "image":
                candidates = await self._compress_image(input_file, temp_dir, normalized_settings)
            elif category == "office":
                candidates = await self._compress_office(input_file, temp_dir, normalized_settings)
            elif category == "text":
                candidates = await self._compress_text(input_file, temp_dir, normalized_settings)
            elif category == "archive":
                candidates = await self._compress_archive(input_file, temp_dir, normalized_settings)
            else:
                candidates = await self._package_fallback(input_file, temp_dir, normalized_settings, UNSUPPORTED_MESSAGE)

            return self._finalize(input_file, output_directory, candidates, normalized_settings)

    def _settings(self, settings: dict[str, Any] | None) -> dict[str, Any]:
        data = dict(settings or {})
        mode = str(data.get("mode") or "smart").lower()
        data["mode"] = mode
        data["strip_metadata"] = self._bool(data.get("strip_metadata"), False)
        data["force_recompress"] = self._bool(data.get("force_recompress"), False)
        data["keep_original_if_smaller"] = self._bool(data.get("keep_original_if_smaller"), True)
        data["output_suffix"] = str(data.get("output_suffix") or "-compressed")
        data["quality"] = self._int(data.get("quality"), self._mode_quality(mode), 1, 100)
        data["pdf_quality"] = str(data.get("pdf_quality") or self._mode_pdf_quality(mode))
        data["image_dpi"] = self._int(data.get("image_dpi"), self._mode_dpi(mode), 72, 600)
        data["archive_level"] = self._int(data.get("archive_level"), 9 if mode == "maximum" else 7, 1, 9)
        data["target_size_bytes"] = self._optional_positive_int(data.get("target_size_bytes"))
        strategy = str(data.get("target_size_strategy") or "best_effort").lower()
        data["target_size_strategy"] = strategy if strategy in {"best_effort", "strict_if_possible"} else "best_effort"
        archive_mode = str(data.get("archive_output_mode") or "").lower()
        if archive_mode in {"7z", "maximum"}:
            data["recompress_as_7z"] = True
            data["recompress_as_zip"] = False
        elif archive_mode in {"keep_zip", "best_zip"}:
            data["recompress_as_zip"] = True
            data["recompress_as_7z"] = False
        return data

    def _detect_category(self, input_file: Path, settings: dict[str, Any]) -> str:
        requested = str(settings.get("type") or settings.get("category") or "").lower()
        if requested in {"pdf", "image", "office", "text", "archive"}:
            return requested

        suffix = input_file.suffix.lower()
        mime_type = mimetypes.guess_type(input_file.name)[0] or ""
        if suffix in PDF_EXTENSIONS or mime_type == "application/pdf":
            return "pdf"
        if suffix in IMAGE_EXTENSIONS or mime_type.startswith("image/"):
            return "text" if suffix == ".svg" and self._bool(settings.get("preserve_original_extension"), True) else "image"
        if suffix in OFFICE_EXTENSIONS:
            return "office"
        if suffix in TEXT_EXTENSIONS or mime_type.startswith("text/"):
            return "text"
        if suffix in ARCHIVE_EXTENSIONS or mime_type == "application/zip":
            return "archive"
        return "unsupported"

    async def _compress_pdf(self, input_file: Path, temp_dir: Path, settings: dict[str, Any]) -> list[dict[str, Any]]:
        temp_dir.mkdir(parents=True, exist_ok=True)
        candidates: list[dict[str, Any]] = []
        requested_quality = self._pdf_quality(settings)
        requested_dpi = self._int(settings.get("image_dpi"), 150, 72, 600)
        grayscale = self._bool(settings.get("grayscale") or settings.get("convert_to_grayscale"), False)
        target_size = settings.get("target_size_bytes")

        if target_size:
            reached = False
            for preset in ["screen", "ebook", "printer"]:
                if reached:
                    break
                for dpi in [300, 200, 150, 120, 96, 72]:
                    if reached:
                        break
                    for jpeg_quality in [90, 85, 75, 65, 55, 45, 35, 25]:
                        gs_output = temp_dir / f"ghostscript-{preset}-{dpi}-{jpeg_quality}.pdf"
                        command = self._ghostscript_command(input_file, gs_output, preset, dpi, grayscale, jpeg_quality)
                        if await self._try_command(command) and await self._valid_pdf(gs_output):
                            candidates.append(
                                {
                                    "path": gs_output,
                                    "method": f"ghostscript-{preset}-{dpi}dpi-q{jpeg_quality}",
                                    "message": "Compressed successfully",
                                }
                            )
                            if gs_output.stat().st_size <= int(target_size):
                                reached = True
                                break
        else:
            gs_output = temp_dir / "ghostscript.pdf"
            command = self._ghostscript_command(input_file, gs_output, requested_quality, requested_dpi, grayscale, settings["quality"])
            if await self._try_command(command) and await self._valid_pdf(gs_output):
                candidates.append({"path": gs_output, "method": "ghostscript", "message": "Compressed successfully"})

        base_for_optional = self._smallest_path(candidates) or input_file

        if self._bool(settings.get("ocr_optimize"), False):
            ocr_output = temp_dir / "ocrmypdf.pdf"
            optimize_level = "3" if settings["mode"] == "maximum" else "2"
            output_type = "pdfa" if self._bool(settings.get("pdfa_output"), False) else "pdf"
            if await self._try_command(
                [
                    "ocrmypdf",
                    "--skip-text",
                    "--optimize",
                    optimize_level,
                    "--output-type",
                    output_type,
                    str(base_for_optional),
                    str(ocr_output),
                ]
            ) and await self._valid_pdf(ocr_output):
                candidates.append({"path": ocr_output, "method": "ghostscript+ocrmypdf", "message": "Compressed successfully"})
                base_for_optional = self._smallest_path(candidates) or base_for_optional

        if self._bool(settings.get("linearize") or settings.get("web_optimize"), False):
            linear_output = temp_dir / "linearized.pdf"
            if await self._try_command(["qpdf", "--linearize", str(base_for_optional), str(linear_output)]) and await self._valid_pdf(linear_output):
                candidates.append({"path": linear_output, "method": "ghostscript+qpdf", "message": "Compressed successfully"})

        pdfcpu_output = temp_dir / "pdfcpu.pdf"
        if await self._try_command(["pdfcpu", "optimize", str(base_for_optional), str(pdfcpu_output)]) and await self._valid_pdf(pdfcpu_output):
            candidates.append({"path": pdfcpu_output, "method": "ghostscript+pdfcpu", "message": "Compressed successfully"})

        if self._bool(settings.get("strip_metadata"), False):
            stripped = await self._strip_pdf_metadata(self._smallest_path(candidates) or input_file, temp_dir / "metadata-stripped.pdf")
            if stripped and await self._valid_pdf(stripped):
                candidates.append({"path": stripped, "method": "metadata-strip", "message": "Compressed successfully"})

        if not candidates:
            candidates = await self._package_fallback(input_file, temp_dir, settings, "PDF compression tools could not produce a valid smaller candidate. ZIP/7z packaging is available instead.")
        return candidates

    async def _compress_image(self, input_file: Path, temp_dir: Path, settings: dict[str, Any]) -> list[dict[str, Any]]:
        temp_dir.mkdir(parents=True, exist_ok=True)
        suffix = input_file.suffix.lower()
        raw_format = str(settings.get("output_format") or "keep").lower()
        requested_format = "auto" if raw_format in {"keep", "keep original", "keep_original"} else normalize_image_output_format(raw_format)
        if requested_format in {"auto", ""}:
            target_suffix = ".jpg" if suffix == ".jpeg" else suffix
        else:
            target_suffix = f".{requested_format.lstrip('.')}"

        if suffix == ".svg" and target_suffix == ".svg":
            return await self._compress_text(input_file, temp_dir, {**settings, "preserve_original_extension": True})

        quality = self._int(settings.get("quality"), 82, 1, 100)
        strip = self._bool(settings.get("strip_metadata"), False) and not self._bool(settings.get("preserve_metadata"), False)
        lossless = self._bool(settings.get("lossless"), False) or settings["mode"] == "lossless"
        target_size = settings.get("target_size_bytes")
        candidates: list[dict[str, Any]] = []

        def stepped_qualities() -> list[int]:
            if target_size:
                return [95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 35, 30, 25, 20]
            return [quality]

        def target_reached(path: Path) -> bool:
            return bool(target_size and self._valid_nonempty(path) and path.stat().st_size <= int(target_size))

        if target_suffix in {".jpg", ".jpeg"}:
            for current_quality in stepped_qualities():
                output = temp_dir / f"image-q{current_quality}.jpg"
                if suffix in {".jpg", ".jpeg"}:
                    shutil.copy2(input_file, output)
                    command = ["jpegoptim", "--quiet", f"--max={current_quality}"]
                    if strip:
                        command.append("--strip-all")
                    command.append(str(output))
                    if await self._try_command(command):
                        candidates.append({"path": output, "method": "jpegoptim", "message": "Compressed successfully"})
                        if target_reached(output):
                            break
                        continue
                cmd = [get_imagemagick_command(), str(input_file)]
                if strip:
                    cmd.append("-strip")
                cmd.extend(["-quality", str(current_quality), str(output)])
                if await self._try_command(cmd):
                    candidates.append({"path": output, "method": "imagemagick-jpeg", "message": "Compressed successfully"})
                    if target_reached(output):
                        break

        elif target_suffix == ".png":
            if lossless or not target_size:
                output = temp_dir / "image-lossless.png"
                shutil.copy2(input_file, output)
                ran = False
                if await self._try_command(["oxipng", "-o", "4", "--strip", "safe", str(output)]):
                    ran = True
                if await self._try_command(["optipng", "-o7", str(output)]):
                    ran = True
                if ran:
                    candidates.append({"path": output, "method": "oxipng+optipng", "message": "Compressed successfully"})
            if not lossless or target_size:
                ranges = (
                    [(90, 100), (80, 95), (70, 90), (60, 85), (50, 80), (40, 70), (30, 60)]
                    if target_size
                    else [(max(1, min(quality - 15, quality)), quality)]
                )
                for minimum, maximum in ranges:
                    output = temp_dir / f"image-pngquant-{minimum}-{maximum}.png"
                    if await self._try_command(["pngquant", "--quality", f"{minimum}-{maximum}", "--force", "--output", str(output), str(input_file)]):
                        candidates.append({"path": output, "method": "pngquant", "message": "Compressed successfully"})
                        if target_reached(output):
                            break
                if not candidates:
                    output = temp_dir / "image-oxipng.png"
                    shutil.copy2(input_file, output)
                    if await self._try_command(["oxipng", "-o", "4", "--strip", "safe", str(output)]):
                        candidates.append({"path": output, "method": "oxipng", "message": "Compressed successfully"})

        elif target_suffix == ".webp":
            for current_quality in stepped_qualities():
                output = temp_dir / f"image-q{current_quality}.webp"
                command = ["cwebp", "-quiet"]
                command.extend(["-lossless"] if lossless and not target_size else ["-q", str(current_quality)])
                command.extend([str(input_file), "-o", str(output)])
                if await self._try_command(command):
                    candidates.append({"path": output, "method": "cwebp", "message": "Compressed successfully"})
                    if target_reached(output):
                        break
                else:
                    cmd = [get_imagemagick_command(), str(input_file)]
                    if strip:
                        cmd.append("-strip")
                    cmd.extend(["-quality", str(current_quality), str(output)])
                    if await self._try_command(cmd):
                        candidates.append({"path": output, "method": "imagemagick-webp", "message": "Compressed successfully"})
                        if target_reached(output):
                            break

        elif target_suffix == ".avif":
            for current_quality in stepped_qualities():
                output = temp_dir / f"image-q{current_quality}.avif"
                if await self._try_command(["avifenc", "-q", str(current_quality), str(input_file), str(output)]):
                    candidates.append({"path": output, "method": "avifenc", "message": "Compressed successfully"})
                    if target_reached(output):
                        break
                else:
                    cmd = [get_imagemagick_command(), str(input_file), "-quality", str(current_quality), str(output)]
                    if await self._try_command(cmd):
                        candidates.append({"path": output, "method": "imagemagick-avif", "message": "Compressed successfully"})
                        if target_reached(output):
                            break

        elif target_suffix == ".gif":
            output = temp_dir / "image.gif"
            if await self._try_command(["gifsicle", "-O3", "-o", str(output), str(input_file)]):
                candidates.append({"path": output, "method": "gifsicle", "message": "Compressed successfully"})

        elif target_suffix in {".tif", ".tiff", ".bmp"}:
            output = temp_dir / f"image{target_suffix}"
            cmd = [get_imagemagick_command(), str(input_file)]
            if strip:
                cmd.append("-strip")
            if target_suffix in {".tif", ".tiff"}:
                cmd.extend(["-compress", "Zip"])
            cmd.append(str(output))
            if await self._try_command(cmd):
                candidates.append({"path": output, "method": "imagemagick", "message": "Compressed successfully"})

        if target_suffix == ".png" and candidates:
            for candidate in candidates:
                candidate_path = Path(candidate["path"])
                if await self._try_command(["oxipng", "-o", "4", "--strip", "safe", str(candidate_path)]):
                    if await self._try_command(["optipng", "-o7", str(candidate_path)]):
                        candidate["method"] = "pngquant+oxipng" if candidate["method"] == "pngquant" else "oxipng+optipng"
                    else:
                        candidate["method"] = "pngquant+oxipng" if candidate["method"] == "pngquant" else "oxipng"

        if not candidates and (self._bool(settings.get("package_as_zip"), False) or self._bool(settings.get("package_as_7z"), False)):
            return await self._package_fallback(
                input_file,
                temp_dir,
                settings,
                "This image format could not be compressed with the available tools. ZIP/7z packaging was used because packaging was selected.",
            )
        return [candidate for candidate in candidates if self._valid_nonempty(Path(candidate["path"]))]

    async def _compress_office(self, input_file: Path, temp_dir: Path, settings: dict[str, Any]) -> list[dict[str, Any]]:
        candidates: list[dict[str, Any]] = []
        if self._bool(settings.get("convert_to_pdf_and_compress"), False):
            converted_dir = temp_dir / "office-pdf"
            converted_dir.mkdir()
            if await self._try_command(["libreoffice", "--headless", "--convert-to", "pdf", "--outdir", str(converted_dir), str(input_file)]):
                pdf_path = converted_dir / f"{input_file.stem}.pdf"
                if pdf_path.exists():
                    candidates.extend(await self._compress_pdf(pdf_path, temp_dir / "office-pdf-compressed", settings))

        if self._bool(settings.get("keep_original_format"), True):
            recompressed = temp_dir / input_file.name
            if input_file.suffix.lower() in OFFICE_EXTENSIONS and zipfile.is_zipfile(input_file):
                recompressed = await self._recompress_zip_container(input_file, temp_dir / "office-extract", recompressed, settings)
                if recompressed and zipfile.is_zipfile(recompressed):
                    candidates.append({"path": recompressed, "method": "office-zip-repack", "message": "Compressed successfully"})

        if self._bool(settings.get("package_as_zip"), False) or self._bool(settings.get("package_as_7z"), False) or not candidates:
            candidates.extend(await self._package_fallback(input_file, temp_dir, settings, "Office files are already compressed containers; ZIP/7z packaging is available when internal repacking is not useful."))

        return candidates

    async def _compress_text(self, input_file: Path, temp_dir: Path, settings: dict[str, Any]) -> list[dict[str, Any]]:
        candidates: list[dict[str, Any]] = []
        preserve_extension = self._bool(settings.get("preserve_original_extension"), True)
        minify = self._bool(settings.get("minify"), settings["mode"] != "lossless")

        if minify and input_file.suffix.lower() in TEXT_EXTENSIONS:
            minified = temp_dir / input_file.name
            text = await asyncio.to_thread(input_file.read_text, "utf-8", "ignore")
            await asyncio.to_thread(minified.write_text, self._minify_text(text, input_file.suffix.lower()), "utf-8")
            if self._valid_nonempty(minified):
                candidates.append({"path": minified, "method": "minify", "message": "Compressed successfully"})

        source_for_package = Path(candidates[-1]["path"]) if candidates and preserve_extension else input_file
        if self._bool(settings.get("gzip_output"), False):
            gzip_path = temp_dir / f"{input_file.name}.gz"
            await asyncio.to_thread(self._write_gzip, source_for_package, gzip_path)
            candidates.append({"path": gzip_path, "method": "gzip", "message": "Compressed successfully"})

        if self._bool(settings.get("brotli_output"), False):
            brotli_path = temp_dir / f"{input_file.name}.br"
            if await self._try_command(["brotli", "-f", "-q", "11", "-o", str(brotli_path), str(source_for_package)]):
                candidates.append({"path": brotli_path, "method": "brotli", "message": "Compressed successfully"})

        if self._bool(settings.get("zip_output"), False) or self._bool(settings.get("package_as_zip"), False):
            candidates.append(await self._zip_single(source_for_package, temp_dir / f"{input_file.stem}.zip", settings, "zip"))

        if self._bool(settings.get("seven_zip_output"), False) or self._bool(settings.get("package_as_7z"), False) or not candidates:
            packaged = await self._seven_zip_single(source_for_package, temp_dir / f"{input_file.stem}.7z", settings)
            if packaged:
                candidates.append(packaged)
            elif not candidates:
                candidates.append(await self._zip_single(source_for_package, temp_dir / f"{input_file.stem}.zip", settings, "zip"))

        return [candidate for candidate in candidates if self._valid_nonempty(Path(candidate["path"]))]

    async def _compress_archive(self, input_file: Path, temp_dir: Path, settings: dict[str, Any]) -> list[dict[str, Any]]:
        if input_file.suffix.lower() != ".zip" or not zipfile.is_zipfile(input_file):
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=UNSUPPORTED_ARCHIVE_MESSAGE)

        output_suffix = ".7z" if self._bool(settings.get("recompress_as_7z"), False) else ".zip"
        output = temp_dir / f"{input_file.stem}{output_suffix}"
        extract_dir = temp_dir / "archive-extract"
        self._safe_extract_zip(input_file, extract_dir)
        if output_suffix == ".7z":
            packaged = await self._seven_zip_dir(extract_dir, output, settings, "archive-7z")
            return [packaged] if packaged else []
        recompressed = await self._zip_dir(extract_dir, output, settings, "archive-zip")
        if shutil.which("advzip"):
            if await self._try_command(["advzip", "-z", "-4", str(recompressed["path"])]):
                recompressed["method"] = "archive-zip+advzip"
        return [recompressed]

    async def _package_fallback(self, input_file: Path, temp_dir: Path, settings: dict[str, Any], message: str) -> list[dict[str, Any]]:
        candidates: list[dict[str, Any]] = []
        if self._bool(settings.get("package_as_7z"), False):
            packaged = await self._seven_zip_single(input_file, temp_dir / f"{input_file.stem}.7z", settings, message=message)
            if packaged:
                candidates.append(packaged)
        if self._bool(settings.get("package_as_zip"), True) or not candidates:
            candidates.append(await self._zip_single(input_file, temp_dir / f"{input_file.stem}.zip", settings, message=message))
        return candidates

    def _finalize(self, input_file: Path, output_dir: Path, candidates: list[dict[str, Any]], settings: dict[str, Any]) -> dict[str, Any]:
        original_size = input_file.stat().st_size
        valid_candidates = [
            candidate for candidate in candidates
            if self._valid_nonempty(Path(candidate["path"]))
        ]

        if not valid_candidates:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=UNSUPPORTED_MESSAGE)

        target_size = settings.get("target_size_bytes")
        force = self._bool(settings.get("force_recompress"), False)
        keep_original = self._bool(settings.get("keep_original_if_smaller"), True)

        if target_size and original_size <= int(target_size) and not force:
            return self._copy_result(
                input_file,
                input_file,
                output_dir,
                settings,
                method="original-kept",
                message=ORIGINAL_BELOW_TARGET_MESSAGE,
                optimized=False,
                target_size_bytes=int(target_size),
                reached_target=True,
            )

        if target_size:
            under_target = [
                candidate
                for candidate in valid_candidates
                if Path(candidate["path"]).stat().st_size <= int(target_size)
            ]
            best = (
                max(under_target, key=lambda item: Path(item["path"]).stat().st_size)
                if under_target
                else min(valid_candidates, key=lambda item: Path(item["path"]).stat().st_size)
            )
        else:
            best = min(valid_candidates, key=lambda item: Path(item["path"]).stat().st_size)

        best_path = Path(best["path"])
        best_size = best_path.stat().st_size
        keep_uploaded = keep_original and best_size >= original_size and not force
        final_source = input_file if keep_uploaded else best_path
        optimized = not keep_uploaded and final_source.stat().st_size < original_size
        reached_target = bool(target_size and final_source.stat().st_size <= int(target_size))
        if keep_uploaded:
            message = ALREADY_OPTIMIZED_MESSAGE
        elif target_size and not reached_target:
            message = TARGET_NOT_REACHED_MESSAGE
        else:
            message = str(best.get("message") or "Compressed successfully")

        return self._copy_result(
            final_source,
            input_file,
            output_dir,
            settings,
            method="original-kept" if keep_uploaded else str(best.get("method") or "compression"),
            message=message,
            optimized=optimized,
            target_size_bytes=int(target_size) if target_size else None,
            reached_target=reached_target if target_size else None,
        )

    def _final_output_path(self, final_source: Path, input_file: Path, output_dir: Path, settings: dict[str, Any]) -> Path:
        suffix = final_source.suffix or input_file.suffix or ".bin"
        requested = str(settings.get("output_filename") or "").strip()
        if requested:
            safe_name = f"{self._safe_filename(Path(requested).stem, input_file.stem)}{suffix}"
        else:
            safe_stem = re.sub(r"[^A-Za-z0-9._-]+", "-", input_file.stem).strip(".-") or "compressed"
            safe_name = f"{safe_stem}{settings.get('output_suffix', '-compressed')}{suffix}"
        return output_dir / safe_name

    def _copy_result(
        self,
        final_source: Path,
        input_file: Path,
        output_dir: Path,
        settings: dict[str, Any],
        *,
        method: str,
        message: str,
        optimized: bool,
        target_size_bytes: int | None,
        reached_target: bool | None,
    ) -> dict[str, Any]:
        original_size = input_file.stat().st_size
        final_path = self._final_output_path(final_source, input_file, output_dir, settings)
        shutil.copy2(final_source, final_path)
        output_size = final_path.stat().st_size
        saved_bytes = max(original_size - output_size, 0)
        saved_percent = round((saved_bytes / original_size) * 100, 2) if original_size else 0.0
        media_type = mimetypes.guess_type(final_path.name)[0] or "application/octet-stream"

        return {
            "output_path": str(final_path),
            "output_filename": final_path.name,
            "media_type": media_type,
            "original_name": input_file.name,
            "extension": final_path.suffix.lstrip("."),
            "original_size": original_size,
            "output_size": output_size,
            "target_size_bytes": target_size_bytes,
            "reached_target": reached_target,
            "saved_bytes": saved_bytes,
            "saved_percent": saved_percent,
            "optimized": optimized,
            "method": method,
            "message": message,
        }

    async def _recompress_zip_container(self, input_file: Path, extract_dir: Path, output: Path, settings: dict[str, Any]) -> Path | None:
        self._safe_extract_zip(input_file, extract_dir)
        if shutil.which("7z"):
            if await self._try_command(["7z", "a", "-tzip", f"-mx={settings['archive_level']}", str(output), f"{extract_dir}{self._path_glob_suffix()}"]):
                return output
        candidate = await self._zip_dir(extract_dir, output, settings, "office-zip-repack")
        return Path(candidate["path"])

    def _ghostscript_command(
        self,
        input_file: Path,
        output: Path,
        preset: str,
        dpi: int,
        grayscale: bool,
        jpeg_quality: int,
    ) -> list[str]:
        command = [
            "gs",
            "-dBATCH",
            "-dNOPAUSE",
            "-sDEVICE=pdfwrite",
            f"-dPDFSETTINGS=/{preset}",
            "-dCompatibilityLevel=1.4",
            "-dDetectDuplicateImages=true",
            "-dCompressFonts=true",
            "-dSubsetFonts=true",
            "-dColorImageDownsampleType=/Bicubic",
            f"-dColorImageResolution={dpi}",
            "-dGrayImageDownsampleType=/Bicubic",
            f"-dGrayImageResolution={dpi}",
            f"-dMonoImageResolution={max(300, dpi)}",
            f"-dJPEGQ={self._int(jpeg_quality, 82, 1, 100)}",
        ]
        if grayscale:
            command.extend(["-sColorConversionStrategy=Gray", "-sProcessColorModel=DeviceGray"])
        command.extend([f"-sOutputFile={output}", str(input_file)])
        return command

    async def _zip_single(self, input_file: Path, output: Path, settings: dict[str, Any], message: str) -> dict[str, Any]:
        level = self._int(settings.get("archive_level"), 9, 1, 9)

        def write() -> None:
            with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=level) as archive:
                archive.write(input_file, arcname=input_file.name)

        await asyncio.to_thread(write)
        return {"path": output, "method": "zip", "message": message}

    async def _zip_dir(self, input_dir: Path, output: Path, settings: dict[str, Any], method: str) -> dict[str, Any]:
        level = self._int(settings.get("archive_level"), 9, 1, 9)

        def write() -> None:
            with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=level) as archive:
                for path in sorted(input_dir.rglob("*")):
                    if path.is_file():
                        archive.write(path, arcname=path.relative_to(input_dir))

        await asyncio.to_thread(write)
        return {"path": output, "method": method, "message": "Compressed successfully"}

    async def _seven_zip_single(self, input_file: Path, output: Path, settings: dict[str, Any], message: str = "Compressed successfully") -> dict[str, Any] | None:
        if not shutil.which("7z"):
            return None
        if await self._try_command(["7z", "a", "-t7z", f"-mx={settings['archive_level']}", "-m0=lzma2", str(output), str(input_file)]):
            return {"path": output, "method": "7z", "message": message}
        return None

    async def _seven_zip_dir(self, input_dir: Path, output: Path, settings: dict[str, Any], method: str) -> dict[str, Any] | None:
        if not shutil.which("7z"):
            return None
        if await self._try_command(["7z", "a", "-t7z", f"-mx={settings['archive_level']}", "-m0=lzma2", str(output), f"{input_dir}{self._path_glob_suffix()}"]):
            return {"path": output, "method": method, "message": "Compressed successfully"}
        return None

    def _safe_extract_zip(self, zip_path: Path, extract_dir: Path) -> None:
        extract_dir.mkdir(parents=True, exist_ok=True)
        root = extract_dir.resolve(strict=False)
        with zipfile.ZipFile(zip_path) as archive:
            members = archive.infolist()
            if len(members) > MAX_ARCHIVE_MEMBERS:
                raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Zip contains too many files to extract safely")
            total_size = sum(max(member.file_size, 0) for member in members)
            if total_size > MAX_ARCHIVE_UNCOMPRESSED_BYTES:
                raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Zip is too large to extract safely")
            for member in members:
                member_path = Path(member.filename)
                if member_path.is_absolute() or ".." in member_path.parts:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Zip contains an unsafe path")
                destination = (extract_dir / member.filename).resolve(strict=False)
                if not destination.is_relative_to(root):
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Zip contains an unsafe path")
            archive.extractall(extract_dir)

    async def _strip_pdf_metadata(self, input_file: Path, output: Path) -> Path | None:
        try:
            from pypdf import PdfReader, PdfWriter

            def write() -> None:
                reader = PdfReader(str(input_file))
                writer = PdfWriter()
                for page in reader.pages:
                    writer.add_page(page)
                writer.add_metadata({})
                with output.open("wb") as handle:
                    writer.write(handle)

            await asyncio.to_thread(write)
            return output
        except Exception:
            logger.info("PDF metadata stripping skipped", exc_info=True)
            return None

    async def _valid_pdf(self, path: Path) -> bool:
        if not self._valid_nonempty(path):
            return False
        if shutil.which("qpdf"):
            return await self._try_command(["qpdf", "--check", str(path)])
        return True

    def _valid_nonempty(self, path: Path) -> bool:
        return path.exists() and path.is_file() and path.stat().st_size > 0

    def _smallest_path(self, candidates: list[dict[str, Any]]) -> Path | None:
        valid = [Path(candidate["path"]) for candidate in candidates if self._valid_nonempty(Path(candidate["path"]))]
        return min(valid, key=lambda path: path.stat().st_size) if valid else None

    async def _try_command(self, command: list[str]) -> bool:
        if not shutil.which(command[0]):
            logger.info("Compression command unavailable: %s", command[0])
            return False
        logger.info("Running compression command: %s", " ".join(command))
        try:
            process = await asyncio.create_subprocess_exec(
                *command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await process.communicate()
        except OSError:
            logger.info("Compression command failed to start: %s", command[0], exc_info=True)
            return False
        if process.returncode != 0:
            logger.info(
                "Compression command failed: %s",
                (stderr or stdout).decode("utf-8", errors="replace").strip(),
            )
            return False
        return True

    def _write_gzip(self, input_file: Path, output: Path) -> None:
        with input_file.open("rb") as source, gzip.open(output, "wb", compresslevel=9) as target:
            shutil.copyfileobj(source, target)

    def _minify_text(self, text: str, suffix: str) -> str:
        if suffix == ".json":
            try:
                return json.dumps(json.loads(text), separators=(",", ":"), ensure_ascii=False)
            except json.JSONDecodeError:
                return text
        if suffix in {".html", ".htm", ".xml", ".svg"}:
            text = re.sub(r"<!--.*?-->", "", text, flags=re.DOTALL)
            return re.sub(r">\s+<", "><", text).strip()
        if suffix in {".css", ".js"}:
            text = re.sub(r"/\*.*?\*/", "", text, flags=re.DOTALL)
            text = re.sub(r"(^|\s)//[^\n\r]*", "", text)
            return re.sub(r"\s+", " ", text).strip()
        if suffix in {".txt", ".csv"}:
            return "\n".join(line.rstrip() for line in text.splitlines()).strip() + "\n"
        return text

    def _pdf_quality(self, settings: dict[str, Any]) -> str:
        quality = str(settings.get("pdf_quality") or "ebook").lower()
        return quality if quality in {"screen", "ebook", "printer", "prepress"} else "ebook"

    def _mode_quality(self, mode: str) -> int:
        return {"lossless": 100, "balanced": 82, "maximum": 55, "custom": 82}.get(mode, 78)

    def _mode_pdf_quality(self, mode: str) -> str:
        return {"lossless": "prepress", "balanced": "ebook", "maximum": "screen", "custom": "ebook"}.get(mode, "ebook")

    def _mode_dpi(self, mode: str) -> int:
        return {"lossless": 300, "balanced": 150, "maximum": 96, "custom": 150}.get(mode, 150)

    def _safe_filename(self, value: str, fallback: str) -> str:
        safe = re.sub(r"[^A-Za-z0-9._-]+", "-", Path(value).name).strip(".-")
        return safe or re.sub(r"[^A-Za-z0-9._-]+", "-", fallback).strip(".-") or "output"

    def _optional_positive_int(self, value: Any) -> int | None:
        if value is None:
            return None
        if isinstance(value, str) and value.strip().lower() in {"", "null", "none"}:
            return None
        try:
            parsed = int(float(value))
        except (TypeError, ValueError):
            return None
        return parsed if parsed > 0 else None

    def _int(self, value: Any, default: int, minimum: int, maximum: int) -> int:
        try:
            parsed = int(value)
        except (TypeError, ValueError):
            parsed = default
        return max(minimum, min(maximum, parsed))

    def _bool(self, value: Any, default: bool = False) -> bool:
        if value is None:
            return default
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            return value.strip().lower() in {"1", "true", "yes", "on"}
        return bool(value)

    def _path_glob_suffix(self) -> str:
        return "\\*" if "\\" in str(Path.cwd()) else "/*"
