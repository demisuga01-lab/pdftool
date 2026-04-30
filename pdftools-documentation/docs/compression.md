# Compression

## Purpose

Explain how the shared compression workspace works and what the backend actually does.

## Audience

- Developers
- Operators
- Support staff

## Overview

Compression is asynchronous because it can invoke multiple external tools, explore several candidate outputs, and work across different file families.

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

## Related Documents

- [../FEATURES.md](../FEATURES.md)
- [external-tools.md](./external-tools.md)
- [workers-and-queues.md](./workers-and-queues.md)

