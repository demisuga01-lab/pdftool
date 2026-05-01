# PDFTools by WellFriend Documentation

## Purpose

Fast entry point to the full documentation system for **PDFTools by WellFriend**.

## Audience

- New developers
- Operators and deployers
- Support and abuse triage
- Product owners
- Security reviewers
- Future Codex sessions

## Scope

This documentation covers the public website, frontend routes, backend API, Celery jobs, workers, file lifecycle, production deployment, support workflows, security hardening, rate limiting, mobile workspace behavior, and known limitations.

## Product Summary

PDFTools by WellFriend is a browser-based file processing workspace for PDFs and images. The current public app is open and free to use, focuses on common PDF/image workflows, and relies on a Next.js frontend with a FastAPI and Celery backend for asynchronous processing.

## Live Services

- Website: <https://tools.wellfriend.online>
- Website documentation route: `/docs`
- Mail host: <https://postal.wellfriend.online>

## Contact

- Bugs, processing failures, upload/download problems, security issues, and abuse reports: `support@wellfriend.online`
- API questions, general contact, feature suggestions, business, and partnerships: `contact@wellfriend.online`
- Community help, updates, and discussion: <https://discord.gg/ZQFmYaQbVu>

## Current Production Limits

- Maximum upload size: `25 MB` per file
- Maximum multi-file batch total: `100 MB`
- Maximum extracted archive total: `100 MB`
- Maximum extracted archive files: `200`
- Global public rate limit: `200 requests/hour/IP`
- Files deleted after: `24 hours`

## Feature Summary

- PDF tools: merge, split, rotate, watermark, protect, decrypt, extract text, PDF to images, images to PDF, Office to PDF
- Image tools: resize, batch resize, rotate, crop, watermark, info, remove background
- Shared workspaces: convert, compress, OCR
- Workspace system: compact, grid, and visual editor layouts
- Mobile editor: bottom drawer, sticky actions, safe-area handling
- Theme system: light, dark, system, with system as the default for new visitors
- Production hardening: rate limiting, safe errors, security headers, retention cleanup

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- FastAPI
- Celery
- Redis
- PM2
- Docker
- External CLI tools such as `gs`, `mutool`, `qpdf`, `libreoffice`, `convert`, `inkscape`, `tesseract`, and compression/image utilities

## Documentation Structure

| Path | Purpose |
| --- | --- |
| [DOCUMENTATION.md](./DOCUMENTATION.md) | Full docs map and maintenance rules |
| [FEATURES.md](./FEATURES.md) | Feature matrix across product, routes, workers, and services |
| [API_REFERENCE.md](./API_REFERENCE.md) | Backend API reference |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture and data flow |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Production deployment and rollback |
| [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md) | Release and deploy checklist |
| [SECURITY.md](./SECURITY.md) | Security model and hardening notes |
| [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) | Problem-to-fix operational guide |
| [OPERATIONS.md](./OPERATIONS.md) | Daily and weekly operator guide |
| [ENVIRONMENT.md](./ENVIRONMENT.md) | Environment variable reference |
| [SUPPORT.md](./SUPPORT.md) | User-facing support and triage guidance |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Local setup, development workflow, and change rules |
| [ROADMAP.md](./ROADMAP.md) | Planned future work only |
| [CHANGELOG.md](./CHANGELOG.md) | Documentation changelog |
| [PRODUCTION_ENV.md](./PRODUCTION_ENV.md) | Safe production environment template |
| [PRE_COMMIT_FINAL_CHECK.md](./PRE_COMMIT_FINAL_CHECK.md) | Pre-commit and pre-deploy commands |
| [docs/README.md](./docs/README.md) | Index of deeper topic pages |

## Quick Local Setup

```powershell
cd E:\pdftool
py -3 -m compileall backend\app
cd frontend
pnpm install
pnpm exec tsc --noEmit
pnpm build
```

Local backend and worker setup, Redis notes, and Windows caveats are documented in [docs/local-development-windows.md](./docs/local-development-windows.md).

## Quick Production Deploy Summary

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

See [DEPLOYMENT.md](./DEPLOYMENT.md), [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md), and [docs/deployment-vps.md](./docs/deployment-vps.md) for the full sequence.

## Start Here

- Full docs hub: [DOCUMENTATION.md](./DOCUMENTATION.md)
- Features: [FEATURES.md](./FEATURES.md)
- API: [API_REFERENCE.md](./API_REFERENCE.md)
- Architecture: [ARCHITECTURE.md](./ARCHITECTURE.md)
- Deployment: [DEPLOYMENT.md](./DEPLOYMENT.md)
- Production checklist: [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md)
- Security: [SECURITY.md](./SECURITY.md)
- Troubleshooting: [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- Support: [SUPPORT.md](./SUPPORT.md)

## Security Note

Do not commit `.env` files, PEM keys, passwords, private documents, runtime uploads, or production output files.

## Production Status

Production readiness still depends on running backend compile checks, frontend typecheck, frontend build, and manual smoke tests against the current deployment target.
