# Backend Services

## Purpose

Map each backend service file to its responsibilities.

## Services

### `file_store.py`

- upload save and metadata persistence
- preview and thumbnail generation
- PDF page rendering
- safe path resolution

### `conversion_service.py`

- format detection and normalization
- route shared conversion logic across PDFs, images, text, CSV, Office, and SVG
- media type mapping

### `compression_service.py`

- category detection
- multi-tool compression strategies
- target-size handling
- fallback packaging
- archive extraction safety

### `pdf_service.py`

- PDF merge, split, rotate
- watermarking
- encrypt/decrypt
- extract text
- PDF to images
- images to PDF
- Office to PDF

### `image_service.py`

- image convert
- resize
- compress
- crop
- rotate
- watermark
- OCR image bridge
- batch resize
- metadata extraction

### `ocr_service.py`

- shared OCR flow for PDF and images
- password-aware PDF OCR
- searchable PDF and HOCR generation

### `svg_rasterizer.py`

- suspicious SVG detection
- safe SVG rasterization to PNG
- Inkscape preferred, `convert` fallback

## Related Documents

- [celery-workers.md](./celery-workers.md)
- [workers-and-queues.md](./workers-and-queues.md)

## Current File Tools Services

- `hash_service.py` - hashes and checksum verification
- `filetype_service.py` - file type and extension mismatch inspection
- `metadata_service.py` - metadata view and cleaning helpers
- `archive_service.py` - archive create, extract, inspect, and post-extraction scan integration
- `rename_service.py` - batch rename and filename sanitization
- `duplicate_service.py` - duplicate detection
- `compare_service.py` - binary/text file comparison
- `split_join_service.py` - generic file split and join
- `office_file_service.py` - Office metadata, media, and macro inspection
- `security_file_service.py` - archive safety, macro checks, and filename checks
- `report_service.py` - inventory/report output helpers
- `file_tools_service.py` - shared orchestration helpers for File Tools
- `virus_scanner.py` - ClamAV Unix socket integration with fail-open behavior

File Tools are exposed through `/api/file-tools/*` and processed by `file_tools_tasks.py`.
