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
- safe error display
- mobile settings drawer
- dark mode and system theme
- 24-hour cleanup
- rate limiting
- security headers

## Partially Implemented Areas

- Some advanced frontend settings for protect, decrypt, extract-text, batch-resize, Office-to-PDF, images-to-PDF, and remove-background are ahead of backend support.

## Related Documents

- [../FEATURES.md](../FEATURES.md)
- [frontend-routes.md](./frontend-routes.md)
- [known-limitations.md](./known-limitations.md)

