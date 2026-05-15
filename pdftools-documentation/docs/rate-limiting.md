# Rate Limiting

## Purpose

Document the backend rate-limiting model.

## Why It Exists

Rate limiting protects the public tool from abusive polling, repeated uploads, and resource exhaustion without letting long-running jobs look failed just because the UI checked status often.

## Current Defaults

- global: `200/hour`
- jobs: `40/hour` per tool group
- uploads: `60/hour`
- status: `1000/hour` per tool group
- downloads: `200/hour` per tool group
- previews/file info: use the same high status-style bucket

## Middleware

- file: `backend/app/core/rate_limit.py`
- mounted in `backend/app/main.py`

## Bucket Keys

- `rl:{ip}:global`
- `rl:{ip}:upload:files`
- `rl:{ip}:job:compress`
- `rl:{ip}:job:convert`
- `rl:{ip}:job:pdf`
- `rl:{ip}:job:image`
- `rl:{ip}:job:ocr`
- `rl:{ip}:status:compress`
- `rl:{ip}:status:convert`
- `rl:{ip}:status:pdf`
- `rl:{ip}:status:image`
- `rl:{ip}:status:ocr`
- `rl:{ip}:download:compress`
- `rl:{ip}:download:convert`
- `rl:{ip}:download:pdf`
- `rl:{ip}:download:image`

Status, preview, and download routes do not consume the strict global job-creation quota.

## Health Route

- `/api/health` is excluded

## Proxy Trust

- `RATE_LIMIT_TRUST_PROXY=true` only makes sense behind a trusted reverse proxy
- if backend is directly public, disable proxy trust or firewall the backend port

## Failure Behavior

- Redis unavailable -> fail open with logging
- limit exceeded -> `429` with retry headers, `retry_after_seconds`, and a safe `bucket` label such as `status:compress`

## Frontend Handling

- job creation `429`: block the new job and show `Rate limit reached. Please try again in about X minutes.`
- status polling `429`: keep the active job running, respect `Retry-After`, and show `Status checks are being slowed down. Your job is still running.`
- download `429`: keep the job marked successful and show `Download temporarily rate limited. Try again in about X minutes.`

## Related Documents

- [../SECURITY.md](../SECURITY.md)
- [backend-api.md](./backend-api.md)
