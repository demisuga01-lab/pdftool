# Error Handling

## Purpose

Document how errors are surfaced safely to users while preserving server-side troubleshooting value.

## Current Philosophy

- keep raw internal detail out of frontend responses
- preserve operational detail in server logs
- give users actionable next steps and support contact

## What Should Never Reach Users

- raw traceback
- virtualenv paths
- `/opt/pdftool` internals
- raw subprocess command strings
- secrets

## Frontend Error Surfaces

- upload errors
- download panel failure state
- safe API parsing in `frontend/lib/api.ts`

## Backend Error Surfaces

- centralized exception handlers in `backend/app/core/errors.py`
- worker task wrappers sanitize failures
- status/download endpoints sanitize final messages

## Related Documents

- [../SECURITY.md](../SECURITY.md)
- [../SUPPORT.md](../SUPPORT.md)

