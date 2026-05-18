// PM2 process definitions for the production VPS.
//
// Review paths before use. Git/build/PM2 application commands should run as
// the `pdftool` user. Docker and system package/service commands should run
// as root or through sudo according to the server playbook.
//
// This file intentionally contains no secrets. Runtime configuration should
// continue to come from the backend/frontend environment files on the server.

module.exports = {
  apps: [
    {
      name: "pdftool-api",
      cwd: "/opt/pdftool/backend",
      script: "venv/bin/uvicorn",
      args: "app.main:app --host 127.0.0.1 --port 8000",
      interpreter: "none",
      autorestart: true,
      env: {
        PYTHONUNBUFFERED: "1",
      },
    },
    {
      name: "pdftool-frontend",
      cwd: "/opt/pdftool/frontend",
      script: "pnpm",
      args: "start",
      interpreter: "none",
      autorestart: true,
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "pdftool-worker-fast",
      cwd: "/opt/pdftool/backend",
      script: "venv/bin/celery",
      args: "-A app.workers.celery_app worker -Q fast -n fast@%h --concurrency=4 --loglevel=info",
      interpreter: "none",
      autorestart: true,
      env: {
        PYTHONUNBUFFERED: "1",
      },
    },
    {
      name: "pdftool-worker-heavy",
      cwd: "/opt/pdftool/backend",
      script: "venv/bin/celery",
      args: "-A app.workers.celery_app worker -Q heavy -n heavy@%h --concurrency=2 --loglevel=info",
      interpreter: "none",
      autorestart: true,
      env: {
        PYTHONUNBUFFERED: "1",
      },
    },
  ],
};
