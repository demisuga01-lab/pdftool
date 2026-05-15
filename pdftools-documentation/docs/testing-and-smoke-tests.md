# Testing and Smoke Tests

## Purpose

Collect core validation checks for code health and runtime behavior.

## Baseline Commands

```powershell
cd E:\pdftool\backend
py -3 -m compileall app

cd ..\frontend
pnpm exec tsc --noEmit
pnpm build
```

## High-Value Smoke Tests

- homepage
- theme toggle
- new private window defaults to system theme
- upload under 25 MB
- reject upload over 25 MB
- PDF to JPG 1-page direct download
- PDF to JPG multi-page ZIP download
- PDF to PNG
- PDF to WebP
- image to JPG direct download
- PNG compression
- PDF watermark text
- image watermark logo
- OCR sample
- safe failed job panel
- Discord link visible on contact page and footer
- repeated compress target-size jobs do not fail after a few normal uses
- polling `429` slows status checks without changing the job to failed
- download `429` shows a retry notice without changing the finished job to failed
