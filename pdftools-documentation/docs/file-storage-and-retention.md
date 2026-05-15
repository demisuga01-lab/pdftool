# File Storage and Retention

## Purpose

Describe how runtime files are stored and cleaned up.

## Storage Roots

- `DATA_DIR`
- `UPLOAD_DIR`
- `OUTPUT_DIR`
- `TEMP_DIR`

## Stored Artifacts

- uploads and metadata JSON
- output files
- preview cache
- temporary render products

## File ID Generation

- upload IDs are random hex strings generated with UUID
- file IDs are validated before path resolution

## Retention

- current cleanup horizon: configured by runtime retention settings
- cleanup script: `backend/app/scripts/cleanup_files.py`

## Useful Commands

```bash
df -h
du -sh /opt/pdftool/data/*
find /opt/pdftool/data/uploads -type f -mtime +1
find /opt/pdftool/data/outputs -type f -mtime +1
```

## Cleanup Warnings

Do not manually delete files recursively without confirming the target path and retention policy.

## Related Documents

- [../PRODUCTION_CHECKLIST.md](../PRODUCTION_CHECKLIST.md)
- [deployment-vps.md](./deployment-vps.md)
