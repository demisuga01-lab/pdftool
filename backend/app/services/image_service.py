import asyncio
import csv
import json
import logging
import shutil
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any, Literal

from fastapi import HTTPException, status

logger = logging.getLogger(__name__)

ImageFormat = Literal["auto", "jpg", "jpeg", "png", "webp", "tiff", "tif", "avif", "bmp", "pdf", "eps"]
ResizeFit = Literal["cover", "contain", "fill", "inside", "outside", "stretch"]


class ImageService:
    async def _run_blocking(
        self,
        func: Any,
        *,
        failure_message: str,
        failure_status: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
    ) -> Any:
        try:
            return await asyncio.to_thread(func)
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(
                status_code=failure_status,
                detail=failure_message,
            ) from exc

    async def _run_command(
        self,
        command: list[str],
        *,
        failure_status: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
    ) -> tuple[str, str]:
        logger.info("Running command: %s", " ".join(command))

        try:
            process = await asyncio.create_subprocess_exec(
                *command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await process.communicate()
        except FileNotFoundError as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Required command not found: {command[0]}",
            ) from exc
        except OSError as exc:
            raise HTTPException(
                status_code=failure_status,
                detail=f"Failed to run command: {command[0]}",
            ) from exc

        stdout_text = stdout.decode("utf-8", errors="replace").strip()
        stderr_text = stderr.decode("utf-8", errors="replace").strip()

        if process.returncode != 0:
            detail = stderr_text or stdout_text or f"{command[0]} exited with code {process.returncode}"
            raise HTTPException(status_code=failure_status, detail=detail)

        return stdout_text, stderr_text

    def _ensure_parent(self, output_path: str | Path) -> Path:
        path = Path(output_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        return path

    def _normalize_format(
        self,
        format: str | None,
        *,
        input_path: str | Path | None = None,
        allow_document: bool = False,
    ) -> str:
        normalized = (format or "").lower().lstrip(".")
        if normalized in {"", "auto"}:
            if not input_path:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="format must be provided when input format cannot be detected",
                )
            normalized = Path(input_path).suffix.lower().lstrip(".")
        if normalized == "jpeg":
            return "jpg"
        if normalized == "tif":
            return "tiff"
        allowed_formats = {"jpg", "png", "webp", "tiff", "avif", "bmp"}
        if allow_document:
            allowed_formats |= {"pdf", "eps"}
        if normalized not in allowed_formats:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="format must be one of: auto, jpg, jpeg, png, webp, tiff, tif, avif, bmp, pdf, eps",
            )
        return normalized

    def _load_image(self, input_path: str | Path) -> Any:
        import pyvips

        return pyvips.Image.new_from_file(str(input_path), access="sequential")

    def _apply_color_space(self, image: Any, color_space: str) -> Any:
        if color_space == "srgb":
            return image.colourspace("srgb")
        if color_space == "cmyk":
            return image.colourspace("cmyk")
        if color_space == "gray":
            return image.colourspace("b-w")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="color_space must be one of: srgb, cmyk, gray",
        )

    def _save_image(self, image: Any, output_path: str | Path, **options: Any) -> str:
        output = self._ensure_parent(output_path)
        image.write_to_file(str(output), **options)
        return str(output)

    def _save_vips_format(
        self,
        image: Any,
        output_path: str | Path,
        target_format: str,
        *,
        quality: int = 85,
        strip_metadata: bool = True,
        png_compression: int = 9,
        progressive: bool = False,
    ) -> str:
        output = self._ensure_parent(output_path)
        if target_format == "jpg":
            try:
                image.jpegsave(str(output), Q=quality, strip=strip_metadata, optimize_coding=True, interlace=progressive)
            except TypeError:
                image.jpegsave(str(output), Q=quality, strip=strip_metadata, interlace=progressive)
            return str(output)
        if target_format == "png":
            image.pngsave(str(output), compression=max(0, min(int(png_compression), 9)), strip=strip_metadata, interlace=progressive)
            return str(output)
        if target_format == "webp":
            image.webpsave(str(output), Q=quality, strip=strip_metadata)
            return str(output)
        if target_format == "avif":
            try:
                image.heifsave(str(output), Q=quality, compression="av1", strip=strip_metadata)
            except TypeError:
                try:
                    image.heifsave(str(output), Q=quality, strip=strip_metadata)
                except Exception as exc:
                    raise HTTPException(
                        status_code=status.HTTP_501_NOT_IMPLEMENTED,
                        detail="AVIF output is not supported by the current libvips build.",
                    ) from exc
            except Exception as exc:
                raise HTTPException(
                    status_code=status.HTTP_501_NOT_IMPLEMENTED,
                    detail="AVIF output is not supported by the current libvips build.",
                ) from exc
            return str(output)
        if target_format == "tiff":
            image.tiffsave(str(output), compression="deflate", strip=strip_metadata)
            return str(output)
        if target_format == "bmp":
            try:
                image.write_to_file(str(output))
            except Exception as exc:
                raise HTTPException(
                    status_code=status.HTTP_501_NOT_IMPLEMENTED,
                    detail="BMP output is not supported by the current libvips build.",
                ) from exc
            return str(output)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unsupported output format: {target_format}")

    def _parse_tsv_content(self, tsv_content: str) -> dict[str, object]:
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
                }
            )

        return {"page": 1, "words": words}

    async def convert_image(
        self,
        input_path: str | Path,
        output_path: str | Path,
        format: ImageFormat,
        quality: int = 85,
        preserve_metadata: bool = False,
        color_space: str = "srgb",
    ) -> str:
        logger.info("Starting convert_image for file %s", input_path)
        target_format = self._normalize_format(format, input_path=input_path, allow_document=True)
        output = self._ensure_parent(Path(output_path).with_suffix(f".{target_format}"))
        input_file = Path(input_path)

        if input_file.suffix.lower() == ".svg":
            if target_format not in {"png", "pdf", "eps"}:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="SVG export format must be png, pdf, or eps",
                )
            try:
                await self._run_command(
                    [
                        "inkscape",
                        str(input_path),
                        f"--export-type={target_format}",
                        f"--export-filename={output}",
                    ]
                )
            except HTTPException as exc:
                if target_format != "eps":
                    raise
                temp_pdf = output.with_suffix(".pdf")
                await self._run_command(
                    [
                        "inkscape",
                        str(input_path),
                        "--export-type=pdf",
                        f"--export-filename={temp_pdf}",
                    ]
                )
                try:
                    await self._run_command(["pdftops", "-eps", str(temp_pdf), str(output)])
                except HTTPException as fallback_exc:
                    raise HTTPException(
                        status_code=status.HTTP_501_NOT_IMPLEMENTED,
                        detail="EPS export requires poppler-utils pdftops.",
                    ) from fallback_exc
            return str(output)

        if target_format in {"pdf", "eps"}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="PDF and EPS export are supported for SVG input only.",
            )

        def convert() -> str:
            image = self._apply_color_space(self._load_image(input_path), color_space)
            return self._save_vips_format(
                image,
                output,
                target_format,
                quality=quality,
                strip_metadata=not preserve_metadata,
                png_compression=9,
            )

        try:
            return await self._run_blocking(convert, failure_message="Failed to convert image")
        except HTTPException as exc:
            if target_format != "bmp" or "BMP output" not in str(exc.detail):
                raise
            await self._run_command(["magick", str(input_path), str(output)])
            return str(output)

    async def resize_image(
        self,
        input_path: str | Path,
        output_path: str | Path,
        width: int | None = None,
        height: int | None = None,
        fit: ResizeFit = "cover",
        kernel: str = "lanczos3",
        without_enlargement: bool = False,
        quality: int = 85,
        mode: str = "pixels",
        percentage: float | None = None,
        allow_upscale: bool = True,
        background: str = "#ffffff",
    ) -> dict[str, Any]:
        if mode == "percentage":
            if percentage is None or percentage <= 0:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="percentage must be positive")
        elif width is None and height is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="width or height is required",
            )
        if width is not None and width <= 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="width must be positive")
        if height is not None and height <= 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="height must be positive")
        if fit not in {"cover", "contain", "fill", "inside", "outside", "stretch"}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="fit must be one of: cover, contain, fill, inside, outside, stretch",
            )

        def resize() -> dict[str, Any]:
            image = self._load_image(input_path)
            original_width = int(image.width)
            original_height = int(image.height)

            if mode == "percentage":
                scale = float(percentage or 100) / 100
                target_width = max(1, round(original_width * scale))
                target_height = max(1, round(original_height * scale))
            elif width is None:
                target_height = int(height or original_height)
                target_width = max(1, round(original_width * (target_height / original_height)))
            elif height is None:
                target_width = int(width)
                target_height = max(1, round(original_height * (target_width / original_width)))
            else:
                target_width = int(width)
                target_height = int(height)

            if without_enlargement or not allow_upscale:
                target_width = min(target_width, original_width)
                target_height = min(target_height, original_height)

            if fit == "cover":
                resized = image.thumbnail_image(target_width, height=target_height, size="both", crop="centre", kernel=kernel)
            elif fit == "fill":
                resized = image.thumbnail_image(target_width, height=target_height, size="force", kernel=kernel)
            elif fit == "stretch":
                resized = image.resize(target_width / original_width, vscale=target_height / original_height, kernel=kernel)
            elif fit == "outside":
                resized = image.thumbnail_image(target_width, height=target_height, size="up", kernel=kernel)
            elif fit == "inside":
                resized = image.thumbnail_image(target_width, height=target_height, size="down", kernel=kernel)
            else:
                resized = image.thumbnail_image(target_width, height=target_height, size="both", kernel=kernel)
                if resized.width != target_width or resized.height != target_height:
                    if background.startswith("#") and len(background) == 7:
                        background_value: list[float] | float = [
                            int(background[1:3], 16),
                            int(background[3:5], 16),
                            int(background[5:7], 16),
                        ]
                    else:
                        background_value = 255
                    left = max(0, (target_width - resized.width) // 2)
                    top = max(0, (target_height - resized.height) // 2)
                    resized = resized.embed(left, top, target_width, target_height, background=background_value)

            target_format = self._normalize_format(Path(output_path).suffix, input_path=input_path)
            output = Path(output_path).with_suffix(f".{target_format}")
            saved = self._save_vips_format(
                resized,
                output,
                target_format,
                quality=quality,
                strip_metadata=False,
                png_compression=6,
            )
            return {
                "output_path": saved,
                "original_width": original_width,
                "original_height": original_height,
                "width": int(resized.width),
                "height": int(resized.height),
            }

        return await self._run_blocking(resize, failure_message="Failed to resize image")

    async def compress_image(
        self,
        input_path: str | Path,
        output_path: str | Path,
        quality: int = 85,
        format: ImageFormat | None = None,
        progressive: bool = False,
        strip_metadata: bool = False,
        compression_level: int = 6,
        force_recompress: bool = False,
    ) -> dict[str, Any]:
        if quality < 1 or quality > 100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="quality must be between 1 and 100",
            )

        logger.info("Starting compress_image for file %s", input_path)
        target_format = self._normalize_format(format or Path(output_path).suffix, input_path=input_path)
        output = self._ensure_parent(Path(output_path).with_suffix(f".{target_format}"))
        input_file = Path(input_path)
        original_size = input_file.stat().st_size

        def compress() -> str:
            image = self._load_image(input_path)
            return self._save_vips_format(
                image,
                output,
                target_format,
                quality=quality,
                strip_metadata=strip_metadata,
                png_compression=compression_level,
                progressive=progressive,
            )

        try:
            saved = await self._run_blocking(compress, failure_message="Failed to compress image")
        except HTTPException as exc:
            if target_format == "bmp" and "BMP output" in str(exc.detail):
                await self._run_command(["magick", str(input_path), str(output)])
                saved = str(output)
            elif target_format == "png":
                command = ["magick", str(input_path)]
                if strip_metadata:
                    command.append("-strip")
                command.extend(
                    [
                        "-define",
                        f"png:compression-level={max(0, min(int(compression_level), 9))}",
                        str(output),
                    ]
                )
                await self._run_command(command)
                saved = str(output)
            else:
                raise

        output_size = Path(saved).stat().st_size
        input_format = self._normalize_format("auto", input_path=input_path)
        optimized = output_size < original_size
        message = None

        if not optimized and not force_recompress and target_format == input_format:
            shutil.copy2(input_path, saved)
            output_size = Path(saved).stat().st_size
            message = "Original file was already smaller; kept original to avoid increasing size."

        saved_bytes = max(original_size - output_size, 0)
        saved_percent = round((saved_bytes / original_size) * 100, 2) if original_size else 0.0
        return {
            "output_path": saved,
            "optimized": output_size < original_size,
            "message": message,
            "original_size": original_size,
            "output_size": output_size,
            "saved_bytes": saved_bytes,
            "saved_percent": saved_percent,
        }

    async def crop_image(
        self,
        input_path: str | Path,
        output_path: str | Path,
        x: int,
        y: int,
        width: int,
        height: int,
    ) -> str:
        if min(x, y) < 0 or width <= 0 or height <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="x and y must be non-negative; width and height must be positive",
            )

        def crop() -> str:
            image = self._load_image(input_path)
            if x + width > image.width or y + height > image.height:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Crop area exceeds image bounds",
                )
            cropped = image.extract_area(x, y, width, height)
            return self._save_image(cropped, output_path)

        return await self._run_blocking(crop, failure_message="Failed to crop image")

    async def rotate_image(
        self,
        input_path: str | Path,
        output_path: str | Path,
        angle: int,
        flip_horizontal: bool = False,
        flip_vertical: bool = False,
        output_format: str | None = None,
    ) -> str:
        logger.info("Starting rotate_image for file %s", input_path)

        def rotate() -> str:
            image = self._load_image(input_path)
            normalized = angle % 360
            if normalized == 0:
                rotated = image
            elif normalized == 90:
                rotated = image.rot("d90")
            elif normalized == 180:
                rotated = image.rot("d180")
            elif normalized == 270:
                rotated = image.rot("d270")
            else:
                rotated = image.similarity(angle=angle)
            if flip_horizontal:
                rotated = rotated.fliphor()
            if flip_vertical:
                rotated = rotated.flipver()

            target_format = self._normalize_format(output_format or Path(output_path).suffix, input_path=input_path)
            output = Path(output_path).with_suffix(f".{target_format}")
            save_options: dict[str, Any] = {}
            if target_format in {"jpg", "webp", "avif"}:
                save_options["Q"] = 85
            return self._save_image(rotated, output, **save_options)

        return await self._run_blocking(rotate, failure_message="Failed to rotate image")

    async def watermark_image(
        self,
        input_path: str | Path,
        output_path: str | Path,
        watermark_text: str,
        opacity: float = 0.5,
        position: str = "bottom-right",
        x_percent: float | None = None,
        y_percent: float | None = None,
        font_size: int = 36,
        font_color: str = "#ffffff",
        font_weight: str = "bold",
    ) -> str:
        logger.info("Starting watermark_image for file %s", input_path)
        if not watermark_text:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="watermark_text is required",
            )
        if opacity < 0 or opacity > 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="opacity must be between 0 and 1",
            )

        output = self._ensure_parent(output_path)
        image = self._load_image(input_path)
        offset_x = int(((x_percent if x_percent is not None else 82.0) / 100) * image.width)
        offset_y = int(((y_percent if y_percent is not None else 88.0) / 100) * image.height)
        fill_color = font_color
        if font_color.startswith("#") and len(font_color) == 7:
            red = int(font_color[1:3], 16)
            green = int(font_color[3:5], 16)
            blue = int(font_color[5:7], 16)
            fill_color = f"rgba({red},{green},{blue},{opacity})"
        gravity = "NorthWest"
        if x_percent is None or y_percent is None:
            gravity = {
                "top-left": "NorthWest",
                "top": "North",
                "top-right": "NorthEast",
                "left": "West",
                "center": "Center",
                "right": "East",
                "bottom-left": "SouthWest",
                "bottom": "South",
                "bottom-right": "SouthEast",
            }.get(position)

            if gravity is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="position must be a valid gravity position",
                )

        command = [
            "convert",
            str(input_path),
            "-pointsize",
            str(font_size),
            "-font",
            "Arial-Bold" if font_weight == "bold" else "Arial",
            "-fill",
            fill_color,
            "-gravity",
            gravity,
            "-alpha",
            "on",
            "-annotate",
            f"+{offset_x}+{offset_y}" if gravity == "NorthWest" else "+10+10",
            watermark_text,
            str(output),
        ]
        await self._run_command(command)
        return str(output)

    async def remove_background(self, input_path: str | Path, output_path: str | Path) -> str:
        output = self._ensure_parent(Path(output_path).with_suffix(".png"))

        def remove() -> str:
            import cv2
            import numpy as np

            image = cv2.imread(str(input_path), cv2.IMREAD_COLOR)
            if image is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Could not load image",
                )

            height, width = image.shape[:2]
            margin_x = max(1, int(width * 0.05)) if width > 2 else 0
            margin_y = max(1, int(height * 0.05)) if height > 2 else 0
            rect = (margin_x, margin_y, max(1, width - 2 * margin_x), max(1, height - 2 * margin_y))
            mask = np.zeros((height, width), np.uint8)
            bgd_model = np.zeros((1, 65), np.float64)
            fgd_model = np.zeros((1, 65), np.float64)

            cv2.grabCut(image, mask, rect, bgd_model, fgd_model, 5, cv2.GC_INIT_WITH_RECT)
            foreground_mask = np.where(
                (mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD),
                255,
                0,
            ).astype("uint8")
            bgra = cv2.cvtColor(image, cv2.COLOR_BGR2BGRA)
            bgra[:, :, 3] = foreground_mask

            if not cv2.imwrite(str(output), bgra):
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to save background-removed image",
                )
            return str(output)

        return await self._run_blocking(remove, failure_message="Failed to remove image background")

    async def ocr_image(
        self,
        input_path: str | Path,
        output_dir: str | Path,
        language: str = "eng",
        output_format: str = "txt",
    ) -> str:
        logger.info("Starting ocr_image for file %s", input_path)
        normalized_output = output_format.lower().strip()
        aliases = {"text": "txt", "searchable_pdf": "pdf", "html": "hocr"}
        normalized_output = aliases.get(normalized_output, normalized_output)
        if normalized_output not in {"txt", "pdf", "json", "docx", "hocr"}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="output_format must be one of: txt, pdf, json, docx, hocr",
            )

        output_directory = Path(output_dir)
        output_directory.mkdir(parents=True, exist_ok=True)
        input_file = Path(input_path)

        if normalized_output in {"txt", "docx"}:
            stdout, _ = await self._run_command(["tesseract", str(input_file), "stdout", "-l", language])
            text = stdout.strip()
            if normalized_output == "docx":
                output = self._ensure_parent(output_directory / "ocr-output.docx")

                def write_docx() -> None:
                    from docx import Document

                    document = Document()
                    for paragraph in text.splitlines() or [text]:
                        document.add_paragraph(paragraph)
                    document.save(output)

                await asyncio.to_thread(write_docx)
                return str(output)

            output = self._ensure_parent(output_directory / "ocr-output.txt")
            await asyncio.to_thread(output.write_text, text, "utf-8")
            return str(output)

        if normalized_output == "json":
            output_base = output_directory / "ocr-output"
            await self._run_command(["tesseract", str(input_file), str(output_base), "-l", language, "tsv"])
            payload = {"language": language, "pages": [self._parse_tsv_content(output_base.with_suffix(".tsv").read_text(encoding="utf-8"))]}
            output = self._ensure_parent(output_directory / "ocr-output.json")
            await asyncio.to_thread(output.write_text, json.dumps(payload, indent=2), "utf-8")
            return str(output)

        if normalized_output == "hocr":
            output_base = output_directory / "ocr-output"
            await self._run_command(["tesseract", str(input_file), str(output_base), "-l", language, "hocr"])
            return str(output_base.with_suffix(".hocr"))

        output_base = output_directory / "ocr-output"
        await self._run_command(["tesseract", str(input_file), str(output_base), "-l", language, "pdf"])
        return str(output_base.with_suffix(".pdf"))

    async def batch_resize(
        self,
        input_paths: list[str | Path],
        output_dir: str | Path,
        width: int,
        height: int,
    ) -> list[str]:
        if not input_paths:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one image is required",
            )
        if width <= 0 or height <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="width and height must be positive",
            )

        output_directory = Path(output_dir)
        output_directory.mkdir(parents=True, exist_ok=True)

        def resize_one(input_path: str | Path) -> str:
            image = self._load_image(input_path)
            resized = image.thumbnail_image(width, height=height, size="both", crop="centre")
            output = output_directory / f"{Path(input_path).stem}.jpg"
            return self._save_image(resized, output)

        loop = asyncio.get_running_loop()
        try:
            with ThreadPoolExecutor() as executor:
                tasks = [loop.run_in_executor(executor, resize_one, path) for path in input_paths]
                return await asyncio.gather(*tasks)
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to batch resize images",
            ) from exc

    async def get_image_info(self, input_path: str | Path) -> dict[str, Any]:
        def info() -> dict[str, Any]:
            image = self._load_image(input_path)
            return {
                "width": image.width,
                "height": image.height,
                "format": image.get("vips-loader") if image.get_typeof("vips-loader") else Path(input_path).suffix.lstrip("."),
                "size_bytes": Path(input_path).stat().st_size,
                "bands": image.bands,
                "interpretation": str(image.interpretation),
            }

        return await self._run_blocking(info, failure_message="Failed to read image info")
