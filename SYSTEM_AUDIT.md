# PDFTools by WellFriend System Audit

Date: 2026-05-18
Scope: repository audit of `frontend/`, `backend/`, deployment docs, and operational guidance
Verification performed: backend `py -3 -m compileall app`, frontend `pnpm exec tsc --noEmit`

## 1. Architecture Overview

### Stack summary

- Frontend: Next.js 16 App Router, React 19, TypeScript, Tailwind CSS
- Backend: FastAPI with Pydantic settings and custom middleware
- Async processing: Celery with Redis as broker and result backend
- Process supervision: PM2
- Runtime storage: filesystem under `/opt/pdftool/data`
- Deployment shape: VPS, PM2-managed Node/Python processes, Docker Redis, reverse proxy in front

### High-level flow

```text
Browser
  -> Next.js frontend
  -> FastAPI API
  -> upload validation + file save
  -> Celery enqueue
  -> Redis broker/result backend
  -> fast/heavy worker
  -> Python service layer
  -> CLI tools / Python imaging libs
  -> output written to OUTPUT_DIR
  -> status polling
  -> download or zip aggregation
  -> hourly cleanup removes expired files
```

### Key architecture observations

- The frontend and backend are cleanly separated, but the frontend assumes a same-origin `/api` path.
- The backend is service-oriented: routes are thin, worker tasks are wrappers, and most tool logic lives in `backend/app/services/`.
- Queue separation is meaningful: short UI-facing jobs stay on `fast`, CPU-heavy and OCR/conversion jobs go to `heavy`.
- The repository contains extensive documentation, but some docs describe intended behavior that is broader than what the backend currently consumes.

## 2. Backend & API Routes

### Backend structure

- App bootstrap: `backend/app/main.py`
- Core policy: `backend/app/core/config.py`, `errors.py`, `rate_limit.py`, `security_headers.py`, `dependencies.py`
- Route families:
  - `api/routes/files.py`
  - `api/routes/pdf.py`
  - `api/routes/image.py`
  - `api/routes/convert.py`
  - `api/routes/compress.py`
  - `api/routes/ocr.py`
- Services:
  - `pdf_service.py`
  - `image_service.py`
  - `conversion_service.py`
  - `compression_service.py`
  - `ocr_service.py`
  - `file_store.py`
  - `svg_rasterizer.py`

### API surface

- `/api/health`
- `/api/files/*`
  - upload, upload-multiple, preview, thumbnail, pdf-page, pdf-info, metadata lookup
- `/api/pdf/*`
  - compress, merge, split, rotate, watermark, extract-text, to-word, to-excel, to-html, to-images, images-to-pdf, office-to-pdf, encrypt, decrypt, ocr, status, download, upload-only, file lookup, convert-from-id
- `/api/image/*`
  - convert, resize, compress, crop, rotate, watermark, remove-background, ocr, batch-resize, info, status, download
- `/api/convert`
  - universal conversion endpoint plus status/download
- `/api/compress`
  - universal compression endpoint plus status/download
- `/api/ocr`
  - shared OCR entrypoint that currently dispatches through `ocr_image_task` and `OCRService`

### Route behavior pattern

- Request thread validates inputs and saves uploads.
- Route creates an output file path or output directory under `OUTPUT_DIR`.
- Celery task is enqueued and returns a queued payload:

```json
{
  "job_id": "<celery-id>",
  "status": "queued",
  "message": "..."
}
```

- Frontend polls `/status/{job_id}` until success/failure.
- `/download/{job_id}` serves a single output file directly or zips `output_paths`.

### Failure modes

- Missing host commands produce HTTP 500-style safe failures.
- Bad parameters usually return 400/422 with sanitized details.
- A finished job with no output is treated by the frontend as a failure.
- Status and download endpoints rely on Redis-backed Celery results still existing; `result_expires` is one day.

## 3. Frontend & Workspace System

### Frontend structure

- App routes: `frontend/app`
- Shared UI/layout: `frontend/components/layout`, `components/ui`
- Workspace system: `frontend/components/workspace`
- Client helpers/state: `frontend/lib`

### Routing model

- Real tool pages exist for concrete routes such as `/pdf/merge`, `/image/resize`, `/compress`, `/convert`, `/tools/ocr`.
- A dynamic fallback route exists at `frontend/app/[category]/[tool]/page.tsx`, but it is only a placeholder shell and not a production tool implementation.

### Workspace types

- `compact`: upload card + preview + settings panel
- `grid`: multi-file/page arrangement
- `editor`: larger visual canvas with controls drawer on mobile

