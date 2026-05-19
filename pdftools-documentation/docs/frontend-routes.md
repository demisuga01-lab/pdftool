# Frontend Routes

## Purpose

Inventory the current Next.js routes and explain what each page does.

## Audience

- Frontend developers
- QA
- Support staff

## Route Groups

### Home and static pages

| URL | Purpose | File | Notes |
| --- | --- | --- | --- |
| `/` | Home page and tool catalog | `frontend/app/page.tsx` | Shows grouped tools and public limits copy |
| `/about` | Product overview | `frontend/app/about/page.tsx` | Static content |
| `/contact` | Contact and support mailbox guidance | `frontend/app/contact/page.tsx` | Uses both support and contact mailboxes |
| `/privacy` | Privacy policy | `frontend/app/privacy/page.tsx` | Static content with retention and data notes |
| `/terms` | Terms of service | `frontend/app/terms/page.tsx` | Abuse and scope guidance |
| `/pricing` | Current free-web / future API pricing page | `frontend/app/pricing/page.tsx` | API plans are future-facing |
| `/settings` | Global UI preferences | `frontend/app/settings/page.tsx` | LocalStorage-based theme and defaults |

### Shared tools

| URL | Purpose | File | Layout |
| --- | --- | --- | --- |
| `/compress` | Universal compression workspace | `frontend/app/compress/page.tsx` | Compact workspace |
| `/convert` | Universal conversion workspace | `frontend/app/convert/page.tsx` | Compact workspace |
| `/tools/ocr` | Shared OCR workspace | `frontend/app/tools/ocr/page.tsx` | Compact workspace |

### Navigation categories

Desktop navigation is:

```text
Home | PDF Tools | Image Tools | OCR Tools | Privacy Tools | File Tools | Tools | Pricing | About | Docs | Contact
```

Mobile navigation uses six collapsible tool sections: PDF Tools, Image Tools, OCR Tools, Privacy Tools, File Tools, and Tools.

### PDF routes

| URL | Purpose | File | Notes |
| --- | --- | --- | --- |
| `/pdf/merge` | Merge and reorder multiple PDFs | `frontend/app/pdf/merge/page.tsx` | Grid workspace |
| `/pdf/split` | Split one PDF | `frontend/app/pdf/split/page.tsx` | Single PDF workspace |
| `/pdf/rotate` | Rotate pages with live grid preview | `frontend/app/pdf/rotate/page.tsx` | Grid workspace |
| `/pdf/watermark` | Visual PDF watermark editor | `frontend/app/pdf/watermark/page.tsx` | Visual editor |
| `/pdf/protect` | Encrypt PDF | `frontend/app/pdf/protect/page.tsx` | Single PDF workspace |
| `/pdf/decrypt` | Decrypt PDF | `frontend/app/pdf/decrypt/page.tsx` | Single PDF workspace |
| `/pdf/extract-text` | Extract text/HTML/JSON | `frontend/app/pdf/extract-text/page.tsx` | Single PDF workspace |
| `/pdf/to-images` | Render PDF pages as image archive | `frontend/app/pdf/to-images/page.tsx` | Single PDF workspace |
| `/pdf/images-to-pdf` | Build a PDF from images | `frontend/app/pdf/images-to-pdf/page.tsx` | Grid workspace |
| `/pdf/office-to-pdf` | Convert Office/text docs to PDF | `frontend/app/pdf/office-to-pdf/page.tsx` | Document-focused workspace |
| `/pdf/compress` | Redirect to `/compress?type=pdf` | `frontend/app/pdf/compress/page.tsx` | Redirect only |
| `/pdf/convert` | Redirect to `/convert?from=pdf` | `frontend/app/pdf/convert/page.tsx` | Redirect only |
| `/pdf/ocr` | Redirect to `/tools/ocr?input=pdf` | `frontend/app/pdf/ocr/page.tsx` | Redirect only |
| `/pdf/ocr-to-searchable` | Redirect to shared OCR searchable output | `frontend/app/pdf/ocr-to-searchable/page.tsx` | Redirect only |

### Image routes

| URL | Purpose | File | Notes |
| --- | --- | --- | --- |
| `/image/resize` | Resize image | `frontend/app/image/resize/page.tsx` | Visual editor style |
| `/image/batch-resize` | Batch resize image set | `frontend/app/image/batch-resize/page.tsx` | Grid workspace |
| `/image/rotate` | Rotate/flip image | `frontend/app/image/rotate/page.tsx` | Visual preview |
| `/image/crop` | Crop with drag handles | `frontend/app/image/crop/page.tsx` | Custom editor |
| `/image/watermark` | Visual image watermark editor | `frontend/app/image/watermark/page.tsx` | Visual editor |
| `/image/info` | Inspect image metadata | `frontend/app/image/info/page.tsx` | Compact workspace |
| `/image/remove-background` | Remove background | `frontend/app/image/remove-background/page.tsx` | Visual preview |
| `/image/compress` | Redirect to `/compress?type=image` | `frontend/app/image/compress/page.tsx` | Redirect only |
| `/image/convert` | Redirect to `/convert?from=image` | `frontend/app/image/convert/page.tsx` | Redirect only |
| `/image/ocr` | Redirect to `/tools/ocr?input=image` | `frontend/app/image/ocr/page.tsx` | Redirect only |

