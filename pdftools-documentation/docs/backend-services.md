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

