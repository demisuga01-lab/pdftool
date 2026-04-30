# Troubleshooting

## Purpose

Problem-to-fix guide for common PDFTools failures in development and production.

## Audience

- Operators
- Developers
- Support staff

## Scope

This document summarizes common symptoms, likely causes, checks, and fixes. The deeper quick index lives in [docs/troubleshooting-index.md](./docs/troubleshooting-index.md).

## Fast Triage Order

1. Identify whether the issue is frontend, backend, worker, Redis, storage, or external CLI related.
2. Capture route, tool, timestamp, and job ID.
3. Check health endpoint and PM2 status.
4. Check worker logs and Redis.
5. Confirm whether the problem is code, configuration, missing tool, or user input.

## High-Value Checks

```bash
pm2 list
pm2 logs pdftool-api --lines 100
pm2 logs pdftool-worker-fast --lines 100
pm2 logs pdftool-worker-heavy --lines 100
docker exec -it pdftool-redis redis-cli ping
curl -f http://localhost:8000/api/health
df -h
du -sh /opt/pdftool/data/*
```

## Common Issues

| Symptom | Likely cause | Check | Fix |
| --- | --- | --- | --- |
| Frontend build fails | source/build issue | `pnpm build` | fix build error before deploy |
| Backend compile fails | syntax/import error | `python3 -m compileall app` | fix backend code before restart |
| API health fails | backend down or env issue | `pm2 logs pdftool-api` | restore backend and verify env |
| Redis ping fails | Redis container stopped | `docker ps` | restart Redis container |
| Worker not consuming | worker down or broker issue | `pm2 logs pdftool-worker-heavy` | restart worker and inspect Redis |
| Job stuck queued | no healthy worker or wrong routing | Celery inspect commands | restart workers, inspect queues |
| Job active but slow | heavy processing or large file | worker logs | wait, reduce input, or tune tools |
| File upload rejected | over size limit | frontend/backend error text | use smaller file |
| 429 rate limit | expected bucket hit | response headers | wait or tune policy |
| SVG watermark fails | unsafe or unsupported SVG | worker logs | use PNG/JPG/WebP or simplify SVG |
| PDF to JPG fails | missing tool or format mismatch | conversion logs | confirm `mutool` and normalization path |
| Download not found | output expired or missing | output path and cleanup timing | reprocess file |
| Mobile drawer will not scroll | mobile gesture regression | browser/device QA | verify current drawer model |

## Known Recurring Themes

- Missing external CLI tools
- Drift between advanced frontend controls and backend support
- Timeouts on OCR or compression
- Cleanup removing expired files before the user retries download
- Reverse proxy or CORS misconfiguration

## Related Documents

- [docs/troubleshooting-index.md](./docs/troubleshooting-index.md)
- [docs/error-handling.md](./docs/error-handling.md)
- [OPERATIONS.md](./OPERATIONS.md)
- [DEPLOYMENT.md](./DEPLOYMENT.md)