Layout mapping is explicit in `frontend/lib/workspace-layouts.ts`.

### UI behavior

- Upload/process state handled by `useWorkspaceJob`
- Job states normalized to `idle`, `uploading`, `queued`, `processing`, `success`, `failure`
- URL query strings can retain `job_id` and sometimes `file_id` for resume/reload behavior
- Download flow uses browser blob downloads from backend `/download` endpoints

### Mobile and theme handling

- Visual/grid workspaces use a bottom-sheet mobile drawer with dedicated scroll body
- Drawer/body scroll locking is intentionally handled to avoid nested-scroll traps
- Editor canvases support zoom/pan and attempt to isolate control gestures from canvas gestures
- Theme modes: light, dark, system via `localStorage` key `pdftools-theme`

### UX concerns

- Some workspace pages are polished and feature-complete, but others expose options beyond backend support.
- Queue position and ETA fields exist in frontend types, but the backend does not currently return them.
- OCR page is somewhat separate from the shared `useWorkspaceJob` pattern and uses its own upload + poll flow.

## 4. Workers & Queues

### Queue model

- Broker/backend: Redis
- Queues:
  - `fast`
  - `heavy`

### Worker split

- `pdftool-worker-fast`
  - merge, split, rotate, watermark, text extraction, most image edits, PDF/image direct conversions
- `pdftool-worker-heavy`
  - universal compression, universal conversion, OCR, office-to-pdf, batch resize, PDF compression

### Celery hardening already present

- `worker_prefetch_multiplier=1`
- `task_acks_late=True`
- `task_reject_on_worker_lost=True`
- `result_expires=86400`
- per-task soft/hard limits

### PM2 mapping

- `pdftool-api`: FastAPI app
- `pdftool-frontend`: Next.js app
- `pdftool-worker-fast`: Celery fast queue worker
- `pdftool-worker-heavy`: Celery heavy queue worker

### Worker concern

- The queue design is solid, but there is no first-class queue observability in the app itself. Operations rely on PM2 logs and `celery inspect`.

## 5. Environment & Configuration

### Critical environment variables

- `REDIS_URL`
- `DATA_DIR`
- `UPLOAD_DIR`
- `OUTPUT_DIR`
- `TEMP_DIR`
- `MAX_FILE_SIZE_MB`
- `MAX_BATCH_BYTES`
- `MAX_ARCHIVE_EXTRACTED_BYTES`
- `MAX_ARCHIVE_FILES`
- `FILE_RETENTION_HOURS`
- `ALLOWED_ORIGINS`
- `RATE_LIMIT_ENABLED`
- `RATE_LIMIT_GLOBAL_PER_HOUR`
- `RATE_LIMIT_JOBS_PER_HOUR`
- `RATE_LIMIT_UPLOADS_PER_HOUR`
- `RATE_LIMIT_STATUS_PER_HOUR`
- `RATE_LIMIT_DOWNLOADS_PER_HOUR`
- `RATE_LIMIT_REDIS_URL`
- `RATE_LIMIT_TRUST_PROXY`

### Active config observed in `backend/.env`

- `REDIS_URL=redis://localhost:6379/0`
- `DATA_DIR=/opt/pdftool/data`
- `UPLOAD_DIR=/opt/pdftool/data/uploads`
- `OUTPUT_DIR=/opt/pdftool/data/outputs`
- `TEMP_DIR=/opt/pdftool/data/temp`
- `MAX_FILE_SIZE_MB=25`
- `MAX_BATCH_BYTES=104857600`
- `MAX_ARCHIVE_EXTRACTED_BYTES=104857600`
- `MAX_ARCHIVE_FILES=200`
- `FILE_RETENTION_HOURS=24`
- `ALLOWED_ORIGINS=https://tools.wellfriend.online,http://localhost:3000`
- rate limiting enabled and Redis-backed

### Configuration concerns

- The checked-in active `.env` includes `http://localhost:3000`; that is acceptable for development but should not remain in production runtime config.
- `RATE_LIMIT_TRUST_PROXY=true` is only safe if the backend is not directly internet-exposed.

## 6. Tooling & Dependencies

### Core production dependencies

- PDF and preview:
  - `qpdf`
  - `mutool`
  - `pdftotext`
  - `pdftops`
  - `gs`
- Office conversion:
  - `libreoffice`
- OCR:
  - `tesseract`
  - optional `ocrmypdf`
- SVG/image handling:
  - `inkscape`
  - ImageMagick `convert`
  - libvips via `pyvips`
