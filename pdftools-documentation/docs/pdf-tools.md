# PDF Tools

## Purpose

Document the implemented PDF-related workflows and the current frontend/backend support boundaries.

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

Current UI boundary:

- basic bookmarks and title metadata are supported
- advanced metadata, custom bookmark naming, blank pages, and page numbering are planned but are not active controls

## Split PDF

- Route: `/pdf/split`
- Endpoint: `POST /api/pdf/split`
- Worker: `split_pdf_task`
- Service: `PDFService.split_pdf`

Behavior:

- opens a page-level workspace with PDF page thumbnails, thumbnail zoom, selection, removal from output, visual preview, drag/drop reorder, and arrow-button reorder fallback
- supports explicit modes: split all active pages, extract selected pages into one PDF, split selected pages into separate PDFs, custom ranges, and reorder/delete export as one PDF
- accepts custom page ranges like `1,3-5,8`
- selected-page modes process only the selected active pages, in the current visual order
- removed pages are not deleted from the original file; they are excluded from active-page outputs
- split-all-active and split-selected modes download a ZIP of PDFs
- extract-selected and reorder-export modes download one PDF
- custom ranges use original page numbers and download one PDF for a single range or a ZIP when multiple range outputs are created
- outputs are temporary generated files; the original upload is not modified

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

Current UI boundary:

- the public tool currently adds password protection
- advanced permission controls and encryption-strength controls are not presented as enforceable settings
- do not describe printing, copying, editing, or accessibility restrictions as enforced unless backend support is added

## Decrypt PDF

- Route: `/pdf/decrypt`
- Endpoint: `POST /api/pdf/decrypt`
- Worker: `decrypt_pdf_task`
- Service: `PDFService.decrypt_pdf`

Implemented backend behavior:

- requires password
- outputs decrypted PDF

Current UI boundary:

- this tool removes password protection when the user knows the password
- extra metadata and restriction options are not configurable in the current UI

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

Implemented controls:

- `layout`
- `output_format`

Current UI boundary:

- advanced cleanup options are planned
- page ranges, language hints, header/footer cleanup, form extraction, and encoding controls are not active settings

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

Current UI boundary:

- output format is supported
- page selection and custom naming controls are planned if not currently supported by the route

## Images to PDF

- Route: `/pdf/images-to-pdf`
- Endpoint: `POST /api/pdf/images-to-pdf`
- Worker: `images_to_pdf_task`
- Service: `PDFService.images_to_pdf`
- Dependency: `img2pdf`

Current UI boundary:

- image order and output filename are supported by the workspace flow
- images are combined using the backend default layout
- page size, orientation, margins, fit, compression, and quality controls are planned but are not active settings

## Office to PDF

- Route: `/pdf/office-to-pdf`
- Endpoint: `POST /api/pdf/office-to-pdf`
- Worker: `office_to_pdf_task`
- Service: `PDFService.office_to_pdf`
- Dependency: `libreoffice`

Current UI boundary:

- current backend runs LibreOffice generic conversion using server defaults
- do not claim PDF/A, a specific PDF version, hidden-slide behavior, first-sheet-only output, comment export, bookmark export, form-field handling, or image-compression controls unless backend support is added and verified

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
