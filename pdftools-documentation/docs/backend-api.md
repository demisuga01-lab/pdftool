# Backend API Details

## Purpose

Deeper endpoint notes for the FastAPI backend.

## Health

### `GET /api/health`

- Purpose: simple backend health check
- Rate limiting: excluded
- Response: basic service status object

## Files Routes

### `POST /api/files/upload`

- Purpose: save one file and return `file_id` plus preview metadata
- Validation: file size/type checks
- Response: upload metadata object

### `POST /api/files/upload-multiple`

- Purpose: save multiple files
- Validation: batch size and per-file checks

### `GET /api/files/{file_id}`

- Purpose: metadata lookup by saved file ID

### `GET /api/files/preview/{file_id}`

- Purpose: browser-safe preview when available

### `GET /api/files/thumbnail/{file_id}`

- Purpose: small preview image

### `GET /api/files/pdf-page/{file_id}/{page_number}`

- Purpose: render a single PDF page with zoom

### `GET /api/files/pdf-info/{file_id}`

- Purpose: PDF page count and encryption metadata

## Compression Routes

### `POST /api/compress`

- Purpose: start universal compression
- Request: file or `file_id`, mode, JSON settings
- Queue: `heavy`

### `POST /api/compress/json`

- Purpose: JSON-style compression request using saved `file_id`

### `GET /api/compress/status/{job_id}`

- Purpose: poll compression job status

### `GET /api/compress/download/{job_id}`

- Purpose: serve final compressed file or ZIP package

## Convert Routes

### `POST /api/convert`

- Purpose: start universal conversion
- Request: `to_format`, file or `file_id`, optional `from_format`, optional `engine`, optional JSON settings
- Queue: `heavy`

### `GET /api/convert/status/{job_id}`

- Purpose: poll conversion job status

### `GET /api/convert/download/{job_id}`

- Purpose: download conversion result

## OCR Routes

### `POST /api/ocr`

- Purpose: shared OCR entry point
- Queue: `heavy`

## File Tools Routes

### `POST /api/file-tools/{tool_name}`

- Purpose: start a File Tools job
- Input: file upload or saved `file_id` depending on tool
- Limit: `FILE_TOOLS_MAX_FILE_SIZE_MB`, currently 100 MB
- Queue: `fast` for most tools; `heavy` for archive create/extract and metadata-cleaning tools
- Result: downloadable output or inline JSON depending on tool

Implemented tool names:

- `hash`
- `hash-batch`
- `checksum-verify`
- `file-type`
- `virus-scan`
- `extension-check`
- `metadata-view`
- `metadata-clean`
- `archive-create`
- `archive-extract`
- `archive-inspect`
- `archive-safety`
- `batch-rename`
- `filename-sanitize`
- `duplicate-find`
- `file-compare`
- `file-split`
- `file-join`
- `office-metadata-clean`
- `office-media-extract`
- `macro-check`
- `filename-check`
- `inventory-report`
- `text-encoding-convert`

### `POST /api/file-tools/virus-scan`

- Purpose: scan any file with ClamAV signature detection
- Input: file or saved `file_id`
- Extension policy: accepts any extension for this route only
- Processing: scans and returns inline JSON; does not execute or transform the file
- Failure mode: scanner unavailable returns `scanner: "unavailable"` from the service and does not block upload

### `GET /api/file-tools/status/{job_id}`

- Purpose: poll File Tools job status

### `GET /api/file-tools/download/{job_id}`

- Purpose: download output for File Tools jobs that produce files

## PDF Routes

Important patterns:

- job routes reuse shared status/download format
- most PDF tool endpoints accept either uploaded file or saved `file_id`
- multi-output downloads are zipped on demand

Notable endpoints:

- `/api/pdf/merge`
- `/api/pdf/split`
- `/api/pdf/rotate`
- `/api/pdf/watermark`
- `/api/pdf/extract-text`
- `/api/pdf/to-word`
- `/api/pdf/to-excel`
- `/api/pdf/to-html`
- `/api/pdf/to-images`
- `/api/pdf/images-to-pdf`
- `/api/pdf/office-to-pdf`
- `/api/pdf/encrypt`
- `/api/pdf/decrypt`
- `/api/pdf/ocr`

### `/api/pdf/split`

- accepts `mode`, `pages`, `page_order`, `ranges`, `naming_pattern`, and `output_filename` as multipart form fields
- supports `split_all`, `extract_selected`, `split_selected`, `custom_ranges`, and `reorder_export`
- validates page selections as 1-based page numbers inside the uploaded PDF page count
- returns one PDF for `extract_selected` and `reorder_export`
- returns ZIP packaging for multi-output split jobs
- custom ranges use original page numbers

## Image Routes

Notable endpoints:

- `/api/image/convert`
- `/api/image/resize`
- `/api/image/compress`
- `/api/image/crop`
- `/api/image/rotate`
- `/api/image/watermark`
- `/api/image/remove-background`
- `/api/image/ocr`
- `/api/image/batch-resize`
- `/api/image/info`

## Response and Failure Behavior

- status endpoints normalize task state into `queued`, `processing`, `success`, or `failure`
- download endpoints reject incomplete jobs with `409`
- failed jobs return sanitized errors
- output paths are verified to stay inside configured output root

## Related Documents

- [../API_REFERENCE.md](../API_REFERENCE.md)
- [error-handling.md](./error-handling.md)
- [rate-limiting.md](./rate-limiting.md)
