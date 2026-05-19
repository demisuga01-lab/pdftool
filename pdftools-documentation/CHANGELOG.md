# Changelog

## [Current] - 2026-05-19

### Added

- 23 File Tools under `/file/*` routes
- Virus Scanner page (`/file/virus-scan`)
- ClamAV virus scanning on File Tools, archive, and Office file uploads
- VirusScanBadge on high-risk upload pages
- OCR Tools navigation dropdown
- Privacy Tools navigation dropdown
- Universal Tools navigation dropdown: Compress and Convert
- File Tools navigation dropdown
- PDF Tools and Image Tools as separate nav dropdowns
- 100MB upload limit for File Tools
- File Tools backend: 13 services, 1 task, 1 route file
- `virus_scanner.py` with fail-open behavior
- `CLAMD_SOCKET` config and `.env` value
- `check_readiness.py`: 57 checks including ClamAV
- Convert engine selector (`/convert`)
- Engine branching in `conversion_service.py`

### Changed

- Navigation: single Tools -> 6 category dropdowns
- Mobile menu: 6 collapsible sections
- Preview modal: solid backdrop `z-[200]`, zoom controls
- Watermark: inline text editing on click/tap
- Grid card zoom: wired to inline grid style
- Theme hydration: mounted guard on `ThemeToggle`
- Settings panels: solid surfaces, no glass
- PDF Rotate: thumbnail overflow fixed, selection/summary count fixed
- `celery_app.py`: `file_tools_tasks` registered
- PDF Tools dropdown: left-aligned panel
- Image Tools dropdown: left-aligned panel
- OCR Tools dropdown: left-aligned panel

## Unreleased

### Added

- Documentation system under `pdftools-documentation/`
- Product, architecture, deployment, operations, security, API, workflow, and support documentation
- Tool, route, worker, and troubleshooting references

### Changed

- Documentation organization moved into a dedicated repository folder
