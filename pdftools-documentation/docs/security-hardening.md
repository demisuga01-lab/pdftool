# Security Hardening

## Purpose

List the concrete security measures found in the current repository.

## Implemented Measures

- centralized safe exception handlers
- security headers middleware
- Redis-backed rate limiting
- upload-size enforcement during streaming save
- File Tools-specific 100 MB upload limit
- archive traversal and size protections
- basic ClamAV scanning for configured File Tools, archive, and Office uploads
- safe file ID validation
- safe output path validation
- SVG watermark inspection and rasterization
- no `shell=True` SVG rasterization path
- sanitized worker failures
- fail-open scanner behavior so ClamAV outages do not create upload-blocking 500 errors

## Operator Responsibilities

- keep host CLI tools patched
- keep Redis healthy
- keep cleanup scheduler active
- avoid exposing backend directly when trust-proxy mode is on
- keep ClamAV daemon and signature updates healthy when relying on scanning signals

## Virus Scanning Boundaries

- Virus Scanner accepts any file type and only scans the file.
- ClamAV scan results are signature-based and should not be described as proving a file is safe.
- User-facing copy should say "flagged by virus scanning" or "scanned with ClamAV"; do not use stronger claims.

## Related Documents

- [../SECURITY.md](../SECURITY.md)
- [external-tools.md](./external-tools.md)
