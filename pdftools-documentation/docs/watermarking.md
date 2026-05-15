# Watermarking

## Purpose

Deep reference for the PDF and image watermark systems.

## Audience

- Developers
- QA
- Support staff

## Overview

Watermarking is one of the most interaction-heavy areas in PDFTools. Both PDF and image watermark pages use a visual editor, a shared `WatermarkEditor` UI, and relative positioning so preview state can map into export state.

## Watermark Types

- text
- uploaded image/logo

## Why Relative Coordinates Are Used

The UI stores `x_percent`, `y_percent`, and `width_percent` rather than raw pixels so the same placement can be applied consistently across different preview sizes and final export dimensions.

## PDF Watermark Flow

- user uploads PDF
- optional watermark asset is uploaded separately
- preview uses PDF page render endpoint
- editor overlays watermark on preview
- backend applies watermark to chosen pages using `pypdf` and `reportlab`

## Image Watermark Flow

- user uploads image
- optional watermark asset is uploaded separately
- editor overlays watermark on preview
- backend applies watermark using Pillow

## SVG Watermark Handling

SVG is special because:

- it is not directly supported by ReportLab/PIL for the PDF path
- it can contain scripts or external references

Current implemented handling:

- detect SVG by suffix
- inspect text for suspicious constructs
- reject obviously unsafe SVG
- rasterize safe SVG to PNG with Inkscape
- use `convert` as fallback if Inkscape is unavailable

## Mobile Controls

- bottom settings drawer
- drag watermark on preview
- pinch or width controls for image/logo sizing
- numeric percent fields for exact positioning

## Common Errors

- watermark not visible
- SVG could not be processed
- position mismatch between preview and output
- mobile settings drawer feels stuck

## Related Documents

- [mobile-ui.md](./mobile-ui.md)
- [security-hardening.md](./security-hardening.md)
- [known-limitations.md](./known-limitations.md)

