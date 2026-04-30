# Production Environment

## Purpose

Document the safe production backend environment template without committing runtime secrets.

## Audience

- Operators
- Owners updating VPS config
- Reviewers checking repository safety

## Scope

This file documents the production values that belong in the VPS runtime backend environment file.

## Rules

- `backend/.env.example` is the safe Git-tracked template
- `backend/.env` is the real runtime file and must stay ignored by Git
- local `backend/.env` may include localhost in CORS for development
- production `backend/.env` must not include localhost in `ALLOWED_ORIGINS`
- do not commit the real `.env`

## Runtime Path On VPS

`/opt/pdftool/backend/.env`

## Production Values

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
RATE_LIMIT_GLOBAL_PER_HOUR=100
RATE_LIMIT_JOBS_PER_HOUR=20
RATE_LIMIT_UPLOADS_PER_HOUR=30
RATE_LIMIT_STATUS_PER_HOUR=300
RATE_LIMIT_DOWNLOADS_PER_HOUR=100
RATE_LIMIT_REDIS_URL=redis://localhost:6379/0
RATE_LIMIT_TRUST_PROXY=true
```

## Exact VPS Command

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

pm2 restart pdftool-api pdftool-worker-fast pdftool-worker-heavy --update-env
pm2 save
```

## Verification Commands

```bash
cd /opt/pdftool/backend
source venv/bin/activate
python3 -m compileall app
curl -f http://localhost:8000/api/health
docker exec -it pdftool-redis redis-cli ping
```

