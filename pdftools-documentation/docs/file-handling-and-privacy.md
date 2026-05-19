# File Handling and Privacy

## How files are handled

Files are processed temporarily for the selected tool and are not kept as permanent storage.

Files are used to complete the action you selected, such as compressing, converting, watermarking, merging, or extracting text. The service is meant for processing, not for storing a file library.

Downloads are temporary. Save finished results when they are ready because generated files may be cleaned up after the retention window.

## Use caution with sensitive files

Avoid uploading highly sensitive files unless you trust the service for that specific use. If a document contains legal, medical, financial, employment, identity, or confidential business information, consider whether it should be processed in a public web tool at all.

## What this statement does and does not mean

- It does mean the service is designed for temporary processing rather than long-term storage.
- It does not mean that files never touch server-side infrastructure while a job runs.
- It does not guarantee that every file is appropriate for every privacy or compliance requirement.
- It does not mean PDFTools detects every harmful file.
- Relevant File Tools and high-risk upload flows can use ClamAV signature detection for known threats.

## Upload limits

- Standard PDF, image, compress, convert, and OCR routes use a 25 MB per-file limit.
- File Tools under `/file/*` use a 100 MB per-file limit.

## Virus scanning

Virus Scanner accepts any file type and scans it with ClamAV signature detection. The scan result is informational and signature-based. It does not detect zero-day exploits or unknown malware, and it should not be your only security measure.

## Recent jobs and local browser storage

Recent Jobs are saved only in your browser localStorage. They can include metadata such as job ID, tool name, route, original filename, file type, approximate size, status, timestamps, download URL, and safe error text.

Recent Jobs do not store file contents, passwords, or secrets. Clearing browser storage or using another device/browser may remove this local history.

## If a job fails

When reporting a failed job, include:

- the tool name
- the file type
- the approximate file size
- the exact error text
- the job ID if it is shown

This gives the support team enough detail to investigate without unnecessary back-and-forth.

Do not send passwords, private credentials, or unrelated sensitive data in a support report.
