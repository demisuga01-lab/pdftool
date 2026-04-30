# Production Checklist

## Purpose

Copy-paste-ready release and deploy checklist for PDFTools by WellFriend.

## Audience

- Owner/operator
- Release manager
- Support person validating production after deploy

## Scope

This checklist assumes the current PM2 process names and current public policy in code.

## Policy Snapshot

- Upload size: `25 MB` per file
- Batch total: `100 MB`
- Archive extracted total: `100 MB`
- Archive extracted file count: `200`
- Global rate limit: `100 requests/hour/IP`
- Retention: `24 hours`
- Production ImageMagick command: `convert`

## PM2 Processes

- `pdftool-api`
- `pdftool-frontend`
- `pdftool-worker-fast`
- `pdftool-worker-heavy`

## Pre-Commit Checks

```powershell
cd E:\pdftool
git status --short
git add -A
git diff --cached --name-only
```

Verify the staged list does not include:

- `backend/.env`
- `frontend/.env`
- `.env`
- `*.pem`
- private keys
- passwords
- `node_modules`
- `.next`
- `venv`
- runtime uploads or outputs

## Local Validation

```powershell
cd E:\pdftool\backend
py -3 -m compileall app

cd ..\frontend
pnpm exec tsc --noEmit
pnpm build
```

## VPS Update Steps

```bash
cd /opt/pdftool
git fetch origin master
git reset --hard origin/master
git log --oneline -1
```

## Backend Environment Update

Use [PRODUCTION_ENV.md](./PRODUCTION_ENV.md). Then:

```bash
cd /opt/pdftool/backend
source venv/bin/activate
pip install -r requirements.txt
python3 -m compileall app
```

## Frontend Build

```bash
cd /opt/pdftool/frontend
rm -rf .next
pnpm install
pnpm exec tsc --noEmit
pnpm build
```

## Restart

```bash
pm2 restart pdftool-api pdftool-frontend pdftool-worker-fast pdftool-worker-heavy --update-env
pm2 save
pm2 list
```

## Redis and Queue Checks

```bash
docker exec -it pdftool-redis redis-cli ping

cd /opt/pdftool/backend
source venv/bin/activate
celery -A app.workers.celery_app inspect active_queues
celery -A app.workers.celery_app inspect active
celery -A app.workers.celery_app inspect reserved
celery -A app.workers.celery_app inspect scheduled
```

## Cleanup Cron Check

```bash
crontab -l
```

Expected job pattern:

```bash
0 * * * * cd /opt/pdftool/backend && /opt/pdftool/backend/venv/bin/python -m app.scripts.cleanup_files >> /var/log/pdftool/cleanup.log 2>&1
```

## Health Checks

```bash
curl -f http://localhost:8000/api/health
curl -I http://localhost:3000
curl -I https://tools.wellfriend.online
```

## Smoke Tests

- Homepage loads
- Header navigation works
- Dark mode toggle works
- Contact page shows correct support and contact emails
- File upload under 25 MB succeeds
- File over 25 MB is rejected with safe message
- PDF to JPG succeeds
- PNG compression succeeds
- OCR works for at least one sample
- PDF watermark works with text
- Image watermark works with text
- SVG watermark either succeeds safely or fails with safe SVG message
- Download works
- Failed job panel points user to `support@wellfriend.online` with job ID

## Rate-Limit Tests

- Confirm `429` response appears after repeated calls
- Confirm `Retry-After` and `X-RateLimit-*` headers are present
- Confirm `/api/health` remains available

## Mail Tests

- `support@wellfriend.online` receives mail
- `contact@wellfriend.online` receives mail
- Alias handling documented in mail docs is still correct

## Logs

```bash
pm2 logs pdftool-api --lines 100
pm2 logs pdftool-frontend --lines 100
pm2 logs pdftool-worker-fast --lines 100
pm2 logs pdftool-worker-heavy --lines 100
```

## Rollback

```bash
cd /opt/pdftool
git checkout <previous-good-commit>
cd backend
source venv/bin/activate
pip install -r requirements.txt
python3 -m compileall app
cd ../frontend
rm -rf .next
pnpm install
pnpm exec tsc --noEmit
pnpm build
pm2 restart pdftool-api pdftool-frontend pdftool-worker-fast pdftool-worker-heavy --update-env
pm2 save
```

## Known Risks

- Some frontend control surfaces expose settings that current backend routes do not consume yet
- Mobile interaction quality still benefits from real-device QA
- OCR, conversion, compression, and watermark reliability depend on installed host tools

