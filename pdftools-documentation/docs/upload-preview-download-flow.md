# Upload, Preview, and Download Flow

## Purpose

Document the shared file lifecycle from upload through preview and final download.

## Audience

- Developers
- Operators
- Support staff

## Upload Flow

### Frontend

- `uploadWithProgress` sends `multipart/form-data`
- `uploadFileToWorkspace` hits `/api/files/upload`
- multi-file upload uses `/api/files/upload-multiple`

### Backend

- size checked during streaming write
- partial file deleted on oversize
- metadata saved as JSON next to upload record
- previews and thumbnails are derived later from saved file ID

## Preview Flow

- image preview may use original image or browser-safe raster preview
- PDF preview page uses `/api/files/pdf-page/{file_id}/{page_number}?zoom=...`
- thumbnail uses `/api/files/thumbnail/{file_id}`
- metadata uses `/api/files/{file_id}` or `/api/files/pdf-info/{file_id}`

## Download Flow

- processing status returns `output_path` or `output_paths`
- frontend `downloadFile` hits tool-specific `download/{job_id}`
- if multiple outputs exist, backend zips them on demand
- `Cache-Control: no-store` is applied on downloads

## Failure Conditions

- upload size too large
- uploaded file expired
- preview generation tool missing
- output file missing after task
- output already cleaned up

## Related Documents

- [tool-workflows.md](./tool-workflows.md)
- [file-storage-and-retention.md](./file-storage-and-retention.md)
- [backend-api.md](./backend-api.md)

