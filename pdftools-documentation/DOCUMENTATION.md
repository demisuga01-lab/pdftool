# Documentation Hub

## Purpose

Central map for the documentation system under `pdftools-documentation/`.

## Audience

- Developers
- Operators
- Support staff
- Product owners
- Security reviewers
- Future AI or Codex sessions

## Scope

This file explains what exists in the documentation set, who should read what first, and when the docs must be updated.

Website documentation route: `/docs`

## Documentation Map

### Root guides

| File | Summary |
| --- | --- |
| [README.md](./README.md) | Fast orientation guide |
| [FEATURES.md](./FEATURES.md) | Product-wide feature matrix |
| [API_REFERENCE.md](./API_REFERENCE.md) | Route-by-route backend API reference |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture, boundaries, and data flow |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | VPS deployment, restart, checks, and rollback |
| [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md) | Release and deploy checklist |
| [SECURITY.md](./SECURITY.md) | Security model, abuse controls, and hardening |
| [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) | Symptom-to-fix troubleshooting matrix |
| [OPERATIONS.md](./OPERATIONS.md) | Daily and weekly operating procedures |
| [ENVIRONMENT.md](./ENVIRONMENT.md) | Environment variable reference |
| [SUPPORT.md](./SUPPORT.md) | Support intake and triage expectations |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Local setup and change process |
| [ROADMAP.md](./ROADMAP.md) | Planned future items only |
| [CHANGELOG.md](./CHANGELOG.md) | Documentation change log |
| [PRODUCTION_ENV.md](./PRODUCTION_ENV.md) | Safe production env template |
| [PRE_COMMIT_FINAL_CHECK.md](./PRE_COMMIT_FINAL_CHECK.md) | Local pre-commit and post-push deploy commands |

### Topic pages

| File | Summary |
| --- | --- |
| [docs/README.md](./docs/README.md) | Topic index |
| [docs/product-overview.md](./docs/product-overview.md) | What the product is and who it serves |
| [docs/features-index.md](./docs/features-index.md) | Cross-index of tools and platform features |
| [docs/frontend-routes.md](./docs/frontend-routes.md) | Frontend route inventory and behavior |
| [docs/workspace-system.md](./docs/workspace-system.md) | Shared workspace architecture |
| [docs/tool-workflows.md](./docs/tool-workflows.md) | Generic upload-to-download lifecycle |
| [docs/pdf-tools.md](./docs/pdf-tools.md) | PDF tool behavior and implementation notes |
| [docs/image-tools.md](./docs/image-tools.md) | Image tool behavior and implementation notes |
| [docs/compression.md](./docs/compression.md) | Compression flow, settings, and CLI behavior |
| [docs/conversion.md](./docs/conversion.md) | Conversion flow, format support, and normalization |
| [docs/ocr.md](./docs/ocr.md) | OCR workflow and dependencies |
| [docs/watermarking.md](./docs/watermarking.md) | Visual watermark system and SVG handling |
| [docs/upload-preview-download-flow.md](./docs/upload-preview-download-flow.md) | File lifecycle details |
| [docs/backend-api.md](./docs/backend-api.md) | Detailed backend route notes |
| [docs/celery-workers.md](./docs/celery-workers.md) | Worker behavior and queue operations |
| [docs/file-storage-and-retention.md](./docs/file-storage-and-retention.md) | Storage layout and cleanup |
| [docs/rate-limiting.md](./docs/rate-limiting.md) | Rate limiting model and headers |
| [docs/security-hardening.md](./docs/security-hardening.md) | Concrete hardening measures |
| [docs/deployment-vps.md](./docs/deployment-vps.md) | VPS deployment detail |
| [docs/local-development-windows.md](./docs/local-development-windows.md) | Windows development setup |
| [docs/environment-variables.md](./docs/environment-variables.md) | Expanded env var table |
| [docs/external-tools.md](./docs/external-tools.md) | CLI dependency matrix |
| [docs/theme-and-branding.md](./docs/theme-and-branding.md) | Theme, logo, and brand assets |
| [docs/mobile-ui.md](./docs/mobile-ui.md) | Mobile interaction model |
| [docs/error-handling.md](./docs/error-handling.md) | Safe error behavior and support flow |
| [docs/mail-and-contact.md](./docs/mail-and-contact.md) | Mail, DNS, and support mailbox usage |
| [docs/testing-and-smoke-tests.md](./docs/testing-and-smoke-tests.md) | Validation checklist |
| [docs/troubleshooting-index.md](./docs/troubleshooting-index.md) | Troubleshooting quick index |
| [docs/known-limitations.md](./docs/known-limitations.md) | Current gaps and caveats |
| [docs/future-api-platform.md](./docs/future-api-platform.md) | Future `api.wellfriend.online` plan |
| [docs/frontend-components.md](./docs/frontend-components.md) | Major frontend component map |
| [docs/backend-services.md](./docs/backend-services.md) | Backend services breakdown |
| [docs/workers-and-queues.md](./docs/workers-and-queues.md) | Queue routing summary |
| [docs/data-flow-diagrams.md](./docs/data-flow-diagrams.md) | ASCII flow diagrams |
| [docs/support-playbook.md](./docs/support-playbook.md) | Internal support handling guide |
| [docs/release-process.md](./docs/release-process.md) | Release workflow |
| [docs/smoke-test-results-template.md](./docs/smoke-test-results-template.md) | Reusable validation template |