- Image optimization paths:
  - `pngquant`, `oxipng`, `optipng`, `jpegoptim`, `cwebp`, `avifenc`, `gifsicle`
- Archive packaging:
  - `7z`, optional `advzip`, optional `brotli`
- Ops:
  - `docker`, `pm2`, `celery`

### Python library dependencies

- `pypdf`, `reportlab`, `img2pdf`, `pyvips`, `opencv-python-headless`, `numpy`, `python-docx`, `openpyxl`

### Tool workflows

- PDF tools implemented:
  - merge, split, rotate, watermark, encrypt, decrypt, extract text, PDF to images, images to PDF, office to PDF, OCR, PDF compression
- Image tools implemented:
  - convert, resize, compress, crop, rotate, watermark, remove background, info, OCR, batch resize
- Shared tools implemented:
  - universal convert
  - universal compress
  - shared OCR page

### Dependency concern

- Production success depends heavily on host CLI completeness. Missing tools downgrade features or cause immediate job failures.

## 7. File Handling & Retention

### Storage model

- Uploads are saved under random 32-char hex IDs in `UPLOAD_DIR`
- Metadata JSON is stored alongside uploads
- Outputs go to `OUTPUT_DIR`
- Preview cache and temporary rasterization go to `TEMP_DIR`

### Upload -> processing -> download -> cleanup flow

```text
User uploads file
  -> route validates extension/size/batch
  -> file saved under random ID
  -> metadata JSON written
  -> optional preview/thumbnail metadata generated
  -> job enqueued
  -> worker writes final file(s) into OUTPUT_DIR
  -> status endpoint exposes output path(s)
  -> download endpoint serves file or zip
  -> cleanup script removes old uploads/outputs/temp files after retention window
```

### Retention

- Cleanup script: `backend/app/scripts/cleanup_files.py`
- Intended schedule: hourly cron
- Retention basis: file mtime
- Default: 24 hours

### File handling strengths

- Random file IDs reduce path guessing
- Saved uploads are revalidated when reused by `file_id`
- Output serving enforces path containment within `OUTPUT_DIR`
- Preview cache is isolated under `TEMP_DIR/previews`

### File handling concerns

- Cleanup is time-based, not job-aware beyond mtime. Long-running operational pauses could leave stale data until the next cleanup run.
- There is no antivirus or content scanning.

## 8. Security & Hardening

### Implemented controls

