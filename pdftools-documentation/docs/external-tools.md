# External Tools

## Purpose

Matrix of non-Python/non-Node tools used by the current codebase.

## Tool Matrix

| Tool | Command | Used by | Required | Notes |
| --- | --- | --- | --- | --- |
| Ghostscript | `gs` | PDF compression | Optional but important | PDF compression path |
| MuPDF | `mutool` | PDF preview, page render, OCR rasterization | Important | PDF page image rendering |
| qpdf | `qpdf` | merge, split, encrypt, decrypt, checks | Important | also used for page count |
| pdftotext | `pdftotext` | extract text | Important | TXT/HTML extraction |
| pdftops | `pdftops` | SVG to EPS fallback path | Optional | EPS export support |
| LibreOffice | `libreoffice` | Office to PDF | Important for Office flows | headless conversion |
| ImageMagick | `convert` | image fallback and SVG fallback | Important fallback | production uses `convert`, do not rely on `magick` |
| libvips | `vips` backend library | image operations | Important | surfaced via `pyvips` |
| Tesseract | `tesseract` | OCR | Important | OCR engine |
| Inkscape | `inkscape` | SVG rasterization and SVG convert | Important for best SVG support | preferred over fallback |
| OCRmyPDF | `ocrmypdf` | PDF compression optimization path | Optional | only if installed |
| pngquant | `pngquant` | PNG compression | Optional | image compression path |
| oxipng | `oxipng` | PNG compression | Optional | image compression path |
| optipng | `optipng` | PNG compression | Optional | fallback/optional |
| jpegoptim | `jpegoptim` | JPEG compression | Optional | image compression path |
| cwebp | `cwebp` | WebP encode | Optional | image conversion/compression |
| avifenc | `avifenc` | AVIF encode | Optional | image conversion/compression |
| 7z | `7z` | archive packaging | Optional | fallback to ZIP if absent |
| advzip | `advzip` | ZIP optimization | Optional | extra archive optimization |
| brotli | `brotli` | text output compression | Optional | text packaging path |
| Docker | `docker` | Redis container operations | Operational | VPS stack |
| PM2 | `pm2` | app process supervision | Operational | current deployment stack |
| Celery | `celery` | worker inspection | Operational | backend queue system |

