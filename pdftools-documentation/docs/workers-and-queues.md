# Workers and Queues

## Purpose

Quick routing summary for Celery tasks.

## Fast Queue

Typical tasks:

- merge
- split
- rotate
- watermark
- extract text
- image convert/resize/crop/rotate/remove background

## Heavy Queue

Typical tasks:

- universal compression
- universal conversion
- OCR
- Office to PDF
- batch resize

## PM2 Mapping

- `pdftool-worker-fast` -> fast queue worker
- `pdftool-worker-heavy` -> heavy queue worker

The checked-in `ecosystem.config.js` maps these workers to the expected queue commands. Review paths before using it on a server.

## Related Documents

- [celery-workers.md](./celery-workers.md)
- [deployment-vps.md](./deployment-vps.md)
