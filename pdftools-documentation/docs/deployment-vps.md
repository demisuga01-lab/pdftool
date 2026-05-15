# VPS Deployment

## Purpose

Detailed VPS deployment instructions.

## Core Deploy Commands

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

## Health Commands

```bash
curl http://localhost:8000/api/health
curl -I http://localhost:3000
docker exec -it pdftool-redis redis-cli ping
```

## Related Documents

- [../DEPLOYMENT.md](../DEPLOYMENT.md)
- [../PRODUCTION_ENV.md](../PRODUCTION_ENV.md)

