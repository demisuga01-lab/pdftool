# Security Hardening

## Purpose

List the concrete security measures found in the current repository.

## Implemented Measures

- centralized safe exception handlers
- security headers middleware
- Redis-backed rate limiting
- upload-size enforcement during streaming save
- archive traversal and size protections
- safe file ID validation
- safe output path validation
- SVG watermark inspection and rasterization
- no `shell=True` SVG rasterization path
- sanitized worker failures

## Operator Responsibilities

- keep host CLI tools patched
- keep Redis healthy
- keep cleanup scheduler active
- avoid exposing backend directly when trust-proxy mode is on

## Related Documents

- [../SECURITY.md](../SECURITY.md)
- [external-tools.md](./external-tools.md)

