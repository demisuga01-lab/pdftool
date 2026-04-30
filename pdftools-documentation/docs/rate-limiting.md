# Rate Limiting

## Purpose

Document the backend rate-limiting model.

## Why It Exists

Rate limiting protects the public tool from abusive polling, repeated uploads, and resource exhaustion.

## Current Defaults

- global: `100/hour`
- jobs: `20/hour`
- uploads: `30/hour`
- status: `300/hour`
- downloads: `100/hour`

## Middleware

- file: `backend/app/core/rate_limit.py`
- mounted in `backend/app/main.py`

## Health Route

- `/api/health` is excluded

## Proxy Trust

- `RATE_LIMIT_TRUST_PROXY=true` only makes sense behind a trusted reverse proxy
- if backend is directly public, disable proxy trust or firewall the backend port

## Failure Behavior

- Redis unavailable -> fail open with logging
- limit exceeded -> `429` with retry headers and `retry_after_seconds`

## Related Documents

- [../SECURITY.md](../SECURITY.md)
- [backend-api.md](./backend-api.md)

