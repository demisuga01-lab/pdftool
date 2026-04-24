import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any, Literal

from fastapi import HTTPException, status

logger = logging.getLogger(__name__)

ImageFormat = Literal["jpg", "jpeg", "png", "webp", "tiff", "avif"]
ResizeFit = Literal["cover", "contain", "fill"]


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

    def _normalize_format(self, format: str) -> str:
        normalized = format.lower().lstrip(".")
        if normalized == "jpeg":
            return "jpg"
        if normalized == "tif":
            return "tiff"
        if normalized not in {"jpg", "png", "webp", "tiff", "avif"}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="format must be one of: jpg, png, webp, tiff, avif",
            )
        return normalized

    def _load_image(self, input_path: str | Path) -> Any:
        import pyvips

        return pyvips.Image.new_from_file(str(input_path), access="sequential")

    def _save_image(self, image: Any, output_path: str | Path, **options: Any) -> str:
        output = self._ensure_parent(output_path)
        image.write_to_file(str(output), **options)
        return str(output)

    async def convert_image(
        self,
        input_path: str | Path,
        output_path: str | Path,
        format: ImageFormat,
    ) -> str:
        target_format = self._normalize_format(format)
        output = self._ensure_parent(Path(output_path).with_suffix(f".{target_format}"))

        def convert() -> str:
            image = self._load_image(input_path)
            return self._save_image(image, output)

        return await self._run_blocking(convert, failure_message="Failed to convert image")

    async def resize_image(
        self,
        input_path: str | Path,
        output_path: str | Path,
        width: int | None = None,
        height: int | None = None,
        fit: ResizeFit = "cover",
    ) -> str:
        if width is None and height is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="width or height is required",
            )
        if width is not None and width <= 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="width must be positive")
        if height is not None and height <= 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="height must be positive")
        if fit not in {"cover", "contain", "fill"}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="fit must be one of: cover, contain, fill",
            )

        thumb_width = width or height
        thumb_height = height or width
        assert thumb_width is not None

        def resize() -> str:
            image = self._load_image(input_path)
            if fit == "cover":
                resized = image.thumbnail_image(thumb_width, height=thumb_height, size="both", crop="centre")
            elif fit == "fill":
                resized = image.thumbnail_image(thumb_width, height=thumb_height, size="force")
            else:
                resized = image.thumbnail_image(thumb_width, height=thumb_height, size="down")
            return self._save_image(resized, output_path)

        return await self._run_blocking(resize, failure_message="Failed to resize image")

    async def compress_image(
        self,
        input_path: str | Path,
        output_path: str | Path,
        quality: int = 85,
        format: ImageFormat | None = None,
    ) -> str:
        if quality < 1 or quality > 100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="quality must be between 1 and 100",
            )

        target_format = self._normalize_format(format or Path(output_path).suffix or "jpg")
        output = self._ensure_parent(Path(output_path).with_suffix(f".{target_format}"))

        def compress() -> str:
            image = self._load_image(input_path)
            return self._save_image(image, output, Q=quality)

        return await self._run_blocking(compress, failure_message="Failed to compress image")

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

    async def rotate_image(self, input_path: str | Path, output_path: str | Path, angle: int) -> str:
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
            return self._save_image(rotated, output_path)

        return await self._run_blocking(rotate, failure_message="Failed to rotate image")

    async def watermark_image(
        self,
        input_path: str | Path,
        output_path: str | Path,
        watermark_text: str,
        opacity: float = 0.5,
        position: str = "bottom-right",
    ) -> str:
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

        output = self._ensure_parent(output_path)
        command = [
            "convert",
            str(input_path),
            "-pointsize",
            "36",
            "-fill",
            f"rgba(255,255,255,{opacity})",
            "-gravity",
            gravity,
            "-annotate",
            "+10+10",
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

    async def ocr_image(self, input_path: str | Path, language: str = "eng") -> str:
        stdout, _ = await self._run_command(["tesseract", str(input_path), "stdout", "-l", language])
        return stdout

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
