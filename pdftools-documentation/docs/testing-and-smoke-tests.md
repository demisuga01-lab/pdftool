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
- upload under 25 MB
- reject upload over 25 MB
- PDF to JPG
- PNG compression
- PDF watermark text
- image watermark logo
- OCR sample
- safe failed job panel

