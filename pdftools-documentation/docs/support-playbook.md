# Support Playbook

## Purpose

Internal first-pass guide for handling user reports.

Website documentation route: `/docs`

## Intake Checklist

- tool and route
- job ID
- timestamp
- file type and approximate size
- screenshot or exact message
- copied failure report details from the UI when available

The failed-job support panel is designed to include safe report fields without internal paths, tracebacks, raw backend logs, secrets, or full command lines.

## First Checks

- health endpoint
- PM2 status
- recent worker logs
- repeated failure pattern across users
- whether the reported download came from Recent Jobs and may have expired after cleanup

## Escalation

- abuse/security -> `support@wellfriend.online`
- general/API/business -> `contact@wellfriend.online`
