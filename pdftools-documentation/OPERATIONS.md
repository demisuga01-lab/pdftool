# Operations

## Purpose

Day-to-day operator guide for PDFTools production.

## Audience

- VPS operator
- Owner maintaining uptime
- Support lead doing first-pass triage

## Scope

This guide covers routine checks, incident handling, logs, queue health, disk usage, cleanup verification, and restart procedures.

## Daily Checks

- `pm2 list`
- `curl -f http://localhost:8000/api/health`
- `docker exec -it pdftool-redis redis-cli ping`
- backend readiness script after deploys or server changes
- quick test of homepage and one upload route
- check support inbox for repeated failures or abuse reports

## Weekly Checks

- `df -h`
- `du -sh /opt/pdftool/data/*`
- review PM2 logs for repeated failures
- verify cleanup cron still exists and log file is moving
- verify a sample OCR and conversion still works
- review mail reputation and delivery if support mail is critical

## Core Commands

```bash
pm2 list
pm2 logs pdftool-api --lines 100
pm2 logs pdftool-frontend --lines 100
pm2 logs pdftool-worker-fast --lines 100
pm2 logs pdftool-worker-heavy --lines 100
docker ps
docker exec -it pdftool-redis redis-cli ping
df -h
du -sh /opt/pdftool/data/*
```

## Backend Readiness Check

Run this from the backend virtualenv after deploys, dependency changes, or VPS maintenance:

```bash
cd /opt/pdftool/backend
source venv/bin/activate
python3 -m app.scripts.check_readiness
```

`OK` means the check passed. `WARNING` means an optional tool or non-critical setting needs review. `MISSING` or `FAIL` on a critical check should be fixed before considering the deployment ready.

The script checks Redis, writable runtime directories, critical CLI tools, optional optimizer tools, Python imports, and production config values. It redacts Redis credentials and does not connect to the public internet.

## Queue and Worker Checks

```bash
cd /opt/pdftool/backend
source venv/bin/activate
celery -A app.workers.celery_app inspect active_queues
celery -A app.workers.celery_app inspect active
celery -A app.workers.celery_app inspect reserved
celery -A app.workers.celery_app inspect scheduled
```

## Why Redis Queue Length Can Be Zero While Tasks Are Still Running

Workers can reserve and start tasks immediately. Once a worker has a task in memory, Redis list length may drop to zero even though the task is still active. Use Celery inspect commands and worker logs, not only Redis list length, to determine real progress.

## Disk Usage

Check:

```bash
df -h
du -sh /opt/pdftool/data/*
```

If usage climbs:

- confirm cleanup cron
- inspect temp previews
- inspect outputs not yet deleted
- check for failed or abandoned large archive jobs

## Restart Procedures

### Soft application restart

```bash
pm2 restart pdftool-api pdftool-frontend pdftool-worker-fast pdftool-worker-heavy --update-env
pm2 save
```

### Ecosystem config restart

The repository includes `ecosystem.config.js` as a safe, secret-free PM2 process definition. Review the `/opt/pdftool` paths before use.

```bash
cd /opt/pdftool
pm2 start ecosystem.config.js
pm2 restart ecosystem.config.js --update-env
pm2 save
```

Run Git, build, and PM2 app commands as the `pdftool` user. Run Docker and system service commands as root or through sudo according to the VPS playbook.

The frontend process in the ecosystem file uses the current `pnpm start` runtime pattern. Only switch to a host-bound `next start -H 127.0.0.1` command after testing that the local Next.js setup and reverse proxy support it.

### Safe reboot preparation

- verify no urgent production processing is in flight
- capture `pm2 list`
- capture recent logs
- confirm Redis container autostart behavior

## Incident Response

1. Record impact and affected routes
2. Identify whether API, frontend, Redis, workers, or storage is failing
3. Preserve logs before restarting if possible
4. Restore minimal service first
5. Run one smoke test after recovery
6. Check support inbox for correlated user reports

## Backup Considerations

- Back up Git history and deployment repo
- Back up environment configuration securely outside Git
- Runtime uploads and outputs are temporary by design and may not need long-term backup

## Cloudflare and SSL Notes

- Cloudflare challenge behavior can block naive curl tests against the public domain
- Always keep at least one localhost or origin health check path in your playbook
- Review certificate expiry and frontend accessibility regularly

## Related Documents

- [DEPLOYMENT.md](./DEPLOYMENT.md)
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- [docs/deployment-vps.md](./docs/deployment-vps.md)
- [docs/celery-workers.md](./docs/celery-workers.md)
