# Known Limitations

## Purpose

Track real gaps and caveats found during repository inspection.

## Current Limitations

- The dynamic route `/[category]/[tool]` is a placeholder shell, not a full tool implementation.
- Some advanced options are planned but intentionally hidden, disabled, or documented as unavailable when the backend does not apply them yet.
- Mobile gesture-heavy pages still need real-device QA even though the shared drawer and editor model is implemented.
- OCR and conversion reliability depend on host CLI installation.
- Very large PDFs can produce many thumbnail requests in visual page workspaces; thumbnails are lazy-loaded in the browser, but real-device UX should still be checked for high page counts.
- No antivirus or malware scanning is implemented.
- Runtime cleanup is not immediate deletion; verify the configured retention horizon in the environment.
- Some static marketing or pricing copy may require periodic review to avoid drifting from backend policy.
- `frontend/app/pricing/page.tsx` contains text encoding artifacts in current repository content and should be reviewed separately.

## Planned or Disabled Advanced Options

- PDF Protect permission enforcement and encryption-strength selection
- PDF Decrypt metadata/restriction toggles
- PDF Extract Text cleanup controls, language hints, encoding controls, and page-range extraction
- PDF to Images page selection and custom naming
- Images to PDF page size, orientation, margins, fit, compression, and quality controls
- Office to PDF PDF/A, PDF version, comments, bookmarks, form fields, hidden slides, first-sheet-only, compression, and quality controls
- Batch Resize format, fit, quality, and naming controls
- Remove Background refinement, feathering, edge smoothing, mask output, output format, blur, and background replacement controls
- OCR cleanup options such as deskew, denoise, and contrast enhancement when not wired through the active public page

## Related Documents

- [../FEATURES.md](../FEATURES.md)
- [../TROUBLESHOOTING.md](../TROUBLESHOOTING.md)
- [../ROADMAP.md](../ROADMAP.md)
