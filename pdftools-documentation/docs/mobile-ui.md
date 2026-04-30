# Mobile UI

## Purpose

Document the mobile interaction model across workspace pages.

## Audience

- Frontend developers
- QA
- Support staff

## Design Goals

- keep large workspaces usable on narrow screens
- avoid page-wide horizontal overflow
- keep settings reachable without losing the preview
- separate drawer scrolling from editor gestures

## Current Mobile Patterns

- sticky header
- footer hidden on workspace pages
- floating or sticky process button
- bottom settings drawer for visual/grid workspaces
- safe-area bottom padding
- back-to-top button on workspace pages

## Drawer Scroll Model

Current shared drawer implementation:

- fixed bottom sheet
- `max-h-[85dvh]`
- flex column root
- dedicated scroll body with `overflow-y-auto`
- `WebkitOverflowScrolling: touch`
- `touchAction: pan-y`
- safe-area bottom padding

## Body Scroll Lock

- enabled only while drawer or mobile menu is open
- current code uses a shared body-scroll-lock hook

## Touch Rules

- editor pan/zoom must ignore settings controls
- drawer controls must not trigger canvas pan
- watermark gestures must stay on the watermark overlay

## QA Widths

- `320px`
- `360px`
- `390px`
- `430px`
- `768px`

## Related Documents

- [workspace-system.md](./workspace-system.md)
- [watermarking.md](./watermarking.md)
- [known-limitations.md](./known-limitations.md)