## Suggested Reading Order

### New developer

1. [README.md](./README.md)
2. [ARCHITECTURE.md](./ARCHITECTURE.md)
3. [docs/frontend-routes.md](./docs/frontend-routes.md)
4. [docs/workspace-system.md](./docs/workspace-system.md)
5. [docs/backend-api.md](./docs/backend-api.md)
6. [docs/backend-services.md](./docs/backend-services.md)
7. [docs/celery-workers.md](./docs/celery-workers.md)
8. [CONTRIBUTING.md](./CONTRIBUTING.md)

### Operator

1. [README.md](./README.md)
2. [DEPLOYMENT.md](./DEPLOYMENT.md)
3. [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md)
4. [OPERATIONS.md](./OPERATIONS.md)
5. [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
6. [docs/deployment-vps.md](./docs/deployment-vps.md)
7. [docs/celery-workers.md](./docs/celery-workers.md)

### Support person

1. [SUPPORT.md](./SUPPORT.md)
2. [docs/support-playbook.md](./docs/support-playbook.md)
3. [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
4. [docs/error-handling.md](./docs/error-handling.md)
5. [docs/known-limitations.md](./docs/known-limitations.md)

### Product owner

1. [README.md](./README.md)
2. [FEATURES.md](./FEATURES.md)
3. [docs/product-overview.md](./docs/product-overview.md)
4. [docs/features-index.md](./docs/features-index.md)
5. [ROADMAP.md](./ROADMAP.md)

### Security reviewer

1. [SECURITY.md](./SECURITY.md)
2. [docs/security-hardening.md](./docs/security-hardening.md)
3. [docs/rate-limiting.md](./docs/rate-limiting.md)
4. [docs/file-storage-and-retention.md](./docs/file-storage-and-retention.md)
5. [docs/error-handling.md](./docs/error-handling.md)

### Future Codex or AI session

1. [README.md](./README.md)
2. [ARCHITECTURE.md](./ARCHITECTURE.md)
3. [FEATURES.md](./FEATURES.md)
4. [API_REFERENCE.md](./API_REFERENCE.md)
5. [docs/workspace-system.md](./docs/workspace-system.md)
6. [docs/backend-services.md](./docs/backend-services.md)
7. [docs/known-limitations.md](./docs/known-limitations.md)
8. [ROADMAP.md](./ROADMAP.md)

## Maintenance Rules

- Treat repository code as the source of truth.
- Mark items as `Implemented`, `Partially implemented`, `Needs verification`, or `Planned`.
- Do not document a route, option, or workflow as implemented if the code does not support it.
- Keep links relative to `pdftools-documentation/`.
- Do not place new long-form docs in the repository root unless the project explicitly changes this rule.

## When to Update Docs

Update the documentation whenever any of the following changes:

- A new public tool or route is added
- A backend endpoint changes request or response shape
- A Celery task, queue, or timeout changes
- A new external CLI dependency is introduced
- File-size, archive, retention, or rate-limit policy changes
- Deployment commands or PM2 process names change
- Support emails, abuse workflow, or public copy changes
- Theme, branding, or mobile interaction behavior changes

## Required Documentation for New Work

### When adding a new tool

- Update [FEATURES.md](./FEATURES.md)
- Update [docs/features-index.md](./docs/features-index.md)
- Add or update the relevant route entry in [docs/frontend-routes.md](./docs/frontend-routes.md)
- Document inputs, outputs, options, errors, smoke test, and limitations in the relevant tool page
- Document worker and service mapping if asynchronous

### When adding an endpoint

- Update [API_REFERENCE.md](./API_REFERENCE.md)
- Update [docs/backend-api.md](./docs/backend-api.md)
- Document validation, rate-limit bucket, and failure behavior

### When changing environment variables

- Update [ENVIRONMENT.md](./ENVIRONMENT.md)
- Update [docs/environment-variables.md](./docs/environment-variables.md)
- Update [PRODUCTION_ENV.md](./PRODUCTION_ENV.md) if production values change

### When changing deployment

- Update [DEPLOYMENT.md](./DEPLOYMENT.md)
- Update [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md)
- Update [docs/deployment-vps.md](./docs/deployment-vps.md)

### When changing rate limits or file limits

- Update [SECURITY.md](./SECURITY.md)
- Update [docs/rate-limiting.md](./docs/rate-limiting.md)
- Update [docs/file-storage-and-retention.md](./docs/file-storage-and-retention.md)
- Update [README.md](./README.md) production limits summary

## Documentation Freshness Checklist

- Compare docs against route files in `frontend/app`
- Compare docs against backend routes in `backend/app/api/routes`
- Compare docs against services and worker tasks
- Re-run deploy commands listed in the docs after operational changes
- Re-check support emails and domain names
- Re-check limits and retention windows
- Re-check PM2 names and Redis commands
