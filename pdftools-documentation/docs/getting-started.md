# Getting Started

## What PDFTools does

PDFTools by WellFriend is a browser-based workspace for common PDF and image tasks. You can merge files, split pages, compress uploads, convert formats, add watermarks, extract text with OCR, and download a finished result without creating an account.

## How to choose a tool

- Use a PDF tool when your source file is already a PDF and you want to change, protect, split, merge, or export it.
- Use an image tool when you want to resize, crop, rotate, convert, watermark, or inspect image files.
- Use the shared workspaces for broad jobs such as compression, conversion, and OCR across multiple file types.

## How to upload files

1. Open the tool you want to use.
2. Drag files into the upload area or choose them from your device.
3. Wait for the upload to complete before changing settings or starting processing.

If a tool supports multiple files, add everything you want in the same workspace before processing.

## How to adjust settings

Most tools show settings beside the preview area or in a mobile drawer. Adjust only the settings that matter for your result:

- output format
- quality or compression level
- page order or page range where the tool supports it
- rotation, crop, or resize values
- password or watermark settings where relevant

If you are unsure, start with the default settings and only change one or two options at a time.

Some advanced settings are intentionally hidden or marked as planned when the backend does not apply them yet. This keeps the workspace honest: visible controls should either work now or clearly say they are not available yet.

On `/compress`, the Processing Engine setting lets you leave the engine on Auto or choose a compatible manual engine. Auto is recommended for most files. Manual engines depend on the file type and on tools installed on the server.

## How processing and downloads work

1. Upload your file.
2. Review the preview and settings.
3. Start processing.
4. Wait for the job status to move from queued or processing to ready.
5. Download the completed result.

Some conversions package multiple outputs into a ZIP file. That is expected for jobs such as turning a multi-page PDF into separate images.

For Split PDF, the output depends on the selected mode: split-all and split-selected jobs download a ZIP, while extract-selected and reorder/export jobs download one PDF. The original upload is not modified.

Downloads are temporary. Save the result after it is ready because generated files may be cleaned up after the retention window. PDFTools is a processing workspace, not permanent file storage.

## Recent jobs

Workspace pages include a Recent Jobs panel for jobs started in the same browser. Recent jobs are saved in localStorage only; they are not account history and they do not store file contents, passwords, or secrets.

The panel can show job status, tool name, route, original filename, approximate size, job ID, and a download link when available. Old download links may stop working after cleanup, so rerun the tool if a temporary result has expired.

## What to do if a job fails

- Retry with the same tool once in case the failure was temporary.
- Confirm that the file type matches the tool you selected.
- Use a smaller or simpler file if the original is very large or unusual.
- Check the exact error text shown in the workspace.
- Use the failure report panel to copy the support details if the same file fails repeatedly.

When reporting a failure, include the tool name, route, file type, approximate size, exact error text, and job ID if it is shown. The support panel is designed to include useful metadata without internal paths, tracebacks, backend logs, secrets, or command lines.
