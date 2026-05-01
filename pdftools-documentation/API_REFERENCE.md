# API Reference

## Purpose

Backend API reference for the FastAPI service mounted at `/api`.

## Audience

- Frontend developers
- Backend developers
- Integrators
- Operators validating production behavior

## Scope

This file summarizes the route families and expected behaviors. The deeper per-endpoint notes live in [docs/backend-api.md](./docs/backend-api.md).

## API Base

- Public API path through frontend: `/api/...`
- Backend health endpoint: `/api/health`

## Route Families

| Prefix | Purpose | Related docs |
| --- | --- | --- |
| `/api/health` | Backend health check | [docs/deployment-vps.md](./docs/deployment-vps.md) |
| `/api/files` | Uploads, previews, thumbnails, metadata | [docs/upload-preview-download-flow.md](./docs/upload-preview-download-flow.md) |
| `/api/pdf` | PDF operations and PDF job status/downloads | [docs/pdf-tools.md](./docs/pdf-tools.md) |
| `/api/image` | Image operations and image job status/downloads | [docs/image-tools.md](./docs/image-tools.md) |
| `/api/convert` | Universal conversion | [docs/conversion.md](./docs/conversion.md) |
| `/api/compress` | Universal compression | [docs/compression.md](./docs/compression.md) |
| `/api/ocr` | Shared OCR entry point | [docs/ocr.md](./docs/ocr.md) |

## Common API Patterns

### Asynchronous processing

Most tool endpoints:

1. Accept `multipart/form-data`
2. Return a queued response with `job_id`
3. Require polling a `status/{job_id}` endpoint
4. Download through `download/{job_id}`

Common queued response shape:

```json
{
  "job_id": "example-job-id",
  "status": "queued",
  "message": "Conversion queued"
}
```

### Status response pattern

```json
{
  "job_id": "example-job-id",
  "status": "processing",
  "stage": "processing",
  "progress": 50,
  "output_filename": null,
  "error": null
}
```

Success usually includes `output_path` or `output_paths`, plus `output_filename`, `media_type`, and `extension`.

### Safe failure response pattern

```json
{
  "detail": "Processing failed. Contact support@wellfriend.online with job ID example-job-id if the problem continues.",
  "request_id": "example-request-id"
}
```

### Rate-limit response

HTTP `429` with body similar to:

```json
{
  "detail": "Rate limit exceeded. Please try again later.",
  "retry_after_seconds": 120,
  "bucket": "status:compress"
}
```

Headers:

- `Retry-After`
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`

## File and Policy Constraints

- Maximum upload size: `25 MB` per file
- Maximum batch total: `100 MB`
- Maximum extracted archive total: `100 MB`
- Maximum extracted archive files: `200`
- File retention: `24 hours`
- Public global rate limit: `200 requests/hour/IP`
- Status, preview, and download checks use separate higher per-tool buckets and do not consume the strict job quota

## Endpoint Summary

### Health

- `GET /api/health`
- Returns service status
- Excluded from normal rate limiting

### Uploads and previews

- `POST /api/files/upload`
- `POST /api/files/upload-multiple`
- `GET /api/files/{file_id}`
- `GET /api/files/preview/{file_id}`
- `GET /api/files/thumbnail/{file_id}`
- `GET /api/files/pdf-page/{file_id}/{page_number}?zoom=...`
- `GET /api/files/pdf-info/{file_id}`

### Universal compression

- `POST /api/compress`
- `POST /api/compress/json`
- `GET /api/compress/status/{job_id}`
- `GET /api/compress/download/{job_id}`

### Universal conversion

- `POST /api/convert`
- `POST /api/convert/`
- `GET /api/convert/status/{job_id}`
- `GET /api/convert/download/{job_id}`

### OCR

- `POST /api/ocr`
- `POST /api/ocr/`

### PDF routes

- `POST /api/pdf/compress`
- `POST /api/pdf/merge`
- `POST /api/pdf/split`
- `POST /api/pdf/rotate`
- `POST /api/pdf/watermark`
- `POST /api/pdf/extract-text`
- `POST /api/pdf/to-word`
- `POST /api/pdf/to-excel`
- `POST /api/pdf/to-html`
- `POST /api/pdf/to-images`
- `POST /api/pdf/images-to-pdf`
- `POST /api/pdf/office-to-pdf`
- `POST /api/pdf/upload-only`
- `GET /api/pdf/file/{file_id}`
- `POST /api/pdf/convert-from-id`
- `POST /api/pdf/encrypt`
- `POST /api/pdf/decrypt`
- `POST /api/pdf/ocr`
- `GET /api/pdf/status/{job_id}`
- `GET /api/pdf/download/{job_id}`

### Image routes

- `POST /api/image/convert`
- `POST /api/image/resize`
- `POST /api/image/compress`
- `POST /api/image/crop`
- `POST /api/image/rotate`
- `POST /api/image/watermark`
- `POST /api/image/remove-background`
- `POST /api/image/ocr`
- `POST /api/image/batch-resize`
- `POST /api/image/info`
- `GET /api/image/status/{job_id}`
- `GET /api/image/download/{job_id}`

## Notes

- The frontend uses only safe example IDs like `file_id=example-file-id` in docs. Real IDs are random hex values generated during upload.
- Several UI pages submit fields that the backend currently ignores. These are documented in the deeper tool pages as `Partially implemented`.
- PDF to JPG is supported through format normalization. The backend canonical format is `jpg`, and downloads use `image/jpeg`.

## Related Documents

- [docs/backend-api.md](./docs/backend-api.md)
- [docs/rate-limiting.md](./docs/rate-limiting.md)
- [docs/error-handling.md](./docs/error-handling.md)
- [docs/upload-preview-download-flow.md](./docs/upload-preview-download-flow.md)
