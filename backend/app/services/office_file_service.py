from __future__ import annotations

import shutil
import zipfile
from pathlib import Path
from typing import Any
from xml.etree import ElementTree

from fastapi import HTTPException, status

from app.services.file_tools_service import output_path, zip_files

CORE_FIELDS = {
    "author": "{http://purl.org/dc/elements/1.1/}creator",
    "created": "{http://purl.org/dc/terms/}created",
    "modified": "{http://purl.org/dc/terms/}modified",
    "description": "{http://purl.org/dc/elements/1.1/}description",
    "keywords": "{http://schemas.openxmlformats.org/package/2006/metadata/core-properties}keywords",
    "subject": "{http://purl.org/dc/elements/1.1/}subject",
    "title": "{http://purl.org/dc/elements/1.1/}title",
    "category": "{http://schemas.openxmlformats.org/package/2006/metadata/core-properties}category",
    "last_modified_by": "{http://schemas.openxmlformats.org/package/2006/metadata/core-properties}lastModifiedBy",
    "revision": "{http://schemas.openxmlformats.org/package/2006/metadata/core-properties}revision",
}


class OfficeFileService:
    def _ensure_office(self, path: Path) -> None:
        if path.suffix.lower() not in {".docx", ".xlsx", ".pptx"}:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only DOCX, XLSX, and PPTX files are supported.")

    async def clean_metadata(self, input_path: str, output_dir: str, fields: list[str] | str = "all") -> dict[str, Any]:
        source = Path(input_path)
        self._ensure_office(source)
        output = output_path(output_dir, f"{source.stem}-cleaned{source.suffix}")
        selected = set(CORE_FIELDS if fields == "all" or fields == ["all"] else fields)
        with zipfile.ZipFile(source) as zin, zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED) as zout:
            for item in zin.infolist():
                data = zin.read(item.filename)
                if item.filename in {"docProps/core.xml", "docProps/app.xml"}:
                    try:
                        root = ElementTree.fromstring(data)
                        for field in selected:
                            tag = CORE_FIELDS.get(field)
                            if tag is not None:
                                found = root.find(tag)
                                if found is not None:
                                    found.text = ""
                        data = ElementTree.tostring(root, encoding="utf-8", xml_declaration=True)
                    except ElementTree.ParseError:
                        pass
                zout.writestr(item, data)
        return {"output_path": str(output), "output_filename": output.name, "media_type": "application/octet-stream", "extension": output.suffix.lstrip(".")}

    async def extract_media(self, input_path: str, output_dir: str) -> dict[str, Any]:
        source = Path(input_path)
        self._ensure_office(source)
        media_dir = Path(output_dir) / "media"
        media_dir.mkdir(parents=True, exist_ok=True)
        extracted: list[Path] = []
        with zipfile.ZipFile(source) as archive:
            for item in archive.infolist():
                if item.filename.startswith(("word/media/", "ppt/media/", "xl/media/")) and not item.is_dir():
                    target = media_dir / Path(item.filename).name
                    target.write_bytes(archive.read(item.filename))
                    extracted.append(target)
        if not extracted:
            return {"result": {"message": "No embedded media found in this file."}}
        output = output_path(output_dir, f"{source.stem}-media.zip")
        zip_files(extracted, output)
        return {"output_path": str(output), "output_filename": output.name, "media_type": "application/zip", "extension": "zip"}
