# Known Limitations

## Purpose

Track real gaps and caveats found during repository inspection.

## Current Limitations

- The dynamic route `/[category]/[tool]` is a placeholder shell, not a full tool implementation.
- Several frontend settings panels expose controls that current backend routes do not apply yet.
- Mobile gesture-heavy pages still need real-device QA even though the shared drawer and editor model is implemented.
- OCR and conversion reliability depend on host CLI installation.
- No antivirus or malware scanning is implemented.
- Runtime file retention is `24 hours`, not immediate deletion.
- Some static marketing or pricing copy may require periodic review to avoid drifting from backend policy.
- `frontend/app/pricing/page.tsx` contains text encoding artifacts in current repository content and should be reviewed separately.

## Examples of Partial UI-to-Backend Mapping

- PDF protect permission controls
- PDF decrypt extra flags
- PDF extract text advanced options
- images-to-PDF page layout options
- Office-to-PDF export options
- batch resize naming options
- remove-background advanced refinement options

## Related Documents

- [../FEATURES.md](../FEATURES.md)
- [../TROUBLESHOOTING.md](../TROUBLESHOOTING.md)
- [../ROADMAP.md](../ROADMAP.md)

