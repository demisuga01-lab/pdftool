# Contributing

## Purpose

Guide local development and safe repository changes.

## Audience

- Developers
- Maintainers
- Future contributors

## Scope

This guide covers local setup, checks, security rules, and what must be updated when adding features.

## Local Setup

See [docs/local-development-windows.md](./docs/local-development-windows.md) for the detailed Windows flow.

Core checks:

```powershell
cd E:\pdftool
py -3 -m compileall backend\app
cd frontend
pnpm exec tsc --noEmit
pnpm build
```

## Code and Change Rules

- Do not commit `.env` files
- Do not commit PEM keys, passwords, or runtime uploads
- Keep documentation updates inside `pdftools-documentation/`
- Treat backend services and workers as the source of truth for actual processing behavior

## When Adding a Tool

- add or update the frontend route
- add or update backend route if needed
- add or update worker task if asynchronous
- update [FEATURES.md](./FEATURES.md)
- update [API_REFERENCE.md](./API_REFERENCE.md) if new endpoints exist
- update relevant topic pages under `docs/`

## When Adding a Route

- document URL and user flow in [docs/frontend-routes.md](./docs/frontend-routes.md)
- document support and error states if user-facing

## When Adding an API Endpoint

- document method, path, fields, outputs, errors, and rate-limit bucket
- update [API_REFERENCE.md](./API_REFERENCE.md)
- update [docs/backend-api.md](./docs/backend-api.md)

## When Adding a Celery Task

- document queue and timeout
- update [docs/celery-workers.md](./docs/celery-workers.md)
- update [docs/workers-and-queues.md](./docs/workers-and-queues.md)

## When Adding an External Dependency

- document install and failure behavior in [docs/external-tools.md](./docs/external-tools.md)
- document why the dependency exists

## Test Checklist

- backend compile
- frontend typecheck
- frontend build
- one smoke test for affected tool
- error-path test for affected tool

## PR Checklist

- no secrets added
- docs updated
- routes and workers documented
- limits and policy changes documented if touched
- manual smoke checks noted if code is UI-heavy

