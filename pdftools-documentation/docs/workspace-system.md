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

The shared shell entry point is `UnifiedWorkspaceShell` in `frontend/components/workspace/UnifiedWorkspace.tsx`. The older `UnifiedWorkspace` export is kept as a compatibility alias for routes that already import it.

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

- PDF split
- PDF merge
- PDF rotate
- images-to-PDF
- batch resize

Characteristics:

- sortable thumbnails or file cards
- page-level selection and remove/restore where the tool supports it
- reusable thumbnail zoom through `WorkspaceCanvas`
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
| Split PDF | `/pdf/split` | grid | No | Yes | No | Yes | Thumbnail zoom | right column | drawer |
| Merge | `/pdf/merge` | grid | No | Yes | Yes | Yes | No | right column | drawer |
| Rotate PDF | `/pdf/rotate` | grid | No | Yes | No | Optional | No | right column | drawer |
| Watermark PDF | `/pdf/watermark` | editor | Yes | No | No | Overlay drag | Yes | right column | drawer |
| Watermark image | `/image/watermark` | editor | Yes | No | No | Overlay drag | Yes | right column | drawer |
| Resize image | `/image/resize` | editor | Yes | No | No | No | depends on preview | right column | drawer/same page |
| Crop image | `/image/crop` | custom editor | Yes | No | No | Crop drag | No | right column | same page |
| Batch resize | `/image/batch-resize` | grid | No | Yes | Yes | Yes | No | right column | same page |

## Shared Elements

- `WorkspaceHeader`
- `UnifiedWorkspaceShell`
- `WorkspaceCanvas`
- `GridWorkspace<T>` — generic engine for sortable thumbnail/card grids; powers `PageGridWorkspace`, images-to-PDF, and batch resize
- `PageGridWorkspace` — thin wrapper around `GridWorkspace<PageGridItem>` with page-specific toolbar (select all/odd/even/invert, restore-all) and rotation overlays; used by Split and Rotate
- `FileWorkspaceGrid` / `FileWorkspaceRow` — vertical-list reorder widget kept separate from `GridWorkspace<T>` because file rows want a wide list with metadata, not a thumbnail grid; used by Merge
- upload overlays
- download panel
- file metadata/info panel
- drag-and-drop states
- sticky process button
- mobile settings access

## Visual System

- All surfaces use the same neutral / paper / restrained-emerald system as the landing page.
- No glassmorphism: no `backdrop-blur`, no large translucent overlays, no neon glows.
- Cards use `rounded-2xl border border-zinc-200 bg-white shadow-sm` (`dark:border-white/10 dark:bg-zinc-900`).
- Page background is `bg-zinc-50` (`dark:bg-zinc-950`) so cards sit on a paper surface.
- Modal backdrops are `bg-zinc-950/60` or `bg-zinc-950/70` with no blur.
- Selection highlight is restrained: `border-emerald-600 ring-2 ring-emerald-600/15` (no large glow).

## Card-Size Zoom

`GridWorkspace<T>` exposes a thumbnail-zoom slider (50%–200%, step 10) that only resizes the grid cards. The workspace shell, toolbar, settings panel, and modal controls do not scale. The implementation uses `gridTemplateColumns: repeat(auto-fill, minmax(<computed>px, 1fr))` so smaller cards reflow into more columns and larger cards reflow into fewer.

Default mapping: `cardWidth = 170 + (zoom − 100) × 1.2` (≈110 px at 50 %, 170 px at 100 %, 290 px at 200 %). Tools can override via the `cardWidth` prop.

## Page Preview Modal

`GridWorkspace<T>` ships an internal modal that opens when the user previews a card. It has:

- solid backdrop (`bg-zinc-950/70`, no blur)
- solid card (`rounded-2xl border border-zinc-200 bg-white dark:bg-zinc-900`)
- header with item label, position, and selected/removed state
- previous/next/select/remove/close controls
- explicit loading state (`Loading preview…`) and an explicit failure state with a friendly fallback message
- keyboard support (`Esc` to close, `Arrow Left / Right` to navigate)

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

## Migration Status

| Tool | Sortable widget | Notes |
| --- | --- | --- |
| Split PDF | `PageGridWorkspace` (via `GridWorkspace<PageGridItem>`) | Full reference implementation — selection toolbar, removed/restored, modal preview, card-size zoom |
| Rotate PDF | `PageGridWorkspace` with `renderCardOverlay` | In-card rotate CW / CCW buttons; reuses the standard selection + zoom toolbar |
| Images to PDF | `GridWorkspace<ImageWorkspaceItem>` | Image cards with reorder + per-card remove; preview modal uses image preview |
| Batch resize | `GridWorkspace<ImageWorkspaceItem>` | Same shape as images-to-PDF |
| Merge PDFs | `FileWorkspaceGrid` (vertical list, intentional) | File rows want a wide vertical list with metadata, not a thumbnail grid. Do not migrate to `GridWorkspace<T>` without first adding a vertical-list strategy to it. |

## Reorder, Export, and Removed Pages

- Reorder/export uses the visual order of items as shown in the grid.
- Removed pages are excluded from the new output. The original PDF is not changed.
- "Recent Jobs" stores job metadata only (counts, output type) — never file contents.

## Related Documents

- [mobile-ui.md](./mobile-ui.md)
- [tool-workflows.md](./tool-workflows.md)
- [frontend-components.md](./frontend-components.md)

## File Tools Workspace Notes

- File Tools use `FileToolWorkspacePage`.
- File Tools use a 100 MB per-file upload limit; standard PDF, image, compress, convert, and OCR routes keep the 25 MB global limit.
- File Tools may use compact or grid layout depending on upload mode and result type.
- `VirusScanBadge` appears below relevant File Tools upload areas.
- Inline results are used for hashes, file inspection, metadata view, comparison, archive safety, macro checks, filename checks, and Virus Scanner.
- Download results are used for generated archives, cleaned files, reports, split/join outputs, and transformed files.
