# Environment

## Purpose

Reference for runtime configuration used by the backend and operational environment.

## Audience

- Operators
- Developers
- Reviewers checking deployment safety

## Scope

This document covers repository templates, runtime env rules, and the current production values documented for the VPS.

## Environment File Rules

- `backend/.env.example` is a safe tracked template
- `backend/.env` is the real runtime file and must stay ignored by Git
- local development may add `http://localhost:3000` to backend CORS
- production `ALLOWED_ORIGINS` should not include localhost

## Current Production Values

```env
REDIS_URL=redis://localhost:6379/0
DATA_DIR=/opt/pdftool/data
UPLOAD_DIR=/opt/pdftool/data/uploads
OUTPUT_DIR=/opt/pdftool/data/outputs
TEMP_DIR=/opt/pdftool/data/temp
MAX_FILE_SIZE_MB=25
MAX_BATCH_BYTES=104857600
MAX_ARCHIVE_EXTRACTED_BYTES=104857600
MAX_ARCHIVE_FILES=200
FILE_RETENTION_HOURS=24
ALLOWED_ORIGINS=https://tools.wellfriend.online
RATE_LIMIT_ENABLED=true
RATE_LIMIT_GLOBAL_PER_HOUR=200
RATE_LIMIT_JOBS_PER_HOUR=40
RATE_LIMIT_UPLOADS_PER_HOUR=60
RATE_LIMIT_STATUS_PER_HOUR=1000
RATE_LIMIT_DOWNLOADS_PER_HOUR=200
RATE_LIMIT_REDIS_URL=redis://localhost:6379/0
RATE_LIMIT_TRUST_PROXY=true
```

Rate limiting is split per tool and per bucket. Status polling and preview
requests use higher non-global buckets so active jobs do not appear to fail
when the frontend is only checking progress.

## Environment Categories

### Storage

- `DATA_DIR`
- `UPLOAD_DIR`
- `OUTPUT_DIR`
- `TEMP_DIR`

### Limits

- `MAX_FILE_SIZE_MB`
- `MAX_BATCH_BYTES`
- `MAX_ARCHIVE_EXTRACTED_BYTES`
- `MAX_ARCHIVE_FILES`
- `FILE_RETENTION_HOURS`

### CORS

- `ALLOWED_ORIGINS`

### Rate limiting

- `RATE_LIMIT_ENABLED`
- `RATE_LIMIT_GLOBAL_PER_HOUR`
- `RATE_LIMIT_JOBS_PER_HOUR`
- `RATE_LIMIT_UPLOADS_PER_HOUR`
- `RATE_LIMIT_STATUS_PER_HOUR`
- `RATE_LIMIT_DOWNLOADS_PER_HOUR`
- `RATE_LIMIT_REDIS_URL`
- `RATE_LIMIT_TRUST_PROXY`

## Detailed Reference

See [docs/environment-variables.md](./docs/environment-variables.md) for the full table with defaults, examples, and failure risks.

## Related Documents

- [PRODUCTION_ENV.md](./PRODUCTION_ENV.md)
- [docs/environment-variables.md](./docs/environment-variables.md)
- [docs/local-development-windows.md](./docs/local-development-windows.md)
