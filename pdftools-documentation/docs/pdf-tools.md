# PDF Tools

## Purpose

Document the implemented PDF-related workflows and note where the frontend currently exposes options that the backend does not fully consume.

## Audience

- Developers
- QA
- Support staff

## Implemented PDF Tool Set

- Merge PDFs
- Split PDF
- Rotate PDF
- Watermark PDF
- Protect PDF
- Decrypt PDF
- Extract text
- PDF to images
- Images to PDF
- Office to PDF
- Shared OCR routes for PDF

## Merge PDFs

- Route: `/pdf/merge`
- Endpoint: `POST /api/pdf/merge`
- Worker: `merge_pdfs_task`
- Service: `PDFService.merge_pdfs`
- Dependencies: `qpdf`

Behavior:

- requires at least two PDFs
- preserves UI order when submitting `file_ids`
- optional `add_bookmarks`
- optional `metadata_title`

Known gap:

- several frontend metadata/bookmark options are UI-only today

## Split PDF

- Route: `/pdf/split`
- Endpoint: `POST /api/pdf/split`
- Worker: `split_pdf_task`
- Service: `PDFService.split_pdf`

Behavior:

- accepts page ranges like `1,3-5`
- can produce range-based or page-based outputs
- multi-output download is packaged as ZIP if needed

## Rotate PDF

- Route: `/pdf/rotate`
- Endpoint: `POST /api/pdf/rotate`
- Worker: `rotate_pdf_task`
- Service: `PDFService.rotate_pdf`

Behavior:

- supported angles: `0`, `90`, `180`, `270`
- frontend supports all, selected, even, odd page sets
- backend applies one angle to the chosen page set

Important limitation:

- mixed per-page angle previews are not a backend feature

## Watermark PDF

- Route: `/pdf/watermark`
- Endpoint: `POST /api/pdf/watermark`
- Worker: `watermark_pdf_task`
- Service: `PDFService.watermark_pdf`
- Dependencies: `pypdf`, `reportlab`, `inkscape`, `convert` fallback

Supported watermark modes:

- text watermark
- uploaded image/logo watermark

Supported controls:

- text content
- font family
- bold and italic
- font size
- font color
- opacity
- rotation
- position preset
- `x_percent`
- `y_percent`
- `width_percent`
- page targeting via `all`, `current`, `selected`, `range`
- tiled mode

SVG note:

- ReportLab cannot read SVG directly
- SVG watermark is rasterized to PNG first if safe
- unsafe SVG is rejected

## Protect PDF

- Route: `/pdf/protect`
- Endpoint: `POST /api/pdf/encrypt`
- Worker: `encrypt_pdf_task`
- Service: `PDFService.encrypt_pdf`
- Dependency: `qpdf`

Implemented backend behavior:

- encrypts with user password
- optional owner password

Known limitation:

- frontend permission and encryption controls are richer than current backend enforcement

## Decrypt PDF

- Route: `/pdf/decrypt`
- Endpoint: `POST /api/pdf/decrypt`
- Worker: `decrypt_pdf_task`
- Service: `PDFService.decrypt_pdf`

Implemented backend behavior:

- requires password
- outputs decrypted PDF

Known limitation:

- extra frontend flags are currently not consumed by the backend route

## Extract Text

- Route: `/pdf/extract-text`
- Endpoint: `POST /api/pdf/extract-text`
- Worker: `extract_text_task`
- Service: `PDFService.extract_text`
- Dependency: `pdftotext`

Implemented outputs:

- TXT
- HTML
- JSON

Known limitation:

- frontend exposes more extraction options than the backend currently uses

## PDF to Images

- Route: `/pdf/to-images`
- Endpoint: `POST /api/pdf/to-images`
- Worker: `pdf_to_images_task`
- Service: `PDFService.pdf_to_images`
- Dependencies: `mutool`, `pyvips`

Formats:

- PNG
- JPG/JPEG
- WebP

Download behavior:

- multiple page images are delivered as ZIP

## Images to PDF

- Route: `/pdf/images-to-pdf`
- Endpoint: `POST /api/pdf/images-to-pdf`
- Worker: `images_to_pdf_task`
- Service: `PDFService.images_to_pdf`
- Dependency: `img2pdf`

Known limitation:

- frontend exposes page-size and margin settings that current backend route does not apply

## Office to PDF

- Route: `/pdf/office-to-pdf`
- Endpoint: `POST /api/pdf/office-to-pdf`
- Worker: `office_to_pdf_task`
- Service: `PDFService.office_to_pdf`
- Dependency: `libreoffice`

Known limitation:

- current backend runs generic conversion and does not consume most export toggles sent by the page

## PDF OCR

- Shared route: `/tools/ocr?input=pdf`
- Redirect wrappers: `/pdf/ocr`, `/pdf/ocr-to-searchable`
- Endpoint: `POST /api/ocr` or `POST /api/pdf/ocr`
- Worker path in practice: `ocr_image_task` through shared OCR page; `ocr_pdf_task` also exists in backend

## Smoke Tests

- merge two PDFs
- split one PDF by range
- rotate odd pages 90 degrees
- watermark PDF with text and PNG logo
- decrypt a known encrypted PDF
- extract text from a simple PDF
- render PDF to JPG ZIP
- convert DOCX to PDF

## Related Documents

- [conversion.md](./conversion.md)
- [ocr.md](./ocr.md)
- [watermarking.md](./watermarking.md)
- [known-limitations.md](./known-limitations.md)

