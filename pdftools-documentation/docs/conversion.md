# Conversion

## Purpose

Document the shared conversion system and route wrappers around it.

## Audience

- Developers
- QA
- Support staff

## Overview

The universal conversion route is asynchronous and accepts many input families. Support is explicit, not unlimited.

## Format Normalization

Implemented normalization rules include:

- `jpeg` -> `jpg`
- `jpg` -> canonical `jpg`
- `tif` -> `tiff`
- `htm` -> `html`
- `text` / `plain` -> `txt`

This is why PDF to JPG works without the older `Unknown output format 'jpg'` bug.

## Supported Input Families

- PDF
- Office formats
- spreadsheets
- CSV
- TXT and HTML
- images
- SVG

## Supported Output Highlights

- PDF -> DOCX
- PDF -> XLSX
- PDF -> TXT
- PDF -> HTML
- PDF -> PNG/JPG/WebP ZIP
- PDF -> searchable PDF
- Office/text -> PDF
- CSV -> XLSX
- XLSX -> CSV
- SVG -> PNG/PDF/EPS
- image -> JPG/PNG/WebP/AVIF/TIFF/BMP/PDF

## Important Notes

- PDF to JPG is implemented using canonical `jpg` and correct `image/jpeg` MIME mapping
- PDF to image outputs download as ZIP because the result is multi-file
- image to PDF uses the PDF service path
- Office conversion depends on LibreOffice

## Queueing

- shared conversion task runs on `heavy`

## Related Documents

- [backend-api.md](./backend-api.md)
- [external-tools.md](./external-tools.md)
- [pdf-tools.md](./pdf-tools.md)
- [image-tools.md](./image-tools.md)

