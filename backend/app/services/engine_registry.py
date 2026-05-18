from __future__ import annotations

import shutil
from dataclasses import dataclass
from typing import Iterable

from fastapi import HTTPException, status


@dataclass(frozen=True)
class EngineDefinition:
    id: str
    label: str
    description: str
    workflows: tuple[str, ...] = ()
    input_categories: tuple[str, ...] = ()
    input_extensions: tuple[str, ...] = ()
    output_formats: tuple[str, ...] = ()
    executables: tuple[str, ...] = ()
    caveats: str = ""


ENGINE_REGISTRY: dict[str, EngineDefinition] = {
    "auto": EngineDefinition(
        id="auto",
        label="Auto recommended",
        description="PDFTools chooses the best available method for this file.",
    ),
    "ghostscript": EngineDefinition(
        id="ghostscript",
        label="Ghostscript",
        description="Good for reducing image-heavy PDFs. May change compression quality.",
        workflows=("compress",),
        input_categories=("pdf",),
        output_formats=("pdf",),
        executables=("gs",),
    ),
    "qpdf": EngineDefinition(
        id="qpdf",
        label="qpdf",
        description="Lossless PDF structure optimization. Usually safer but smaller savings.",
        workflows=("compress",),
        input_categories=("pdf",),
        output_formats=("pdf",),
        executables=("qpdf",),
    ),
    "ocrmypdf": EngineDefinition(
        id="ocrmypdf",
        label="OCRmyPDF",
        description="Optimizes PDFs through OCRmyPDF's PDF optimizer.",
        workflows=("compress",),
        input_categories=("pdf",),
        output_formats=("pdf",),
        executables=("ocrmypdf",),
        caveats="Best for PDFs where OCRmyPDF is installed and can safely rewrite the file.",
    ),
    "pngquant": EngineDefinition(
        id="pngquant",
        label="pngquant",
        description="Smaller PNGs using palette reduction.",
        workflows=("compress",),
        input_categories=("image",),
        input_extensions=("png",),
        executables=("pngquant",),
    ),
    "oxipng": EngineDefinition(
        id="oxipng",
        label="oxipng",
        description="Lossless PNG optimization.",
        workflows=("compress",),
        input_categories=("image",),
        input_extensions=("png",),
        executables=("oxipng",),
    ),
    "optipng": EngineDefinition(
        id="optipng",
        label="optipng",
        description="Lossless PNG optimization with broad compatibility.",
        workflows=("compress",),
        input_categories=("image",),
        input_extensions=("png",),
        executables=("optipng",),
    ),
    "jpegoptim": EngineDefinition(
        id="jpegoptim",
        label="jpegoptim",
        description="JPEG optimization for photos and scanned images.",
        workflows=("compress",),
        input_categories=("image",),
        input_extensions=("jpg", "jpeg"),
        executables=("jpegoptim",),
    ),
    "cwebp": EngineDefinition(
        id="cwebp",
        label="cwebp",
        description="Encodes images as WebP.",
        workflows=("compress",),
        input_categories=("image",),
        output_formats=("webp",),
        executables=("cwebp",),
    ),
    "avifenc": EngineDefinition(
        id="avifenc",
        label="avifenc",
        description="Encodes images as AVIF.",
        workflows=("compress",),
        input_categories=("image",),
        output_formats=("avif",),
        executables=("avifenc",),
    ),
    "gifsicle": EngineDefinition(
        id="gifsicle",
        label="gifsicle",
        description="Optimizes GIF files.",
        workflows=("compress",),
        input_categories=("image",),
        input_extensions=("gif",),
        executables=("gifsicle",),
    ),
    "imagemagick": EngineDefinition(
        id="imagemagick",
        label="ImageMagick",
        description="General image conversion and fallback compression.",
        workflows=("compress", "convert"),
        input_categories=("image",),
        executables=("convert", "magick"),
        caveats="Output depends on ImageMagick's installed delegates.",
    ),
    "sevenzip": EngineDefinition(
        id="sevenzip",
        label="7z",
        description="Repackages files or ZIP archives as 7z.",
        workflows=("compress",),
        input_categories=("archive", "text"),
        output_formats=("7z",),
        executables=("7z",),
    ),
    "advzip": EngineDefinition(
        id="advzip",
        label="AdvanceCOMP advzip",
        description="Optimizes ZIP archives after safe repacking.",
        workflows=("compress",),
        input_categories=("archive",),
        input_extensions=("zip",),
        executables=("advzip",),
    ),
    "brotli": EngineDefinition(
        id="brotli",
        label="Brotli",
        description="Compresses text and data files to .br output.",
        workflows=("compress",),
        input_categories=("text",),
        output_formats=("br",),
        executables=("brotli",),
    ),
    "libreoffice": EngineDefinition(
        id="libreoffice",
        label="LibreOffice",
        description="Converts Office documents to PDF.",
        workflows=("convert",),
        input_categories=("office",),
        output_formats=("pdf",),
        executables=("libreoffice",),
    ),
    "inkscape": EngineDefinition(
        id="inkscape",
        label="Inkscape",
        description="Renders SVG files for conversion.",
        workflows=("convert",),
        input_categories=("image",),
        input_extensions=("svg",),
        executables=("inkscape",),
    ),
    "mutool": EngineDefinition(
        id="mutool",
        label="mutool",
        description="Renders PDF pages to image formats.",
        workflows=("convert",),
        input_categories=("pdf",),
        output_formats=("png", "jpg", "jpeg"),
        executables=("mutool",),
    ),
    "tesseract": EngineDefinition(
        id="tesseract",
        label="Tesseract",
        description="Runs OCR on image files.",
        workflows=("ocr",),
        input_categories=("image",),
        executables=("tesseract",),
    ),
}

