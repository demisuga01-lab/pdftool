# OCR

## Purpose

Document OCR behavior across the shared OCR page and backend services.

## Audience

- Developers
- QA
- Support staff

## Overview

OCR exists to extract text from scanned PDFs and images, and to produce searchable PDF output where supported.

## Inputs

- PDF
- image files

## Outputs

- TXT
- JSON
- searchable PDF
- DOCX
- HOCR

## Dependencies

- `mutool` for PDF rasterization
- `tesseract` for OCR
- `qpdf` for merging OCR page PDFs

## Current UI Support

- shared page at `/tools/ocr`
- route wrappers for `/pdf/ocr`, `/pdf/ocr-to-searchable`, and `/image/ocr`
- current UI language choices are limited compared with what backend could theoretically support

## Password-Protected PDFs

The OCR service checks for encrypted PDFs and returns a password-specific safe error if a password is required.

## Queues and Timeouts

- OCR routes use `heavy`
- PDF OCR is one of the longest-running task classes in current code

## Common Errors

- missing `tesseract`
- missing `mutool`
- password-protected PDF without password
- render failure before OCR
- timeout on large OCR jobs

## Related Documents

- [workers-and-queues.md](./workers-and-queues.md)
- [external-tools.md](./external-tools.md)
- [error-handling.md](./error-handling.md)

