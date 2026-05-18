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
- Global rate limit: `200 requests/hour/IP`
- Jobs per tool bucket: `40 requests/hour/IP`
- Uploads: `60 requests/hour/IP`
- Status polling per tool bucket: `1000 requests/hour/IP`
- Downloads per tool bucket: `200 requests/hour/IP`
- Retention horizon: verify against runtime environment before deploy.
- Production ImageMagick command: `convert`

## PM2 Processes

- `pdftool-api`
- `pdftool-frontend`
- `pdftool-worker-fast`
- `pdftool-worker-heavy`

The repository also includes a secret-free `ecosystem.config.js`. Review paths before use, run Git/build/PM2 app commands as the `pdftool` user, and keep Docker/system commands under root or sudo.

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
python3 -m app.scripts.check_readiness
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

Optional ecosystem-config flow after reviewing paths:

```bash
cd /opt/pdftool
pm2 start ecosystem.config.js
pm2 restart ecosystem.config.js --update-env
pm2 save
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
- Download panel mentions temporary results
- Recent Jobs panel records metadata only and can clear/remove entries
- Failed job panel points user to `support@wellfriend.online` with job ID
- Failed job panel can copy report details without internal paths, tracebacks, logs, secrets, or command lines

## Rate-Limit Tests

- Confirm `429` response appears after repeated calls
- Confirm `Retry-After` and `X-RateLimit-*` headers are present
- Confirm status polling uses the separate high bucket and does not consume the strict job quota
- Confirm a polling `429` slows the UI check rate without turning an active job into `Processing failed`
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
- Some advanced controls are planned and intentionally hidden, disabled, or documented as unavailable
- Mobile interaction quality still benefits from real-device QA
- OCR, conversion, compression, and watermark reliability depend on installed host tools
