# Workspace System

## Purpose

Explain the shared workspace architecture used across PDFTools routes.

## Audience

- Frontend developers
- QA
- Future maintainers

## Scope

This covers the compact, grid, and visual editor shells; shared preview behavior; mobile drawer behavior; and why different tools use different workspace layouts.

## What a Workspace Is

A workspace is the reusable page shell that combines:

- file upload or restore
- preview or editor surface
- settings controls
- process action
- status/download panel
- reset and retry behavior

## Why Shared Workspaces Exist

They reduce duplicated logic for:

- upload progress
- polling
- download handling
- mobile behavior
- tool settings presentation
- header, info, and action patterns

## Workspace Types

### Compact workspace

Used for:

- convert
- compress
- OCR
- image info

Characteristics:

- preview card or metadata block
- settings stack
- download panel overlay
- best for tools without a complex visual editor

### Grid workspace

Used for:

- PDF merge
- PDF rotate
- images-to-PDF
- batch resize

Characteristics:

- sortable thumbnails or file cards
- drag reorder
- often multi-file
- side settings panel

### Visual editor workspace

Used for:

- PDF watermark
- image watermark
- image resize
- image rotate
- image crop

Characteristics:

- larger preview/editor surface
- touch and mouse interactions
- bottom drawer on mobile
- sticky process action

## Workspace Matrix

| Tool | Route | Type | Big editor | Grid | Multi-file | Drag/drop reorder | Zoom/pan | Desktop settings | Mobile settings |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Compress | `/compress` | compact | No | No | Sometimes | No | Minimal | right column | same page |
| Convert | `/convert` | compact | No | No | No | No | Minimal | right column | same page |
| OCR | `/tools/ocr` | compact | No | No | No | No | Minimal | right column | same page |
| Merge | `/pdf/merge` | grid | No | Yes | Yes | Yes | No | right column | drawer |
| Rotate PDF | `/pdf/rotate` | grid | No | Yes | No | Optional | No | right column | drawer |
| Watermark PDF | `/pdf/watermark` | editor | Yes | No | No | Overlay drag | Yes | right column | drawer |
| Watermark image | `/image/watermark` | editor | Yes | No | No | Overlay drag | Yes | right column | drawer |
| Resize image | `/image/resize` | editor | Yes | No | No | No | depends on preview | right column | drawer/same page |
| Crop image | `/image/crop` | custom editor | Yes | No | No | Crop drag | No | right column | same page |
| Batch resize | `/image/batch-resize` | grid | No | Yes | Yes | Yes | No | right column | same page |

## Shared Elements

- `WorkspaceHeader`
- upload overlays
- download panel
- file metadata/info panel
- drag-and-drop states
- sticky process button
- mobile settings access

## Mobile Bottom Drawer

Current model:

- fixed bottom sheet
- scrollable body
- safe-area bottom padding
- body scroll locked only while open
- drawer body marked with `data-drawer-scroll`
- settings surface marked with `data-settings-control`

## Touch Gesture Handling

- editor pan/zoom must ignore controls and drawer surfaces
- watermark drag/pinch should only attach to the overlay
- drawer scrolling should not be blocked by canvas or watermark gesture logic

## Dark Mode

- all workspace surfaces include dark variants
- app shell uses zinc/neutral dark surfaces rather than blue-themed dark mode

## Why Specific Tools Use These Layouts

- Watermarking needs visual placement and export alignment
- Crop needs direct manipulation of a bounding box
- Resize and rotate benefit from visual confirmation
- Merge and images-to-PDF need sortable collections
- Compress/convert/OCR can work from a compact settings-driven model

## Related Documents

- [mobile-ui.md](./mobile-ui.md)
- [tool-workflows.md](./tool-workflows.md)
- [frontend-components.md](./frontend-components.md)