- Explicit CORS origin list; wildcard forbidden by validator
- Security headers middleware:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy`
  - `Permissions-Policy`
- Centralized exception sanitization to avoid leaking tracebacks and filesystem paths
- Extension allowlist with explicit dangerous-extension denylist
- Streaming upload size enforcement
- Batch size enforcement
- Saved-file size revalidation
- File ID validation and storage root enforcement
- Safe zip extraction checks for traversal, hidden paths, file count, and extracted size
- Safe output-path validation before download
- SVG watermark hardening with suspicious-content rejection and rasterization timeout
- Redis-backed rate limiting with separate buckets for uploads, jobs, status, downloads, and previews

### Rate limiting behavior

- Health endpoint and `OPTIONS` are skipped
- Job creation consumes job and often global buckets
- Status polling uses its own bucket so long-running jobs do not look failed just because polling is noisy
- If Redis for rate limiting is unavailable, middleware fails open and logs a warning

### Security concerns

- Fail-open rate limiting is operationally friendly but reduces abuse resistance during Redis outages.
- `RATE_LIMIT_TRUST_PROXY=true` is risky if backend port 8000 is reachable directly.
- Some command wrappers log full command lines; that is fine server-side, but logs should be treated as sensitive operational data.
- `DEPLOYMENT.md` recommends `git reset --hard origin/master`; that is operationally destructive and can erase local emergency changes on a live box.

## 9. Deployment & Production Setup

### Documented production model

- App root: `/opt/pdftool`
- Backend virtualenv under `backend/`
- Frontend built with `pnpm build`
- Redis in Docker container
- PM2 manages API, frontend, and both workers

### Expected deploy sequence

1. Pull latest repo
2. Install backend requirements
3. Compile backend
4. Install frontend packages
5. Run TypeScript check
6. Build frontend
7. Restart PM2 processes with `--update-env`
8. Save PM2 state
9. Run health checks and smoke tests

### Network/proxy assumptions

- Docs describe `tools.wellfriend.online` in front of the app
- Code assumes same-origin `/api`
- Documentation references Nginx/Cloudflare proxying as the production concept, but the repository does not include actual Nginx or Cloudflare config artifacts

### Operational requirements

- Redis container must stay healthy
- PM2 process names must stay consistent with docs
- Cleanup cron should be installed
- Backend port should be private or properly firewalled if proxy trust is enabled

### Deployment concerns

- No PM2 ecosystem file is present; process definitions are operational knowledge rather than versioned config.
- No containerization or infrastructure-as-code is present for the full stack.
- Reverse proxy configuration is documented conceptually, not codified.

## 10. Known Limitations

### Verified UI/backend mismatches

- PDF Protect UI sends `printing`, `copying`, `editing`, `screen_reader_access`, and `encryption_strength`, but backend `/api/pdf/encrypt` only consumes `user_password` and `owner_password`.
- PDF Decrypt UI sends `remove_restrictions` and `keep_metadata`, but backend `/api/pdf/decrypt` only consumes `password`.
- PDF Extract Text UI sends `mode`, `pages`, `preserve_line_breaks`, `remove_headers_footers`, `extract_form_values`, `language_hint`, and `encoding`, but backend `/api/pdf/extract-text` only uses `layout` and `output_format`.
- Images to PDF UI exposes page size, orientation, margins, fit, and image compression options, but backend `/api/pdf/images-to-pdf` only accepts files and `output_filename`.
- Office to PDF UI exposes PDF/A, PDF version, bookmarks/comments/form-field export, hidden slides, first-sheet-only, and image compression options, but backend `/api/pdf/office-to-pdf` ignores those parameters.
- Batch Resize UI exposes fit, output format, quality, naming pattern, prefix, and suffix options, but backend `/api/image/batch-resize` only accepts width and height.
- Remove Background UI exposes multiple processing/refinement/background options, but backend `/api/image/remove-background` ignores them and always runs a fixed OpenCV GrabCut flow to PNG.

### Additional limitations

- The dynamic route `/[category]/[tool]` is still a placeholder, not a real tool page.
- Queue position and ETA are typed in the frontend but not produced by the backend.
- OCR and conversion quality depend strongly on host CLI installation and document/image complexity.
- There is no automated test suite beyond compile/typecheck/smoke-test guidance.
- README and some docs contain text encoding artifacts.

## 11. Recommendations for Audit

### Security

- Remove `localhost` from production `ALLOWED_ORIGINS` and verify `backend/.env` is never committed in real operations.
- Ensure backend port 8000 is not publicly reachable when `RATE_LIMIT_TRUST_PROXY=true`.
- Consider explicit reverse-proxy allowlisting or internal-network binding for the backend.
- Add malware scanning or at least an operator decision on whether uploads should be scanned before processing.

### Reliability

- Version PM2 startup configuration in the repo.
- Add a small health/readiness script that checks Redis, required CLIs, storage directories, and Celery worker visibility.
- Add structured job telemetry or lightweight queue monitoring so operators are not dependent on manual `celery inspect`.
- Consider persistent job metadata if users need results or auditability beyond Celery result expiry.

### Maintainability

- Align frontend forms with backend parameters or hide unsupported controls until implemented.
- Version reverse-proxy config and deployment automation alongside the app.
- Replace destructive deploy guidance with safer pull/build/restart steps.
- Normalize documentation to only describe behavior that is live today, with a separate roadmap/intended-behavior section.

### UX

- Surface which options are “coming soon” rather than accepting controls silently.
- Consider returning queue position/rough ETA if the UI will continue to model them.
- Add clearer download-expiry messaging since retention is time-based and cleanup is hourly.

## Priority Concerns

### High

- UI/backend drift is significant on several pages; users can choose options that have no effect.
- Production safety depends on proxy/network discipline because rate-limit trust-proxy is enabled.
- Deployment config is documented but not codified.

### Medium

- Heavy reliance on optional host CLIs can create inconsistent feature behavior across environments.
- Rate limiting fails open when Redis is unavailable.
- Operational visibility is mostly manual.

### Low

- Documentation/README encoding artifacts reduce polish and can confuse operators.
- Dynamic placeholder route may create false expectations if linked accidentally.

## Bottom Line

This is a solid VPS-style document-processing stack with clear separation between UI, API, services, workers, and filesystem retention. The strongest parts are the queue split, storage containment checks, sanitized errors, and SVG/archive hardening. The biggest audit finding is not structural fragility but product drift: the frontend often advertises richer controls than the backend currently implements, and deployment/network assumptions live more in prose than in versioned infrastructure.
