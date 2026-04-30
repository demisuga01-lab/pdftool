# Architecture

## Purpose

Explain how PDFTools by WellFriend is structured from browser request to backend processing and download delivery.

## Audience

- Developers
- Operators
- Security reviewers
- Future maintainers

## Scope

This document covers the live web architecture in the current repository: frontend, backend, Redis, Celery workers, file storage, previews, cleanup, and production process layout.

## High-Level Architecture

PDFTools is a split web application:

- **Frontend**: Next.js App Router app serving pages, workspace UI, previews, status polling, and download actions
- **Backend**: FastAPI API for uploads, previews, task creation, status, and downloads
- **Queue and state**: Redis used for Celery broker/result backend and rate limiting
- **Workers**: Celery workers split into `fast` and `heavy` execution classes
- **Storage**: filesystem-backed uploads, outputs, temp previews, and cleanup retention
- **External processing**: CLI tools for PDF, OCR, conversion, compression, and rasterization work

## Frontend Architecture

### Main layers

- `frontend/app`: route-level pages
- `frontend/components/layout`: shell, header, footer, static layout
- `frontend/components/workspace`: shared workspace UI patterns
- `frontend/lib`: API helpers, upload helpers, settings persistence, previews, and state hooks

### UI patterns

- Static pages: home, about, privacy, terms, pricing, contact, settings
- Shared compact workspaces: convert, compress, OCR, image info
- Grid workspaces: merge, rotate, images-to-pdf, batch-resize
- Visual editor workspaces: watermark, resize, rotate image, crop

### State and persistence

- Tool jobs use `useWorkspaceJob`
- Global and per-tool settings use localStorage
- Theme uses localStorage key `pdftools-theme`
- Workspace settings for some pages are keyed by endpoint and uploaded file ID

## Backend Architecture

### Main layers

- `backend/app/main.py`: app setup, middleware, routers, exception handlers
- `backend/app/api/routes`: route families
- `backend/app/services`: file operations and processing services
- `backend/app/core`: config, dependencies, errors, security headers, rate limiting
- `backend/app/workers`: Celery app and tasks
- `backend/app/scripts`: cleanup routines

### Backend responsibilities

- Validate uploads and enforce policy
- Store uploaded files under random IDs
- Generate preview metadata
- Start background jobs
- Report job status
- Serve outputs and previews safely
- Sanitize user-visible failures

## Redis Role

Redis is used for:

- Celery broker
- Celery result backend
- Rate-limit counters

Operational check:

```bash
docker exec -it pdftool-redis redis-cli ping
```

## Celery Architecture

### Queues

- `fast`: shorter, lighter tasks
- `heavy`: compression, conversion, OCR, and Office processing

### Worker behavior

- `worker_prefetch_multiplier=1`
- `task_acks_late=True`
- `task_reject_on_worker_lost=True`
- `result_expires=86400`

This keeps long-running tasks from being over-prefetched and allows worker loss to return jobs to the queue more safely.

## File Storage

Configured by environment variables:

- `DATA_DIR`
- `UPLOAD_DIR`
- `OUTPUT_DIR`
- `TEMP_DIR`

Typical production paths:

- `/opt/pdftool/data/uploads`
- `/opt/pdftool/data/outputs`
- `/opt/pdftool/data/temp`

### What lives where

- Uploads: original user files plus upload metadata JSON
- Outputs: processed downloads
- Temp: preview cache, rasterized SVG intermediates, and other temporary work

## Request Lifecycle

```text
Browser
  -> Next.js route
  -> upload helper / workspace hook
  -> FastAPI route
  -> validation and file storage
  -> Celery task enqueue
  -> Redis broker
  -> worker
  -> service
  -> external CLI or library
  -> output file in OUTPUT_DIR
  -> status endpoint
  -> download endpoint
```

## Job Lifecycle

```text
queued
  -> processing
  -> success
or
queued/processing
  -> failure
```

The frontend interprets backend task states into user-friendly values and shows a download panel or a safe failure message.

## Error Lifecycle

```text
Worker/service error
  -> HTTPException or Python exception
  -> worker sanitizes message
  -> status endpoint returns safe error
  -> frontend shows safe message
  -> user sees support guidance with job ID when relevant
```

## Security Boundaries

- Upload validation happens before saving and again for saved file IDs
- File IDs are random hex strings and validated before use
- Output/download paths must resolve inside configured storage roots
- Archive extraction checks for traversal, excessive member count, and size limits
- SVG watermark files are inspected before rasterization
- CORS defaults to production-safe explicit origin, not wildcard
- Tracebacks and internal paths are not exposed in user-facing API errors

## Rate Limiting Architecture

`RateLimitMiddleware` runs on backend API requests and uses Redis fixed-window counters. It applies:

- global bucket
- jobs bucket
- uploads bucket
- status bucket
- downloads bucket

The health endpoint is excluded.

## SVG Rasterization Architecture

Watermark uploads that are SVG are special-cased:

1. File is detected as SVG
2. Text content is scanned for unsafe constructs
3. Inkscape is preferred for rasterization
4. `convert` is fallback if Inkscape is absent
5. Result is passed into PDF/image watermark workflows as a PNG-like raster source

## PM2 Process Model

Production PM2 process names:

- `pdftool-api`
- `pdftool-frontend`
- `pdftool-worker-fast`
- `pdftool-worker-heavy`

## Deployment Topology

```text
Internet
  -> tools.wellfriend.online
  -> Next.js frontend process
  -> /api rewrite or proxy path
  -> FastAPI backend
  -> Redis container
  -> Celery workers
  -> filesystem storage under /opt/pdftool/data
```

## Future Platform Separation

The current public tool site is separate from the planned future authenticated API platform at `api.wellfriend.online`. That future platform is not implemented in this repository as a live product today.

## Related Documents

- [DEPLOYMENT.md](./DEPLOYMENT.md)
- [docs/data-flow-diagrams.md](./docs/data-flow-diagrams.md)
- [docs/workspace-system.md](./docs/workspace-system.md)
- [docs/backend-services.md](./docs/backend-services.md)
- [docs/celery-workers.md](./docs/celery-workers.md)

