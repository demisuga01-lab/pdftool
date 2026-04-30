# Security

## Purpose

Document the current security model, public-file-processing risks, hardening measures, and operational security expectations for PDFTools by WellFriend.

## Audience

- Security reviewers
- Operators
- Developers
- Support and abuse triage

## Scope

This document describes the current implemented security posture from the repository. It does not claim that the service is suitable for every sensitive document workflow.

## Reporting Security Issues

Send security reports, abuse reports, and suspicious processing issues to:

- `support@wellfriend.online`

Include:

- affected route or tool
- timestamp
- job ID if available
- whether the issue is reproducible

## Public Risk Model

PDFTools is a public file-processing service. That means the backend must expect:

- malformed uploads
- oversized uploads
- archive bombs
- unsafe SVG input
- malicious PDF/image/Office files
- path traversal attempts
- abuse through repeated automated requests
- CLI tool failure and timeout scenarios

## Current Implemented Protections

### Upload validation

- File extensions are allowlisted
- obviously dangerous extensions are blocked
- file size is enforced during streaming save
- saved `file_id` references are revalidated before later processing

### File-size enforcement

- `25 MB` per file
- `100 MB` multi-file batch total
- `100 MB` extracted archive total
- `200` extracted archive file count

### Archive safety

- ZIP extraction checks member count
- ZIP extraction checks total extracted bytes
- ZIP extraction rejects absolute paths and `..` traversal
- ZIP extraction rejects suspicious hidden or null-byte paths

### Path and storage safety

- file IDs must match safe hex format
- upload and output paths are checked to stay inside configured roots
- preview cache paths are constrained under temp storage

### Rate limiting

- Redis-backed rate limiting is enabled by default
- distinct buckets exist for uploads, jobs, status polling, and downloads
- health endpoint is excluded
- trust-proxy behavior is environment-controlled

### CORS

- production default origin is `https://tools.wellfriend.online`
- wildcard `*` origin is rejected by config
- localhost is not the production default

### Security headers

Current middleware adds:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: geolocation=(), microphone=(), camera=(), payment=(), usb=()`
- `X-Robots-Tag: noindex, nofollow` on `/api/*`

### Error sanitization

- tracebacks are not returned to users
- internal paths such as `/opt/pdftool` and virtualenv paths are scrubbed
- support-oriented messages are returned instead of raw internal errors

### SVG safety

- suspicious SVG features are rejected before rasterization
- external references and scripts are blocked
- oversized embedded data URIs are blocked
- Inkscape is preferred, `convert` is fallback
- no `shell=True` use in rasterization helper

### Subprocess safety

- command arguments are passed as argument lists
- worker tools run under task and tool timeouts
- failures are sanitized before user display

## User-Facing Caution

Do not upload highly sensitive documents unless you trust the service and understand the `24-hour` retention policy.

## Secrets Policy

- `.env.example` files are safe templates
- `.env` files are runtime-only and ignored
- never commit passwords, private keys, PEM files, or runtime documents

## Logging and Privacy

- backend logs retain operational detail for troubleshooting
- user-facing responses are sanitized
- rate limiting may rely on IP address handling
- privacy claims on public pages should be reviewed against actual infrastructure if hosting changes

## Abuse Protection Notes

- rate limiting slows repeated automated abuse
- uploads and download/status routes are separately bucketed
- support mailbox is the abuse intake path
- direct public exposure of backend port `8000` should be avoided if trust-proxy mode is enabled

## Known Security Limitations

- no antivirus or malware scanning is implemented in current code
- Office, PDF, and image processing still rely on external tools that must be patched and maintained by the operator
- the service is not a zero-retention system; files remain available until cleanup removes them
- some UI settings imply richer backend policy handling than current endpoints actually enforce

## Future Hardening Ideas

- antivirus or malware scanning
- request tracing or correlation IDs in logs and support tooling
- richer audit logging for abuse workflows
- stronger automated tests for archive, SVG, and path safety
- authentication and quotas for future API platform

## Related Documents

- [docs/security-hardening.md](./docs/security-hardening.md)
- [docs/rate-limiting.md](./docs/rate-limiting.md)
- [docs/file-storage-and-retention.md](./docs/file-storage-and-retention.md)
- [docs/error-handling.md](./docs/error-handling.md)

