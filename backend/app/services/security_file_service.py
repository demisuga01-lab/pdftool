from __future__ import annotations

import re
import zipfile
from pathlib import Path
from typing import Any

from app.services.file_tools_service import RESERVED_WINDOWS_NAMES, SUSPICIOUS_EXTENSIONS


class SecurityFileService:
    async def macro_check(self, input_path: str) -> dict[str, Any]:
        path = Path(input_path)
        locations: list[str] = []
        macro_type = "none"
        if zipfile.is_zipfile(path):
            with zipfile.ZipFile(path) as archive:
                names = archive.namelist()
                locations = [name for name in names if name.endswith("vbaProject.bin")]
                if locations:
                    macro_type = "VBA"
                elif "xl/workbook.xml" in names:
                    workbook = archive.read("xl/workbook.xml").decode("utf-8", errors="ignore")
                    if re.search(r'name=["\']macro', workbook, flags=re.IGNORECASE):
                        macro_type = "XLM"
                        locations = ["xl/workbook.xml"]
        return {
            "filename": path.name,
            "macros_found": bool(locations),
            "macro_type": macro_type,
            "locations": locations,
            "warning": "File contains macros. Review before opening." if locations else "",
        }

    def filename_check(self, filename: str) -> dict[str, Any]:
        name = Path(filename).name
        warnings: list[dict[str, str]] = []
        suffixes = [suffix.lower() for suffix in Path(name.strip()).suffixes]
        if any(ord(char) < 32 or char == "\x00" for char in name):
            warnings.append({"type": "control_character", "detail": "Filename contains control characters.", "severity": "high"})
        if Path(name).stem.upper() in RESERVED_WINDOWS_NAMES:
            warnings.append({"type": "reserved_name", "detail": "Filename uses a reserved Windows name.", "severity": "medium"})
        if len(name) > 200:
            warnings.append({"type": "long_filename", "detail": "Filename is unusually long.", "severity": "low"})
        if suffixes and suffixes[-1] in SUSPICIOUS_EXTENSIONS:
            warnings.append({"type": "dangerous_extension", "detail": f"Filename ends with {suffixes[-1]}.", "severity": "high"})
        if len(suffixes) >= 2 and suffixes[-1] in SUSPICIOUS_EXTENSIONS:
            warnings.append({"type": "double_extension", "detail": "Filename has a double extension.", "severity": "high"})
        if re.search(r"\.(pdf|docx?|xlsx?|png|jpg)\s{5,}\.", name, flags=re.IGNORECASE):
            warnings.append({"type": "hidden_extension", "detail": "Filename may hide its real extension with spaces.", "severity": "high"})
        if any(ord(char) > 127 for char in name):
            warnings.append({"type": "unicode", "detail": "Filename contains non-ASCII characters that may be lookalikes.", "severity": "medium"})
        return {"filename": name, "safe": not warnings, "warnings": warnings}
