# Compression

## Purpose

Explain how the shared compression workspace works and what the backend actually does.

## Audience

- Developers
- Operators
- Support staff

## Overview

Compression is asynchronous because it can invoke multiple external tools, explore several candidate outputs, and work across different file families.

The public `/compress` page now exposes an advanced Processing Engine selector. The default is Auto and should remain the recommended path for most users. Manual engine selection is available for compatible file families, but it depends on the server having the selected CLI tool installed and on the input file being suitable for that engine.

## Supported Categories

- PDF
- image
- Office-like ZIP containers
- text/code/data files
- ZIP archives
- unsupported fallback packaging

## Compression Modes

- `smart`
- `balanced`
- `lossless`
- `maximum`
- target-size workflows using `target_size_bytes`

## Processing Engine Selector

Frontend behavior:

- Auto is selected by default.
- Manual engine controls are hidden until the user chooses to select an engine manually.
- Engine choices are scoped to the detected file family and extension.

Backend behavior:

- `/api/compress` accepts settings JSON and passes the selected engine through to the compression task.
- Auto lets the compression service choose the safest available method.
- Manual choices are best-effort and still fail safely if the tool is unavailable, incompatible, or times out.

Common manual engines:

- PDF: `ghostscript`, `qpdf`, `ocrmypdf`
- PNG: `pngquant`, `oxipng`, `optipng`
- JPEG: `jpegoptim`
- WebP/AVIF output: `cwebp`, `avifenc`
- GIF: `gifsicle`
- General image fallback: ImageMagick
- ZIP/text packaging: `7z`, `advzip`, `brotli`

## Target Size Behavior

- best effort by default
- can attempt stricter matching when configured
- if original is already below target, backend keeps original and returns message
- if exact target cannot be reached safely, backend returns smallest valid output and marks `reached_target=false`

## PDF Compression

Primary toolchain can include:

- `gs`
- `qpdf`
- `ocrmypdf`
- `pdfcpu` if present

Backend records:

- original size
- output size
- saved bytes
- saved percent
- method
- target info

## Image Compression

Possible tools include:

- `jpegoptim`
- `pngquant`
- `oxipng`
- `optipng`
- `cwebp`
- `avifenc`
- `gifsicle`
- `convert` fallback in some branches

Important production-hardening detail:

- candidate attempts are capped to avoid runaway recompression loops, especially for PNG target-size matching

## Archive and Packaging

- ZIP recompression supported
- `7z` used when available
- `advzip` may further optimize ZIP output
- unsupported archive types fail safely rather than being extracted unsafely

## Text and Data Compression

- optional minify paths for JSON, HTML, XML, SVG, CSS, JS, TXT, CSV
- optional `gzip`
- optional `brotli`
- packaging as ZIP/7z fallback

## Timeouts

- task soft/hard timeout: roughly `210/240` seconds for shared compression task
- per-tool command timeouts are shorter to avoid one command consuming the whole worker budget

## Common Errors

- tool missing
- timeout
- target not reached
- original already smaller
- unsupported archive extraction
- file too large
- manual engine incompatible with the file or unavailable on the server

## Related Documents

- [../FEATURES.md](../FEATURES.md)
- [external-tools.md](./external-tools.md)
- [workers-and-queues.md](./workers-and-queues.md)
