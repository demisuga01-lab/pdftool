# Features Index

## Purpose

Cross-index the current tool set and infrastructure features.

## Audience

- Product owners
- Developers
- Support staff

## Tool Inventory

### Shared routes

- `/compress`
- `/convert`
- `/tools/ocr`

### PDF routes

- `/pdf/merge`
- `/pdf/split`
- `/pdf/rotate`
- `/pdf/watermark`
- `/pdf/protect`
- `/pdf/decrypt`
- `/pdf/extract-text`
- `/pdf/to-images`
- `/pdf/images-to-pdf`
- `/pdf/office-to-pdf`
- redirect wrappers:
  - `/pdf/compress`
  - `/pdf/convert`
  - `/pdf/ocr`
  - `/pdf/ocr-to-searchable`

### Image routes

- `/image/resize`
- `/image/batch-resize`
- `/image/rotate`
- `/image/crop`
- `/image/watermark`
- `/image/info`
- `/image/remove-background`
- redirect wrappers:
  - `/image/compress`
  - `/image/convert`
  - `/image/ocr`

## Platform Features

- upload and preview
- drag-and-drop reorder
- polling and download panel
- safe error display with support-ready failure reports
- temporary download messaging
- browser-local Recent Jobs
- mobile settings drawer
- dark mode and system theme
- configured retention cleanup
- rate limiting
- security headers

## Planned Advanced Areas

- PDF Protect adds password protection today; advanced permission enforcement is planned.
- Remove Background uses OpenCV foreground extraction and PNG alpha output; advanced refinement and replacement controls are planned.
- Batch Resize documents width and height only; format, fit, quality, and naming use backend defaults.
- Images to PDF uses backend default layout; page size, margins, orientation, and fit are planned.
- Office to PDF uses LibreOffice and server defaults; PDF/A and detailed export controls are planned.

## Related Documents

- [../FEATURES.md](../FEATURES.md)
- [frontend-routes.md](./frontend-routes.md)
- [known-limitations.md](./known-limitations.md)
