import asyncio
import logging
import re
from pathlib import Path
from typing import Literal

from fastapi import HTTPException, status

logger = logging.getLogger(__name__)

PdfQuality = Literal["screen", "ebook", "printer", "prepress"]
ImageFormat = Literal["png", "jpg", "jpeg", "pam", "pbm", "pgm", "ppm", "pnm"]


class PDFService:
    async def _run_command(
        self,
        command: list[str],
        *,
        failure_status: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
    ) -> None:
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

        if process.returncode != 0:
            error = stderr.decode("utf-8", errors="replace").strip()
            output = stdout.decode("utf-8", errors="replace").strip()
            detail = error or output or f"{command[0]} exited with code {process.returncode}"
            raise HTTPException(status_code=failure_status, detail=detail)

    def _ensure_parent(self, output_path: str | Path) -> Path:
        path = Path(output_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        return path

    async def compress_pdf(
        self,
        input_path: str | Path,
        output_path: str | Path,
        quality: PdfQuality = "ebook",
    ) -> str:
        if quality not in {"screen", "ebook", "printer", "prepress"}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="quality must be one of: screen, ebook, printer, prepress",
            )

        output = self._ensure_parent(output_path)
        command = [
            "gs",
            "-dBATCH",
            "-dNOPAUSE",
            "-sDEVICE=pdfwrite",
            f"-dPDFSETTINGS=/{quality}",
            f"-sOutputFile={output}",
            str(input_path),
        ]
        await self._run_command(command)
        return str(output)

    async def merge_pdfs(self, input_paths: list[str | Path], output_path: str | Path) -> str:
        if len(input_paths) < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least two PDFs are required to merge",
            )

        output = self._ensure_parent(output_path)
        command = ["qpdf", "--empty", "--pages", *[str(path) for path in input_paths], "--", str(output)]
        await self._run_command(command)
        return str(output)

    async def split_pdf(self, input_path: str | Path, output_dir: str | Path, pages: str) -> list[str]:
        output_directory = Path(output_dir)
        output_directory.mkdir(parents=True, exist_ok=True)
        safe_pages = re.sub(r"[^0-9A-Za-z_-]+", "_", pages).strip("_") or "pages"
        output = output_directory / f"{Path(input_path).stem}-{safe_pages}.pdf"
        command = ["qpdf", str(input_path), "--pages", ".", pages, "--", str(output)]
        await self._run_command(command)
        return [str(output)]

    async def rotate_pdf(
        self,
        input_path: str | Path,
        output_path: str | Path,
        angle: int,
        pages: str = "all",
    ) -> str:
        if angle not in {0, 90, 180, 270}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="angle must be one of: 0, 90, 180, 270",
            )

        output = self._ensure_parent(output_path)
        command = ["qpdf", str(input_path), f"--rotate={angle}:{pages}", str(output)]
        await self._run_command(command)
        return str(output)

    async def extract_text(
        self,
        input_path: str | Path,
        output_path: str | Path,
        layout: bool = True,
    ) -> str:
        output = self._ensure_parent(output_path)
        command = ["pdftotext"]
        if layout:
            command.append("-layout")
        command.extend([str(input_path), str(output)])
        await self._run_command(command)
        return str(output)

    async def pdf_to_images(
        self,
        input_path: str | Path,
        output_dir: str | Path,
        dpi: int = 150,
        format: ImageFormat = "png",
    ) -> list[str]:
        if dpi < 1 or dpi > 1200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="dpi must be between 1 and 1200",
            )

        output_directory = Path(output_dir)
        output_directory.mkdir(parents=True, exist_ok=True)
        output_pattern = output_directory / f"page-%03d.{format}"
        command = ["mutool", "draw", "-r", str(dpi), "-F", format, "-o", str(output_pattern), str(input_path)]
        await self._run_command(command)
        return sorted(str(path) for path in output_directory.glob(f"page-*.{format}"))

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
        return str(output_directory / f"{Path(input_path).stem}.pdf")

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
        command = [
            "qpdf",
            "--encrypt",
            user_password,
            owner_password,
            "256",
            "--",
            str(input_path),
            str(output),
        ]
        await self._run_command(command)
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
        command = ["qpdf", "--decrypt", f"--password={password}", str(input_path), str(output)]
        await self._run_command(command)
        return str(output)

    async def repair_pdf(self, input_path: str | Path, output_path: str | Path) -> str:
        output = self._ensure_parent(output_path)
        command = ["qpdf", str(input_path), str(output)]
        await self._run_command(command)
        return str(output)
