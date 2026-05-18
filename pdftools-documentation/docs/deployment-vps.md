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
python3 -m app.scripts.check_readiness

cd /opt/pdftool/frontend
rm -rf .next
pnpm install
pnpm exec tsc --noEmit
pnpm build

pm2 restart pdftool-api pdftool-frontend pdftool-worker-fast pdftool-worker-heavy --update-env
pm2 save
pm2 list
```

## PM2 Ecosystem Config

The repository includes a secret-free `ecosystem.config.js` with the expected API, frontend, fast worker, and heavy worker process names. Review the `/opt/pdftool` paths before first use.

```bash
cd /opt/pdftool
pm2 start ecosystem.config.js
pm2 restart ecosystem.config.js --update-env
pm2 save
```

Git, build, and PM2 app commands should run as the `pdftool` user. Docker and system commands should run as root or through sudo. The current frontend command remains `pnpm start`; if the local Next.js setup supports it and the reverse proxy expects loopback only, document and test `next start -H 127.0.0.1` before changing the PM2 command.

## Readiness Output

`python3 -m app.scripts.check_readiness` prints `OK`, `WARNING`, `MISSING`, or `FAIL` for Redis, storage directories, required CLI tools, optional optimizers, Python imports, and key production settings. Critical `MISSING` or `FAIL` results return a nonzero exit code.

## Health Commands

```bash
curl http://localhost:8000/api/health
curl -I http://localhost:3000
docker exec -it pdftool-redis redis-cli ping
```

## Related Documents

- [../DEPLOYMENT.md](../DEPLOYMENT.md)
- [../PRODUCTION_ENV.md](../PRODUCTION_ENV.md)