### File routes

| URL | Purpose | File | Notes |
| --- | --- | --- | --- |
| `/file/hash` | Generate hashes for one file | `frontend/app/file/hash/page.tsx` | Inline result |
| `/file/checksum-verify` | Verify expected checksum | `frontend/app/file/checksum-verify/page.tsx` | Inline result |
| `/file/hash-batch` | Generate hash report for multiple files | `frontend/app/file/hash-batch/page.tsx` | Download result |
| `/file/duplicate-find` | Find duplicates | `frontend/app/file/duplicate-find/page.tsx` | Inline JSON plus download |
| `/file/file-type` | Detect file type by content | `frontend/app/file/file-type/page.tsx` | Inline result |
| `/file/extension-check` | Check extension mismatch | `frontend/app/file/extension-check/page.tsx` | Download result |
| `/file/metadata-view` | View file metadata | `frontend/app/file/metadata-view/page.tsx` | Inline result |
| `/file/file-compare` | Compare two files | `frontend/app/file/file-compare/page.tsx` | Inline result |
| `/file/filename-check` | Check a filename or uploaded filename | `frontend/app/file/filename-check/page.tsx` | Inline result |
| `/file/archive-safety` | Check archive structure risks | `frontend/app/file/archive-safety/page.tsx` | Inline result |
| `/file/archive-create` | Create ZIP/7Z/TAR archive | `frontend/app/file/archive-create/page.tsx` | Download result |
| `/file/archive-extract` | Extract archive contents | `frontend/app/file/archive-extract/page.tsx` | Download result |
| `/file/archive-inspect` | Inspect archive listing | `frontend/app/file/archive-inspect/page.tsx` | Inline result |
| `/file/batch-rename` | Rename multiple files | `frontend/app/file/batch-rename/page.tsx` | Download result |
| `/file/filename-sanitize` | Sanitize filenames | `frontend/app/file/filename-sanitize/page.tsx` | Download result |
| `/file/inventory-report` | Create inventory report | `frontend/app/file/inventory-report/page.tsx` | Download result |
| `/file/file-split` | Split a file into parts | `frontend/app/file/file-split/page.tsx` | Download result |
| `/file/file-join` | Join file parts | `frontend/app/file/file-join/page.tsx` | Download result |
| `/file/metadata-clean` | Clean general metadata | `frontend/app/file/metadata-clean/page.tsx` | Download result |
| `/file/office-metadata-clean` | Clean Office metadata | `frontend/app/file/office-metadata-clean/page.tsx` | Download result |
| `/file/office-media-extract` | Extract Office embedded media | `frontend/app/file/office-media-extract/page.tsx` | Download result |
| `/file/macro-check` | Inspect Office macro presence | `frontend/app/file/macro-check/page.tsx` | Inline result |
| `/file/text-encoding-convert` | Convert text encoding | `frontend/app/file/text-encoding-convert/page.tsx` | Download result |
| `/file/virus-scan` | Scan any file with ClamAV signature detection | `frontend/app/file/virus-scan/page.tsx` | Inline result; accepts all file extensions |

### Dynamic route

| URL | Purpose | File | Status |
| --- | --- | --- | --- |
| `/[category]/[tool]` | Generic placeholder page for tool definitions from `lib/tools.ts` | `frontend/app/[category]/[tool]/page.tsx` | Placeholder shell |

## Route Behavior Notes

- Workspace pages suppress the footer and show the back-to-top button.
- Header mobile menu uses body-scroll locking.
- Shared routes often carry query parameters like `from`, `to`, `input`, `output`, or `file_id`.
- Some tool families intentionally funnel into shared routes instead of maintaining duplicate page implementations.
- Workspace success panels mention temporary downloads.
- Workspace failure panels include support-ready report details with copy and email actions.
- Workspace pages can show Recent Jobs stored only in browser localStorage.
- `/compress` includes a Processing Engine selector with Auto recommended and manual engines scoped by detected file type.
- `/convert` includes an engine selector; Auto is recommended.
- File Tools pages use `FileToolWorkspacePage`, show the 100 MB limit, and include `VirusScanBadge`.
- `/file/virus-scan` only scans and returns an inline result; it does not execute or transform the uploaded file.

## Contact and Support Copy

- failures and abuse: `support@wellfriend.online`
- general/API/business: `contact@wellfriend.online`

## Known Limitations

- Several redirect pages exist for usability and navigation consistency rather than separate implementations.
- The dynamic `[category]/[tool]` page is a placeholder shell, not a complete tool implementation.

## Related Documents

- [workspace-system.md](./workspace-system.md)
- [tool-workflows.md](./tool-workflows.md)
- [known-limitations.md](./known-limitations.md)
