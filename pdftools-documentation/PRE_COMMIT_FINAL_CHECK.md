# Pre-Commit Final Check

## Purpose

Exact commands to run before committing and pushing repository changes.

## Audience

- Owner
- Maintainer
- Anyone preparing a manual release commit

## Local Commands

```powershell
cd E:\pdftool
git status --short
git add -A
git diff --cached --name-only
```

## Must Not Be Staged

- `backend/.env`
- `frontend/.env`
- `.env`
- `*.pem`
- private keys
- passwords
- `node_modules`
- `.next`
- `venv`
- `data/uploads`
- `data/outputs`

## Commit and Push

```powershell
git commit -m "production hardening final release"
git push origin master
```

## VPS Deploy Commands

```bash
cd /opt/pdftool
git fetch origin master
git reset --hard origin/master

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

## Smoke Test Checklist

- homepage loads
- upload under 25 MB works
- oversize upload is rejected safely
- one PDF workflow works
- one image workflow works
- one compression or conversion workflow works
- one OCR workflow works
- failed job still shows safe error and support mailbox

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