ENGINE_ALIASES = {
    "7z": "sevenzip",
    "gs": "ghostscript",
    "ghostscript/gs": "ghostscript",
    "image-magick": "imagemagick",
    "imagemagick-convert": "imagemagick",
}

UNKNOWN_ENGINE_MESSAGE = "Unknown processing engine."
INCOMPATIBLE_ENGINE_MESSAGE = "This processing engine does not support the selected file type or output."
MISSING_ENGINE_MESSAGE = "Selected processing engine is not available on this server. Use Auto or choose another engine."


def _normalize_values(values: Iterable[str | None]) -> set[str]:
    return {str(value).lower().lstrip(".") for value in values if value}


def normalize_engine(engine: str | None) -> str:
    if engine is None:
        return "auto"
    normalized = str(engine).strip().lower()
    if not normalized:
        return "auto"
    normalized = ENGINE_ALIASES.get(normalized, normalized)
    if normalized not in ENGINE_REGISTRY:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=UNKNOWN_ENGINE_MESSAGE)
    return normalized


def is_engine_available(engine: str) -> bool:
    definition = ENGINE_REGISTRY[normalize_engine(engine)]
    if not definition.executables:
        return True
    return any(shutil.which(executable) for executable in definition.executables)


def validate_engine_for_workflow(
    engine: str | None,
    workflow: str,
    input_category: str,
    *,
    input_extension: str | None = None,
    output_format: str | None = None,
    require_available: bool = True,
) -> str:
    engine_id = normalize_engine(engine)
    if engine_id == "auto":
        return engine_id

    definition = ENGINE_REGISTRY[engine_id]
    workflow_key = workflow.lower()
    category_key = input_category.lower()
    input_ext = str(input_extension or "").lower().lstrip(".")
    output_key = str(output_format or "").lower().lstrip(".")

    if workflow_key not in definition.workflows or category_key not in definition.input_categories:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=INCOMPATIBLE_ENGINE_MESSAGE)

    allowed_extensions = _normalize_values(definition.input_extensions)
    allowed_outputs = _normalize_values(definition.output_formats)
    extension_matches = not allowed_extensions or input_ext in allowed_extensions
    output_matches = not allowed_outputs or output_key in allowed_outputs

    if allowed_extensions and allowed_outputs:
        compatible = extension_matches or output_matches
    else:
        compatible = extension_matches and output_matches

    if not compatible:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=INCOMPATIBLE_ENGINE_MESSAGE)

    if require_available and not is_engine_available(engine_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=MISSING_ENGINE_MESSAGE)

    return engine_id


def get_compatible_engines(
    workflow: str,
    input_category: str,
    *,
    input_extension: str | None = None,
    output_format: str | None = None,
    include_unavailable: bool = False,
) -> list[EngineDefinition]:
    compatible = [ENGINE_REGISTRY["auto"]]
    for engine_id, definition in ENGINE_REGISTRY.items():
        if engine_id == "auto":
            continue
        try:
            validate_engine_for_workflow(
                engine_id,
                workflow,
                input_category,
                input_extension=input_extension,
                output_format=output_format,
                require_available=not include_unavailable,
            )
        except HTTPException:
            continue
        compatible.append(definition)
    return compatible
