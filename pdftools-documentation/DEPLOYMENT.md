# Deployment

## Purpose

Production deployment guide for PDFTools by WellFriend on the current VPS-style stack.

## Audience

- Operators
- Owners deploying updates
- Developers validating release steps

## Scope

This guide covers the current stack: VPS, PM2, Docker Redis, backend virtualenv, frontend build, workers, environment updates, checks, and rollback.

## Current Production Topology

- Frontend: Next.js app under PM2 process `pdftool-frontend`
- Backend: FastAPI app under PM2 process `pdftool-api`
- Workers: Celery workers under `pdftool-worker-fast` and `pdftool-worker-heavy`
- Redis: Docker container
- Storage: `/opt/pdftool/data`

## Deployment Paths

- App root: `/opt/pdftool`
- Backend: `/opt/pdftool/backend`
- Frontend: `/opt/pdftool/frontend`
- Runtime backend env: `/opt/pdftool/backend/.env`

## Safe Production Environment Rule

- `backend/.env.example` is tracked and safe
- `backend/.env` is runtime-only and must not be committed
- Production `ALLOWED_ORIGINS` must not include `localhost`

See [PRODUCTION_ENV.md](./PRODUCTION_ENV.md) for the exact env block.

## Standard Deploy Sequence

```bash
cd /opt/pdftool
git fetch origin master
git reset --hard origin/master
git log --oneline -1

cd /opt/pdftool/backend
source venv/bin/activate
pip install -r requirements.txt
python3 -m compileall app

cd /opt/pdftool/frontend
rm -rf .next
pnpm install
pnpm exec tsc --noEmit
pnpm build

pm2 restart pdftool-api pdftool-frontend pdftool-worker-fast pdftool-worker-heavy --update-env
pm2 save
pm2 list
```

## Backend Environment Update

```bash
cd /opt/pdftool/backend
cp .env .env.backup.$(date +%Y%m%d-%H%M%S)
```

Then write the production env from [PRODUCTION_ENV.md](./PRODUCTION_ENV.md).

## Verification Commands

```bash
curl http://localhost:8000/api/health
curl -I http://localhost:3000
docker exec -it pdftool-redis redis-cli ping
```

Additional queue checks:

```bash
cd /opt/pdftool/backend
source venv/bin/activate
celery -A app.workers.celery_app inspect active_queues
celery -A app.workers.celery_app inspect registered
celery -A app.workers.celery_app inspect active
celery -A app.workers.celery_app inspect reserved
celery -A app.workers.celery_app inspect scheduled
```

## Cleanup Cron

Recommended:

```bash
0 * * * * cd /opt/pdftool/backend && /opt/pdftool/backend/venv/bin/python -m app.scripts.cleanup_files >> /var/log/pdftool/cleanup.log 2>&1
```

## External Tool Check

Make sure required commands are installed and reachable on the VPS:

- `gs`
- `mutool`
- `qpdf`
- `pdftotext`
- `pdftohtml`
- `pdfimages`
- `pdftops`
- `libreoffice`
- `convert`
- `vips`
- `inkscape`
- `tesseract`
- `ocrmypdf`
- compression utilities used by current configuration

Production note: use `convert`, not `magick`, as the expected ImageMagick command.

## Common Deployment Failures

| Symptom | Likely cause | Check | Fix |
| --- | --- | --- | --- |
| Frontend build fails | dependency or Next issue | `pnpm build` | fix source/build problem before restart |
| Backend compile fails | syntax/import error | `python3 -m compileall app` | fix backend code before restart |
| Jobs stay queued | workers not healthy | `pm2 logs pdftool-worker-heavy` | restart workers and inspect Redis |
| OCR fails immediately | missing OCR tools | `which tesseract`, `which ocrmypdf` | install missing tools |
| Watermark SVG fails | missing `inkscape` and no `convert` fallback | worker logs | install tool or use raster watermark |

## Rollback

```bash
cd /opt/pdftool
git fetch origin
git checkout <previous-good-commit>

cd /opt/pdftool/backend
source venv/bin/activate
pip install -r requirements.txt
python3 -m compileall app

cd /opt/pdftool/frontend
rm -rf .next
pnpm install
pnpm exec tsc --noEmit
pnpm build

pm2 restart pdftool-api pdftool-frontend pdftool-worker-fast pdftool-worker-heavy --update-env
pm2 save
```

## Related Documents

- [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md)
- [PRODUCTION_ENV.md](./PRODUCTION_ENV.md)
- [OPERATIONS.md](./OPERATIONS.md)
- [docs/deployment-vps.md](./docs/deployment-vps.md)

