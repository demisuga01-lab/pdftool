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

### Dynamic route

| URL | Purpose | File | Status |
| --- | --- | --- | --- |
| `/[category]/[tool]` | Generic placeholder page for tool definitions from `lib/tools.ts` | `frontend/app/[category]/[tool]/page.tsx` | Partially implemented placeholder |

## Route Behavior Notes

- Workspace pages suppress the footer and show the back-to-top button.
- Header mobile menu uses body-scroll locking.
- Shared routes often carry query parameters like `from`, `to`, `input`, `output`, or `file_id`.
- Some tool families intentionally funnel into shared routes instead of maintaining duplicate page implementations.

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

