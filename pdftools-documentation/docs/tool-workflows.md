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
17. Success and failure metadata may update the browser-local Recent Jobs panel.
18. Cleanup removes files after retention.

## Why Each Step Exists

| Step | Why it exists |
| --- | --- |
| frontend validation | faster user feedback |
| backend validation | security boundary and policy enforcement |
| file IDs | avoid direct user-controlled filenames as primary lookup keys |
| Celery queue | keep expensive processing off the request thread |
| status polling | simple job UX without websockets |
| output directory | separate originals from generated outputs |
| Recent Jobs | keep lightweight job metadata in one browser without accounts |
| cleanup | prevent unbounded disk growth |

## Files Involved

- frontend upload helpers: `frontend/lib/upload.ts`, `frontend/lib/files.ts`
- frontend job hook: `frontend/lib/use-workspace-job.ts`
- backend file save/preview: `backend/app/services/file_store.py`
- backend routes: `backend/app/api/routes/*`
- worker tasks: `backend/app/workers/*_tasks.py`
- services: `backend/app/services/*`
- browser-local recent jobs: `frontend/lib/recent-jobs.ts`, `frontend/components/workspace/RecentJobsPanel.tsx`

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
-> browser-local Recent Jobs metadata
-> cleanup after retention window
```

## Common Failure Modes

- upload too large
- unsupported file or option
- missing CLI dependency
- worker timeout
- job output missing
- output expired before download

## Split PDF Workspace Notes

- The split page uses `/api/files/pdf-info/{file_id}` for page count and `/api/files/pdf-page/{file_id}/{page_number}` for thumbnails and preview.
- The frontend sends an explicit split `mode` and page payload. It does not send every page for selected-page modes.
- `split_all` creates one PDF per active page and downloads a ZIP.
- `extract_selected` and `reorder_export` create one PDF.
- `split_selected` creates a ZIP containing one PDF per selected page.
- `custom_ranges` keeps range behavior and downloads one PDF or a ZIP depending on output count.
- Recent Jobs may store safe metadata such as split mode, output type, and selected page count. File contents and passwords are not stored there.

## What Users See

- upload progress
- queue/processing state
- safe error text
- support-ready failure report with copy and email actions
- temporary download reminder
- Recent Jobs panel saved only in the current browser

## Recent Jobs

Recent Jobs are frontend-only. They store job metadata in localStorage with a maximum of 10 records and do not store file contents, passwords, or secrets.

Stored metadata can include job ID, tool name, route, original filename, file type, approximate size, status, timestamps, download URL, output filename, and safe error message. Downloads remain temporary and can expire after backend cleanup.

## Related Documents

- [upload-preview-download-flow.md](./upload-preview-download-flow.md)
- [backend-api.md](./backend-api.md)
- [celery-workers.md](./celery-workers.md)
