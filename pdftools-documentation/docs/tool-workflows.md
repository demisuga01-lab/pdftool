# Tool Workflows

## Purpose

Describe the generic lifecycle shared by most tools in PDFTools.

## Audience

- Developers
- Support staff
- Operators

## Generic Lifecycle

1. User opens a tool page.
2. User uploads one or more files.
3. Frontend validates obvious type and size constraints.
4. Backend validates file size and type again.
5. Backend saves upload under random file ID.
6. Metadata and preview paths are prepared.
7. User adjusts settings in the workspace.
8. Frontend submits a processing form to the tool endpoint.
9. Backend validates options and resolves saved file paths.
10. Backend enqueues a Celery task.
11. Worker runs service logic.
12. Service may call external CLI tools.
13. Output file is written under `OUTPUT_DIR`.
14. Frontend polls a status endpoint.
15. Success enables download.
16. Failure returns a sanitized message.
17. Cleanup removes files after retention.

## Why Each Step Exists

| Step | Why it exists |
| --- | --- |
| frontend validation | faster user feedback |
| backend validation | security boundary and policy enforcement |
| file IDs | avoid direct user-controlled filenames as primary lookup keys |
| Celery queue | keep expensive processing off the request thread |
| status polling | simple job UX without websockets |
| output directory | separate originals from generated outputs |
| cleanup | prevent unbounded disk growth |

## Files Involved

- frontend upload helpers: `frontend/lib/upload.ts`, `frontend/lib/files.ts`
- frontend job hook: `frontend/lib/use-workspace-job.ts`
- backend file save/preview: `backend/app/services/file_store.py`
- backend routes: `backend/app/api/routes/*`
- worker tasks: `backend/app/workers/*_tasks.py`
- services: `backend/app/services/*`

## ASCII Flow

```text
Browser
-> Next.js route
-> upload helper
-> FastAPI route
-> dependency validation
-> file_store
-> Celery task
-> worker
-> service
-> external CLI or library
-> output file
-> status endpoint
-> download endpoint
-> cleanup after retention window
```

## Common Failure Modes

- upload too large
- unsupported file or option
- missing CLI dependency
- worker timeout
- job output missing
- output expired before download

## What Users See

- upload progress
- queue/processing state
- safe error text
- support contact guidance with job ID for failures

## Related Documents

- [upload-preview-download-flow.md](./upload-preview-download-flow.md)
- [backend-api.md](./backend-api.md)
- [celery-workers.md](./celery-workers.md)

