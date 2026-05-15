# Pre-Commit Final Check

Run these commands before committing:

```powershell
cd E:\pdftool
git status --short
git add -A
git diff --cached --name-only
```

Check that the staged list does **not** include:

- `backend/.env`
- `frontend/.env`
- `*.pem`
- private keys
- passwords
- `node_modules`
- `.next`
- `venv`

Then run:

```powershell
git commit -m "production hardening final release"
git push origin master
```

Post-push VPS deploy commands:

```bash
cd /opt/pdftool
git fetch origin
git reset --hard origin/master

cd /opt/pdftool/backend
cp .env .env.backup.$(date +%Y%m%d-%H%M%S)
# Replace .env with the values from PRODUCTION_ENV.md when needed.
source venv/bin/activate
python -m compileall app

cd /opt/pdftool/frontend
pnpm install --frozen-lockfile
pnpm exec tsc --noEmit
pnpm build

pm2 restart pdftool-api pdftool-frontend pdftool-worker-fast pdftool-worker-heavy --update-env
pm2 save
```
