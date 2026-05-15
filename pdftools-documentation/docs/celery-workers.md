# Celery Workers

## Purpose

Document worker behavior, queue routing, and runtime inspection.

## Audience

- Operators
- Backend developers

## Celery App

- file: `backend/app/workers/celery_app.py`
- broker: Redis
- result backend: Redis

## Queues

- `fast`
- `heavy`

## Important Settings

- `worker_prefetch_multiplier=1`
- `task_acks_late=True`
- `task_reject_on_worker_lost=True`
- `result_expires=86400`

## Why Prefetch 1 Matters

Long tasks should not be hoarded by one worker. Prefetch `1` keeps queue distribution more predictable and reduces the chance of one worker holding several heavy tasks at once.

## PM2 Worker Processes

- `pdftool-worker-fast`
- `pdftool-worker-heavy`

## Inspect Commands

```bash
cd /opt/pdftool/backend
source venv/bin/activate
celery -A app.workers.celery_app inspect active_queues
celery -A app.workers.celery_app inspect registered
celery -A app.workers.celery_app inspect active
celery -A app.workers.celery_app inspect reserved
celery -A app.workers.celery_app inspect scheduled
```

## Heavy-Routed Tasks

- shared compression
- shared conversion
- Office to PDF
- OCR
- some batch image flows

## Fast-Routed Tasks

- merge
- split
- rotate
- watermark
- basic image transforms

## Failure Behavior

- worker task wrappers sanitize exceptions
- status endpoints surface safe error strings
- compression task has explicit timeout failure messaging

## Related Documents

- [workers-and-queues.md](./workers-and-queues.md)
- [deployment-vps.md](./deployment-vps.md)
- [troubleshooting-index.md](./troubleshooting-index.md)

