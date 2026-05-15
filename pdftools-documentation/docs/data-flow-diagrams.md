# Data Flow Diagrams

## Purpose

Provide quick architecture and workflow diagrams.

## User Request Flow

```text
User
-> Browser
-> Next.js route
-> Workspace UI
-> FastAPI API
-> Worker queue
-> Result download
```

## File Upload Flow

```text
Browser file
-> uploadWithProgress
-> /api/files/upload
-> save_upload_file
-> UPLOAD_DIR
-> metadata JSON
-> preview/thumbnail endpoints
```

## Job Processing Flow

```text
Tool page
-> tool endpoint
-> Celery apply_async
-> Redis broker
-> fast/heavy worker
-> service function
-> external CLI/library
-> OUTPUT_DIR
-> status endpoint
-> download endpoint
```

## Error Handling Flow

```text
service or worker error
-> sanitize_error_message
-> status/download endpoint
-> frontend error panel
-> support mailbox with job ID
```

## Rate Limiting Flow

```text
request
-> RateLimitMiddleware
-> client IP resolution
-> Redis counter
-> allowed or 429
-> headers returned
```

## Deployment Topology

```text
Internet
-> tools.wellfriend.online
-> Next.js frontend
-> /api path
-> FastAPI backend
-> Redis container
-> Celery workers
-> /opt/pdftool/data
```

