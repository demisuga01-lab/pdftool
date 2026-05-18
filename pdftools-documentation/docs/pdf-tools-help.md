# PDF Tools

## Merge PDFs

Combine multiple PDFs into one output file. Use this when you want one report, packet, or document bundle.

## Split PDFs

Work with one PDF at page level before creating a new output. The split workspace shows thumbnails, lets you select pages, remove pages from the output, preview a larger page, and reorder pages for organize-style export.

Supported output modes:

- Split all pages: creates one PDF per page and downloads a ZIP.
- Extract selected pages: creates one PDF from selected pages only.
- Split selected pages: creates one PDF for each selected page and downloads a ZIP.
- Custom ranges: uses ranges like `1,3-5,8`; one range can download as a PDF and multiple ranges download as a ZIP.
- Reorder and export: exports one PDF from the remaining active pages in visual order.

The original PDF is not modified. Removed pages are only excluded from the new output, and generated downloads are temporary.

## Compress PDFs

Reduce PDF file size for email, uploads, or sharing. Compression results vary depending on image quality, embedded fonts, and how complex the original file is.

The shared `/compress` workspace includes a Processing Engine selector. Leave it on Auto unless you know a specific engine is compatible with your file and available on the server.

## Convert PDFs

Use conversion when you need a different output type from an existing PDF, such as text, images, or office-friendly formats.

## PDF to Word

Best for text-heavy PDFs that need editing in a word processor. Complex layouts may need cleanup after conversion.

## PDF to Excel

Best for tables or structured reports. Review merged cells, headers, and numeric formatting after download.

## PDF to images

Export PDF pages as image files. Multi-page jobs may be packaged as a ZIP download.

Output format is supported where available. Page selection and custom naming options are planned if not currently shown by the tool.

## Images to PDF

Combine one or more images into a PDF. This is useful for scans, photo attachments, and document bundles.

Images are currently combined using the backend default layout. Page size, margins, orientation, and fit controls are planned but are not active settings in the current tool.

## Protect PDF

Add password protection before sharing a document. This tool currently adds password protection; it does not advertise advanced printing, copying, editing, accessibility, or encryption-strength controls as enforced restrictions.

## Decrypt PDF

Remove password protection when you are authorized to access the file and know the password.

Extra metadata or restriction-removal options are not currently configurable.

## Extract text

Extract TXT, HTML, or JSON from a PDF using the backend-supported output format and layout settings. Advanced cleanup options such as header/footer removal, form extraction, language hints, or page-range extraction are planned but not active controls.

## Office to PDF

Convert Office documents to PDF through LibreOffice using server defaults. PDF/A, exact PDF version, comment export, bookmark export, hidden slide, sheet-specific, and similar export toggles are not currently documented as supported output controls.

## Watermark PDF

Add text or image watermarks to a PDF for branding, ownership, or internal labeling.

## OCR scanned PDFs

Use OCR when the PDF is image-based and you need selectable or searchable text. Results depend on scan quality, language, resolution, and contrast.
