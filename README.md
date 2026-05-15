<p align="center">
  <img src="./assets/logo.png" alt="PDFTools by WellFriend logo" width="360" />
</p>

<h1 align="center">PDFTools by WellFriend</h1>

<p align="center">
  A clean open-source workspace for PDF and image tools.
</p>

<p align="center">
  <a href="https://tools.wellfriend.online">Website</a>
  ·
  <a href="https://tools.wellfriend.online/docs">Docs</a>
  ·
  <a href="https://github.com/demisuga01-lab/pdftool">Repository</a>
  ·
  <a href="mailto:support@wellfriend.online">Support</a>
</p>

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-App%20Router-000000?style=flat-square&logo=nextdotjs&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" />
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" />
  <img alt="FastAPI" src="https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white" />
  <img alt="Redis" src="https://img.shields.io/badge/Redis-DC382D?style=flat-square&logo=redis&logoColor=white" />
  <img alt="Open Source" src="https://img.shields.io/badge/Open_Source-Yes-111827?style=flat-square" />
</p>

## Overview

PDFTools by WellFriend is a browser-based workspace for PDF and image workflows. Users can upload files, choose a tool, adjust settings, process the file, and download the result through one consistent interface.

The project combines PDF tools, image tools, conversion, compression, and OCR into a single product flow instead of scattering those tasks across unrelated pages. It is open source, designed to be self-hosted, and intended to be useful both as a public web app and as a practical base for operators and contributors who want to run the stack themselves.

## What You Can Do

### PDF tools

- Merge PDFs
- Split PDFs
- Rotate PDFs
- Watermark PDFs
- Protect PDFs
- Decrypt PDFs
- Extract text
- Convert PDF to images
- Convert images to PDF
- Convert Office documents to PDF
- OCR scanned PDFs

### Image tools

- Resize images
- Batch resize images
- Rotate images
- Crop images
- Watermark images
- Remove backgrounds
- Inspect image info
- Convert images
- Compress images
- OCR images

### Shared workspaces

- Universal converter
- Universal compressor
- OCR workspace
- Upload previews
- Job status polling
- Download panel
- Mobile-friendly workspace layouts
- Light, dark, and system theme support

## Why This Project Exists

Many file tools feel disconnected: one page for compression, another for conversion, another for OCR, each with different controls and different behavior.

PDFTools is an attempt to provide one consistent upload -> adjust -> process -> download workflow across common PDF and image tasks. The goal is not to bundle unrelated utilities together, but to make frequent document and image jobs feel predictable inside one interface.

## File Handling

“Files are processed temporarily for the selected tool and are not kept as permanent storage.”

- Users should avoid highly sensitive files unless they trust the deployment.
- Support reports should include the tool name, file type, approximate file size, exact error text, and job ID if shown.

## Tech Stack

| Area | Stack |
| --- | --- |
| Frontend | Next.js App Router, TypeScript, Tailwind CSS |
| Backend | FastAPI |
| Background jobs | Celery |
| Queue and state | Redis |
| Process management | PM2 |
| Deployment style | VPS with Docker Redis |
| Processing tools | qpdf, MuPDF, Ghostscript, LibreOffice, Tesseract, ImageMagick, Inkscape, libvips, and related utilities |

## Architecture

```text
Browser
  -> Next.js frontend
  -> FastAPI backend
  -> Redis / Celery queue
  -> Worker services
  -> External processing tools
  -> Output download
```

## Local Development

```bash
git clone https://github.com/demisuga01-lab/pdftool.git
cd pdftool
```

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m compileall app
```

### Frontend

```bash
cd ../frontend
pnpm install
pnpm exec tsc --noEmit
pnpm build
pnpm dev
```

Some workflows require external command-line tools to be installed locally, such as qpdf, MuPDF, Ghostscript, LibreOffice, Tesseract, ImageMagick, Inkscape, and libvips.

## Production Deployment Summary

```bash
cd /opt/pdftool
git fetch origin master
git reset --hard origin/master

cd backend
source venv/bin/activate
pip install -r requirements.txt
python3 -m compileall app

cd ../frontend
pnpm install
pnpm exec tsc --noEmit
pnpm build

pm2 restart pdftool-api pdftool-frontend pdftool-worker-fast pdftool-worker-heavy --update-env
pm2 save
```

Production also requires Redis, Celery workers, configured storage paths, required processing tools, and a valid backend environment file.

## Project Structure

```text
pdftool/
  backend/
  frontend/
  pdftools-documentation/
```

## Contributing

- Open an issue for larger changes before starting implementation.
- Keep frontend and backend behavior aligned.
- Update documentation when adding tools or routes.
- Do not commit secrets, `.env`, uploads, outputs, `node_modules`, `.next`, or `venv`.
- Run checks before submitting changes.

```bash
cd backend
python -m compileall app

cd ../frontend
pnpm exec tsc --noEmit
pnpm build
```

## Roadmap

- Authenticated API platform
- API keys
- Usage quotas
- Webhooks
- Better monitoring
- More formats
- Accessibility improvements
- Optional accounts
- Automated tests

## Support

- Website: https://tools.wellfriend.online
- Support: support@wellfriend.online
- Contact: contact@wellfriend.online

## License

This project is open source. See the repository license file for details.
