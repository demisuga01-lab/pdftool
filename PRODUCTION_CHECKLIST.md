# PDFTools Production Checklist

This checklist is for deploying **PDFTools by WellFriend** to:

`https://tools.wellfriend.online`

## 1. Current production policy

- Maximum upload size: `25 MB` per file
- Maximum batch upload total: `100 MB`
- Maximum extracted archive size: `100 MB`
- Maximum extracted archive file count: `200`
- File retention: `24 hours`
- Global anonymous rate limit: `100 requests/hour/IP`
- Jobs: `20/hour/IP`
- Uploads: `30/hour/IP`
- Status polling: `300/hour/IP`
- Downloads: `100/hour/IP`
- Backend CORS origin: `https://tools.wellfriend.online`
- ImageMagick command in production: `convert`

## 2. Contact and support

- Bugs, broken tools, processing failures, upload/download problems, abuse, and security reports: `support@wellfriend.online`
- General contact, API access, API questions, feature suggestions, business, and partnerships: `contact@wellfriend.online`
- Future API product: `api.wellfriend.online`
- Mailcow status page: `https://postal.wellfriend.online`

## 3. PM2 process names

Use these exact PM2 process names:

- `pdftool-api`
- `pdftool-frontend`
- `pdftool-worker-fast`
- `pdftool-worker-heavy`

## 4. Windows commit and push flow

```powershell
cd E:\pdftool
git status --short
git add -A
git diff --cached --name-only
git commit -m "production hardening final release"
git push origin master
```

Before committing, make sure the staged list does **not** include:

- `backend/.env`
- `frontend/.env`
- `*.pem`
- private keys
- passwords
- `node_modules`
- `.next`
- `venv`

## 5. VPS pull and deploy reset flow

```bash
cd /opt/pdftool
git fetch origin
git status
git reset --hard origin/master
```

Use `git reset --hard origin/master` only on the VPS deployment checkout after confirming there are no local-only files to preserve.

## 6. Backend env update

Use the template in [PRODUCTION_ENV.md](/e:/pdftool/PRODUCTION_ENV.md).

Quick command sequence:

```bash
cd /opt/pdftool/backend
cp .env .env.backup.$(date +%Y%m%d-%H%M%S)
cat > .env <<'EOF'
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
RATE_LIMIT_GLOBAL_PER_HOUR=100
RATE_LIMIT_JOBS_PER_HOUR=20
RATE_LIMIT_UPLOADS_PER_HOUR=30
RATE_LIMIT_STATUS_PER_HOUR=300
RATE_LIMIT_DOWNLOADS_PER_HOUR=100
RATE_LIMIT_REDIS_URL=redis://localhost:6379/0
RATE_LIMIT_TRUST_PROXY=true
EOF
```

Do not commit the real `.env`.

## 7. Backend install and compile

```bash
cd /opt/pdftool/backend
source venv/bin/activate
pip install -r requirements.txt
python -m compileall app
```

## 8. Frontend install and build

```bash
cd /opt/pdftool/frontend
pnpm install --frozen-lockfile
pnpm exec tsc --noEmit
pnpm build
```

If the Windows build ever fails with the known Next.js `generate is not a function` issue, do not restart production until the Linux/VPS build succeeds.

## 9. PM2 restart

```bash
pm2 restart pdftool-api pdftool-frontend pdftool-worker-fast pdftool-worker-heavy --update-env
pm2 save
```

## 10. Redis and Celery queue checks

```bash
docker exec -it pdftool-redis redis-cli ping
cd /opt/pdftool/backend
source venv/bin/activate
celery -A app.workers.celery_app inspect active_queues
celery -A app.workers.celery_app inspect stats
celery -A app.workers.celery_app inspect ping
```

Expected queue names in code:

- `fast`
- `heavy`

Heavy-routed tasks in the current codebase:

- `app.workers.compress_tasks.compress_file_task`
- `app.workers.convert_tasks.convert_file_task`
- `app.workers.pdf_tasks.compress_pdf_task`
- `app.workers.pdf_tasks.ocr_pdf_task`
- `app.workers.pdf_tasks.office_to_pdf_task`
- `app.workers.image_tasks.batch_resize_task`
- `app.workers.image_tasks.ocr_image_task`

## 11. Health checks

```bash
curl -f https://tools.wellfriend.online/api/health
curl -I https://tools.wellfriend.online
curl -I https://tools.wellfriend.online/api/health
```

## 12. Security and CORS checks

- `backend/.env` must not be committed
- `frontend/.env` must not be committed
- `ALLOWED_ORIGINS` must not contain `*`
- Production `ALLOWED_ORIGINS` should be `https://tools.wellfriend.online` unless another trusted origin is intentionally added
- `RATE_LIMIT_TRUST_PROXY=true` is correct only when the backend is behind a trusted reverse proxy
- If backend port `8000` is directly exposed, firewall it or set `RATE_LIMIT_TRUST_PROXY=false`
- API responses should not expose tracebacks or internal filesystem paths

## 13. Cleanup cron

```bash
0 * * * * cd /opt/pdftool/backend && /opt/pdftool/backend/venv/bin/python -m app.scripts.cleanup_files >> /var/log/pdftool/cleanup.log 2>&1
```

This cleanup script enforces `FILE_RETENTION_HOURS=24`.

## 14. Smoke tests

- Upload a file smaller than `25 MB` and confirm normal processing
- Upload a file larger than `25 MB` and confirm the user sees: `File is too large. Maximum size is 25 MB.`
- Confirm a multi-file batch larger than `100 MB` is rejected safely
- Confirm `/api/health` returns success
- Confirm rate-limited requests return `429` plus `Retry-After` and `X-RateLimit-*` headers
- Confirm PDF to JPG works and downloads with `.jpg` outputs and `image/jpeg`
- Confirm SVG watermark either rasterizes safely or shows: `SVG watermark could not be processed. Upload PNG, JPG, or WebP instead.`
- Confirm image watermark export matches preview placement
- Confirm support failures direct users to `support@wellfriend.online` with the job ID
- Confirm footer, contact, upload, and tool copy uses the correct support and contact emails

## 15. Rollback

```bash
cd /opt/pdftool
git fetch origin
git checkout <previous-good-commit-or-tag>
cd backend
source venv/bin/activate
pip install -r requirements.txt
python -m compileall app
cd ../frontend
pnpm install --frozen-lockfile
pnpm exec tsc --noEmit
pnpm build
pm2 restart pdftool-api pdftool-frontend pdftool-worker-fast pdftool-worker-heavy --update-env
pm2 save
```

## 16. VPS tooling requirements

```text
gs
mutool
qpdf
pdftotext
libreoffice
convert
vips
tesseract
inkscape
ocrmypdf
pngquant
oxipng
jpegoptim
cwebp
avifenc
7z
brotli
```

Production note:

- Production uses `convert`; do not rely on `magick`.
