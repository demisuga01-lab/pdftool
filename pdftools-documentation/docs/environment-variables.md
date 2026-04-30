# Environment Variables

## Purpose

Expanded reference for current environment variables.

## Table

| Name | Layer | Default | Production value | Secret | Notes |
| --- | --- | --- | --- | --- | --- |
| `REDIS_URL` | backend/workers | `redis://localhost:6379/0` | same | No | Celery broker/result backend fallback |
| `RATE_LIMIT_REDIS_URL` | backend | fallback to `REDIS_URL` | `redis://localhost:6379/0` | No | dedicated limiter Redis if desired |
| `DATA_DIR` | backend | repo-relative data dir in config | `/opt/pdftool/data` | No | root data storage |
| `UPLOAD_DIR` | backend | derived | `/opt/pdftool/data/uploads` | No | upload storage |
| `OUTPUT_DIR` | backend | derived | `/opt/pdftool/data/outputs` | No | processed outputs |
| `TEMP_DIR` | backend | derived | `/opt/pdftool/data/temp` | No | previews and temp files |
| `MAX_FILE_SIZE_MB` | backend | `25` | `25` | No | must stay 25 for public launch policy |
| `MAX_BATCH_BYTES` | backend | `104857600` | same | No | 100 MB |
| `MAX_ARCHIVE_EXTRACTED_BYTES` | backend | `104857600` | same | No | 100 MB |
| `MAX_ARCHIVE_FILES` | backend | `200` | `200` | No | extracted archive member cap |
| `FILE_RETENTION_HOURS` | backend | `24` | `24` | No | cleanup horizon |
| `ALLOWED_ORIGINS` | backend | `https://tools.wellfriend.online` | same | No | production should not include localhost |
| `RATE_LIMIT_ENABLED` | backend | `true` | `true` | No | disable only for trusted dev workflows |
| `RATE_LIMIT_GLOBAL_PER_HOUR` | backend | `100` | `100` | No | global public limit |
| `RATE_LIMIT_JOBS_PER_HOUR` | backend | `20` | `20` | No | write/job limit |
| `RATE_LIMIT_UPLOADS_PER_HOUR` | backend | `30` | `30` | No | upload bucket |
| `RATE_LIMIT_STATUS_PER_HOUR` | backend | `300` | `300` | No | polling bucket |
| `RATE_LIMIT_DOWNLOADS_PER_HOUR` | backend | `100` | `100` | No | download/preview bucket |
| `RATE_LIMIT_TRUST_PROXY` | backend | `true` | `true` | No | only correct behind trusted reverse proxy |

## Related Documents

- [../ENVIRONMENT.md](../ENVIRONMENT.md)
- [../PRODUCTION_ENV.md](../PRODUCTION_ENV.md)

