# File Tools

## Purpose

Use File Tools for general file inspection, hashing, archives, filename cleanup, metadata handling, split/join workflows, reports, and ClamAV signature scanning.

The current navigation treats File Tools as 23 general file utilities plus the dedicated Virus Scanner route.

## Status

Implemented.

## Upload Limit

File Tools accept files up to `100 MB` per file. Other PDF, image, compress, convert, and OCR routes keep the standard `25 MB` per-file limit.

## Hash & Integrity

- Hash Checker: `/file/hash`
- Checksum Verifier: `/file/checksum-verify`
- Batch Hash Generator: `/file/hash-batch`
- Duplicate Finder: `/file/duplicate-find`

## File Inspection

- File Type Detector: `/file/file-type`
- Extension Mismatch: `/file/extension-check`
- File Metadata: `/file/metadata-view`
- File Compare: `/file/file-compare`
- Filename Checker: `/file/filename-check`
- Archive Safety Check: `/file/archive-safety`

## Archives

- Create Archive: `/file/archive-create`
- Extract Archive: `/file/archive-extract`
- Archive Inspector: `/file/archive-inspect`

## Rename & Organize

- Batch Rename: `/file/batch-rename`
- Filename Sanitizer: `/file/filename-sanitize`
- File Inventory Report: `/file/inventory-report`

## Split & Join

- Split File: `/file/file-split`
- Join File Parts: `/file/file-join`

## Metadata and Privacy

- Metadata Cleaner: `/file/metadata-clean`
- Office Metadata Cleaner: `/file/office-metadata-clean`
- Office Media Extractor: `/file/office-media-extract`
- Macro Checker: `/file/macro-check`

## Text Files

- Text Encoding Convert: `/file/text-encoding-convert`

## Virus Scanner

- Virus Scanner: `/file/virus-scan`

Virus Scanner accepts all file types, including executable extensions. It scans the uploaded file with ClamAV signature detection and returns an inline result. It does not execute or transform the file.

## Scanning Note

Relevant high-risk uploads show a neutral notice: `Files are scanned for threats before processing.`

ClamAV scanning detects known threats based on signatures. It does not detect zero-day exploits or unknown malware. Do not rely on this scan as your only security measure.

## Backend

File Tools use `/api/file-tools/*`, `file_tools_tasks.py`, and the File Tools service layer. Most File Tools run on the fast queue; heavier archive and metadata operations run on the heavy queue.
