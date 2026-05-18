# Feature Matrix

## Purpose

Map each major PDFTools feature to its route, frontend implementation, backend endpoint, worker task, service layer, limits, and troubleshooting references.

## Audience

- Developers
- Operators
- Product owners
- Support staff

## Scope

This is the feature inventory for the current repository state. It covers implemented public routes and platform features. Redirect routes are noted where relevant.

## Status Labels

- `Implemented`: clearly backed by current code
- `Implemented with planned advanced options`: public route works, while some advanced options are hidden, disabled, or documented as not available yet
- `Needs verification`: behavior is present but not fully validated from code alone
- `Planned`: not publicly implemented yet

## Matrix

| Category | Feature/tool | Route | Main frontend files | Backend endpoint | Worker task | Service method | External tools used | Inputs | Outputs | Customization options | Mobile support | Dark mode support | File-size limit | Rate-limit bucket | Status | Known limitations | Troubleshooting |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| General site | Home and tool catalog | `/` | `frontend/app/page.tsx` | None | None | None | None | None | Navigation only | Filter by category via links | Yes | Yes | N/A | N/A | Implemented | Counts and copy can drift from code if not maintained | [docs/frontend-routes.md](./docs/frontend-routes.md) |
| General site | Contact page | `/contact` | `frontend/app/contact/page.tsx` | None | None | None | None | None | Contact info only | Support vs contact mailbox guidance | Yes | Yes | N/A | N/A | Implemented | Manual content maintenance required | [SUPPORT.md](./SUPPORT.md) |
| Upload/preview/download | Single upload | `/pdf/*`, `/image/*`, `/convert`, `/compress`, `/tools/ocr` | `frontend/lib/files.ts`, `frontend/lib/upload.ts`, `frontend/components/ui/FileUpload.tsx` | `POST /api/files/upload` | None | `save_upload_file` | `qpdf`, `mutool`, `pyvips`, `convert` fallback | File | `file_id`, preview URLs, metadata | File type and size validation | Yes | Yes | 25 MB per file | uploads | Implemented | Preview availability depends on type | [docs/upload-preview-download-flow.md](./docs/upload-preview-download-flow.md) |
| Upload/preview/download | Multi-upload | merge, images-to-pdf, batch-resize | `useWorkspaceFiles`, grid workspaces | `POST /api/files/upload-multiple` | None | `save_upload_file` | Same as above | Multiple files | Array of upload metadata | Reorder, remove | Yes | Yes | 100 MB total batch | uploads | Implemented | Some pages upload directly through tool endpoint instead of shared multi-upload | [docs/tool-workflows.md](./docs/tool-workflows.md) |
| PDF tools | Merge PDFs | `/pdf/merge` | `frontend/app/pdf/merge/page.tsx` | `POST /api/pdf/merge` | `merge_pdfs_task` | `PDFService.merge_pdfs` | `qpdf` | 2+ PDFs or file IDs | 1 merged PDF | Reorder, bookmarks, title | Yes | Yes | 25 MB/file, 100 MB batch | jobs | Implemented | Advanced metadata and page numbering remain planned | [docs/pdf-tools.md](./docs/pdf-tools.md) |
| PDF tools | Split PDF | `/pdf/split` | `frontend/app/pdf/split/page.tsx` | `POST /api/pdf/split` | `split_pdf_task` | `PDFService.split_pdf` | `qpdf` | 1 PDF | One PDF or ZIP depending on selected output mode | Page thumbnails, select/remove/reorder, preview modal, split all, extract selected, split selected, custom ranges, reorder export | Yes | Yes | 25 MB | jobs | Implemented | Very large PDFs rely on thumbnail lazy loading and still need manual UX checks | [docs/pdf-tools.md](./docs/pdf-tools.md) |
| PDF tools | Rotate PDF | `/pdf/rotate` | `frontend/app/pdf/rotate/page.tsx` | `POST /api/pdf/rotate` | `rotate_pdf_task` | `PDFService.rotate_pdf` | `pypdf` | 1 PDF | 1 rotated PDF | Angle, all/selected/even/odd | Yes | Yes | 25 MB | jobs | Implemented | Backend accepts one angle per run; mixed per-page angles are preview-only and blocked in UI | [docs/pdf-tools.md](./docs/pdf-tools.md) |
| PDF tools | Watermark PDF | `/pdf/watermark` | `frontend/app/pdf/watermark/page.tsx`, `WatermarkEditor.tsx` | `POST /api/pdf/watermark` | `watermark_pdf_task` | `PDFService.watermark_pdf` | `reportlab`, `pypdf`, `inkscape`, `convert` fallback | 1 PDF plus optional watermark image | 1 watermarked PDF | Text/image watermark, page targeting, opacity, rotation, relative position, image width, tiling | Yes | Yes | 25 MB | jobs | Implemented | Some mobile interactions require manual device QA; SVG safety rules may reject complex files | [docs/watermarking.md](./docs/watermarking.md) |
| PDF tools | Protect PDF | `/pdf/protect` | `frontend/app/pdf/protect/page.tsx` | `POST /api/pdf/encrypt` | `encrypt_pdf_task` | `PDFService.encrypt_pdf` | `qpdf` | 1 PDF + password | Encrypted PDF | User password, optional owner password | Yes | Yes | 25 MB | jobs | Implemented with planned advanced options | Advanced permission enforcement and encryption-strength controls are not available yet | [docs/pdf-tools.md](./docs/pdf-tools.md) |
| PDF tools | Decrypt PDF | `/pdf/decrypt` | `frontend/app/pdf/decrypt/page.tsx` | `POST /api/pdf/decrypt` | `decrypt_pdf_task` | `PDFService.decrypt_pdf` | `qpdf` | 1 encrypted PDF + password | Decrypted PDF | Password field | Yes | Yes | 25 MB | jobs | Implemented with planned advanced options | Extra metadata/restriction options are not currently configurable | [docs/pdf-tools.md](./docs/pdf-tools.md) |
| PDF tools | Extract text | `/pdf/extract-text` | `frontend/app/pdf/extract-text/page.tsx` | `POST /api/pdf/extract-text` | `extract_text_task` | `PDFService.extract_text` | `pdftotext` | 1 PDF | TXT, HTML, or JSON | Layout mode, output format | Yes | Yes | 25 MB | jobs | Implemented with planned advanced options | Advanced cleanup, language hints, and page ranges are planned | [docs/pdf-tools.md](./docs/pdf-tools.md) |
| PDF tools | PDF to images | `/pdf/to-images` | `frontend/app/pdf/to-images/page.tsx` | `POST /api/pdf/to-images` | `pdf_to_images_task` | `PDFService.pdf_to_images` | `mutool`, `pyvips` | 1 PDF | ZIP of images | DPI, format, JPEG quality, transparency | Yes | Yes | 25 MB | jobs/downloads | Implemented | WebP output is a two-step render and convert flow | [docs/conversion.md](./docs/conversion.md) |
| PDF tools | Images to PDF | `/pdf/images-to-pdf` | `frontend/app/pdf/images-to-pdf/page.tsx` | `POST /api/pdf/images-to-pdf` | `images_to_pdf_task` | `PDFService.images_to_pdf` | `img2pdf` | 1+ images | 1 PDF | Reorder, output filename, backend default layout | Yes | Yes | 100 MB batch | jobs | Implemented with planned advanced options | Page size, orientation, margins, fit, compression, and quality controls are planned | [docs/pdf-tools.md](./docs/pdf-tools.md) |
| PDF tools | Office to PDF | `/pdf/office-to-pdf` | `frontend/app/pdf/office-to-pdf/page.tsx` | `POST /api/pdf/office-to-pdf` | `office_to_pdf_task` | `PDFService.office_to_pdf` | `libreoffice` | Office/text document | 1 PDF | LibreOffice server defaults | Yes | Yes | 25 MB | jobs | Implemented with planned advanced options | PDF/A, PDF version, and detailed export controls are not currently configurable | [docs/conversion.md](./docs/conversion.md) |
| OCR | Shared OCR workspace | `/tools/ocr` | `frontend/app/tools/ocr/page.tsx` | `POST /api/ocr` | `ocr_image_task` | `OCRService.ocr` | `mutool`, `tesseract`, `qpdf` | PDF or image | TXT, JSON, searchable PDF, DOCX, HOCR | Language, DPI, password, output format | Yes | Yes | 25 MB | jobs/status | Implemented | Language list is currently limited to English in UI | [docs/ocr.md](./docs/ocr.md) |
| Image tools | Resize image | `/image/resize` | `frontend/app/image/resize/page.tsx` | `POST /api/image/resize` | `resize_image_task` | `ImageService.resize_image` | `pyvips` | 1 image | Resized image | Pixels, percentage, presets, fit, kernel, output format, quality | Yes | Yes | 25 MB | jobs | Implemented | UI has more modes than backend naming directly suggests, but form mapping is explicit | [docs/image-tools.md](./docs/image-tools.md) |
| Image tools | Batch resize | `/image/batch-resize` | `frontend/app/image/batch-resize/page.tsx` | `POST /api/image/batch-resize` | `batch_resize_task` | `ImageService.batch_resize` | `pyvips`, ZIP extraction | Many images or ZIP | ZIP of resized images | Width and height | Yes | Yes | 100 MB batch, 100 MB extracted archive | jobs | Implemented with planned advanced options | Format, fit, quality, and naming use backend defaults | [docs/image-tools.md](./docs/image-tools.md) |
| Image tools | Rotate image | `/image/rotate` | `frontend/app/image/rotate/page.tsx` | `POST /api/image/rotate` | `rotate_image_task` | `ImageService.rotate_image` | `pyvips`, `convert` fallback | 1 image | Rotated image | Angle, flip, background, expand canvas, auto-crop | Yes | Yes | 25 MB | jobs | Implemented | Non-right-angle rotation uses ImageMagick path | [docs/image-tools.md](./docs/image-tools.md) |
| Image tools | Crop image | `/image/crop` | `frontend/app/image/crop/page.tsx` | `POST /api/image/crop` | `crop_image_task` | `ImageService.crop_image` | `pyvips` | 1 image | Cropped image | Drag box, handles, numeric coordinates | Yes | Yes | 25 MB | jobs | Implemented | Crop page uses global touch listeners; manual mobile QA still advisable | [docs/image-tools.md](./docs/image-tools.md) |
| Image tools | Watermark image | `/image/watermark` | `frontend/app/image/watermark/page.tsx`, `WatermarkEditor.tsx` | `POST /api/image/watermark` | `watermark_image_task` | `ImageService.watermark_image` | `Pillow`, `inkscape`, `convert` fallback | 1 image plus optional watermark asset | Watermarked image | Text/image, relative position, width, opacity, rotation, tiling | Yes | Yes | 25 MB | jobs | Implemented | SVG watermark handling depends on safety checks and rasterizer availability | [docs/watermarking.md](./docs/watermarking.md) |
| Image tools | Image info | `/image/info` | `frontend/app/image/info/page.tsx` | `POST /api/image/info` | none | `ImageService.get_image_info` | `pyvips` | 1 image | JSON-like metadata in UI | None | Yes | Yes | 25 MB | jobs | Implemented | Route is synchronous rather than Celery-backed | [docs/image-tools.md](./docs/image-tools.md) |
| Image tools | Remove background | `/image/remove-background` | `frontend/app/image/remove-background/page.tsx` | `POST /api/image/remove-background` | `remove_background_task` | `ImageService.remove_background` | `opencv`, `numpy` | 1 image | PNG with alpha | Simple upload/process flow | Yes | Yes | 25 MB | jobs | Implemented with planned advanced options | Uses OpenCV foreground extraction; advanced refinement and background replacement are planned | [docs/image-tools.md](./docs/image-tools.md) |
| Conversion | Universal convert | `/convert` | `frontend/app/convert/page.tsx` | `POST /api/convert` | `convert_file_task` | `ConversionService.convert` | `mutool`, `libreoffice`, `tesseract`, `img2pdf`, `inkscape`, `pyvips` | PDF, Office, spreadsheet, text, CSV, image, SVG | Direct single-file output or ZIP for multi-output jobs | Output format, DPI, quality, metadata, transparency | Yes | Yes | 25 MB | jobs | Implemented | Supported combinations are explicit, not universal | [docs/conversion.md](./docs/conversion.md) |
| Compression | Universal compress | `/compress` | `frontend/app/compress/page.tsx` | `POST /api/compress` | `compress_file_task` | `CompressionService.compress_file` | `gs`, `qpdf`, `ocrmypdf`, `pngquant`, `oxipng`, `jpegoptim`, `cwebp`, `avifenc`, `7z`, `brotli`, others | PDF, image, office, text, ZIP | Compressed file or packaged archive | Mode, target size, processing engine, packaging, PDF/image/text/archive tuning | Yes | Yes | 25 MB file, 100 MB archives/batch | jobs | Implemented | Auto engine is recommended; manual engines depend on compatibility and installed server tools | [docs/compression.md](./docs/compression.md) |
| Workspace/editor | Shared visual editor | watermark, resize, rotate, crop | `WorkspaceShells.tsx`, `WorkspaceEditorCanvas.tsx`, `WatermarkEditor.tsx` | Tool-specific | Tool-specific | Tool-specific | Browser only plus backend tool flow | File and settings | Preview + processed output | Zoom, pan, drawer, drag, touch controls | Yes | Yes | Depends on tool | N/A | Implemented | Device-level QA still needed for some gestures | [docs/workspace-system.md](./docs/workspace-system.md) |
| Mobile UI | Mobile drawer and sticky actions | workspace routes | `WorkspaceMobileDrawer.tsx`, `WorkspaceShells.tsx` | None | None | None | Browser only | Touch input | Drawer/settings interaction | Scrollable drawer, close button, safe area | Yes | Yes | N/A | N/A | Implemented | Needs manual verification on real devices | [docs/mobile-ui.md](./docs/mobile-ui.md) |
| Security/error handling | Safe API errors | all API routes | frontend error panels and API helpers | all API routes | all worker tasks | `sanitize_error_message`, exception handlers | None | Request/job failures | Sanitized error strings | Support-ready failure report with copy and email actions | Yes | Yes | N/A | all buckets | Implemented | Logs still need server access for root cause | [docs/error-handling.md](./docs/error-handling.md) |
| Cleanup/retention | Temporary downloads and cleanup | operational | `DownloadPanel.tsx`, backend script docs | none | none | `cleanup_files.py` | Python only | Stored files | Deleted expired files | Retention hours env var | N/A | N/A | N/A | N/A | Implemented | Requires scheduler installation outside app | [docs/file-storage-and-retention.md](./docs/file-storage-and-retention.md) |
| Recent Jobs | Browser-local job history | workspace routes | `RecentJobsPanel.tsx`, `frontend/lib/recent-jobs.ts` | None | None | None | Browser localStorage | Job metadata only | Local status panel | Clear all, remove one, copy job ID, open tool, download if still available | Yes | Yes | N/A | N/A | Implemented | Local to one browser; download links may expire after cleanup | [docs/tool-workflows.md](./docs/tool-workflows.md) |
| Contact/support | Footer and support copy | static pages + failure panels | `Footer.tsx`, `DownloadPanel.tsx`, `contact/page.tsx` | None | None | None | Mail client | User issue reports | Email flow plus Discord community entry points | Separate support vs contact mailbox, Discord community link | Yes | Yes | N/A | N/A | Implemented | Manual content drift is possible | [docs/mail-and-contact.md](./docs/mail-and-contact.md) |

## Feature Notes

### What this matrix shows

- The app mixes fully implemented routes with a few wrappers and partial UI-to-backend mappings.
- Some advanced controls are planned and now hidden, disabled, or documented as unavailable instead of being left as active no-op settings.
- Shared routes like `/compress`, `/convert`, and `/tools/ocr` are the real implementation for some route families. Several `/pdf/*` or `/image/*` pages redirect into those shared workspaces.

### Common failure modes across features

- Upload rejected because file exceeds `25 MB`
- Batch rejected because total exceeds `100 MB`
- Archive rejected because extracted size or file count exceeds policy
- Required external tool missing on host
- Queue delay or worker timeout
- Output path expired before download
- SVG watermark rejected due to unsafe content
- Manual compression engine unavailable or incompatible with the uploaded file

### Smoke-test baseline

- Upload valid file under limit
- Confirm preview renders or fallback message appears
- Change one setting
- Run processing
- Poll until success or safe failure
- Download result
- Confirm failure surfaces job ID and support email where applicable
- Confirm success panels mention temporary downloads
- Confirm Recent Jobs records metadata only and marks expired downloads clearly
