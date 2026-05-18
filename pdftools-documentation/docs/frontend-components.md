# Frontend Components

## Purpose

Map major frontend component groups to their responsibilities.

## Layout Components

- `AppShell.tsx`
- `Header.tsx`
- `Footer.tsx`
- `ToolLayout.tsx`

## Theme Components

- `ThemeProvider.tsx`
- `ThemeToggle.tsx`

## Workspace Components

- `WorkspaceShells.tsx` — `CompactWorkspaceShell` and `VisualEditorWorkspaceShell`; shared paper/neutral styling matching the landing page (no glass, no neon)
- `WorkspaceMobileDrawer.tsx`
- `WorkspaceSettingsPanel.tsx` — right-side settings card (rounded-2xl, subtle border + shadow-sm)
- `WorkspaceEditorCanvas.tsx`
- `WorkspaceHeader.tsx`
- `WorkspaceToolbar.tsx`
- `WorkspaceDownloadPanel.tsx`
- `WorkspacePreview.tsx`
- `WorkspaceResultPanel.tsx`
- `WorkspacePageBuilders.tsx`
- `WorkspaceCanvas.tsx` — `WorkspaceZoomControls` (50%–200%, step 10) and the toolbar/summary frame used by grid workspaces
- `PageGridWorkspace.tsx`:
  - `GridWorkspace<T>` — generic engine: dnd-kit reorder via a dedicated handle, shift-range selection, removed/restored state, card-size zoom (only resizes cards), preview modal with explicit loading/error states. Items must extend `GridWorkspaceItemBase` (`{ id, removed?, selected?, previewUrl?, thumbnailUrl? }`); the card is supplied via a `renderCard` render-prop that receives the dnd-kit wiring.
  - `PageGridWorkspace` — thin wrapper around `GridWorkspace<PageGridItem>` with the page selection toolbar (`Select all / Clear / Odd / Even / Invert / Restore all`) and an optional `renderCardOverlay` for tool-specific in-card controls (Rotate uses this).
  - `GridThumbnail` — shared thumbnail with loading spinner, retry-on-error fallback.
- `WatermarkEditor.tsx`
- `UnifiedWorkspace.tsx` / `UnifiedWorkspaceShell`
- `PDFWorkspace.tsx` — legacy shell still used by office-to-pdf and parts of the page builders; reuses the same paper styling
- `ImageWorkspace.tsx`
- `FileWorkspaceGrid.tsx` / `FileWorkspaceRow.tsx` — vertical-list reorder used by Merge (kept separate from `GridWorkspace<T>`; see workspace-system.md "Migration Status")

## UI Components

- `FileUpload.tsx`
- `UploadProgress.tsx`
- `DownloadPanel.tsx`
- `ToolSettings.tsx`
- `ToolCard.tsx`
- `StaticPage.tsx`
- `Logo.tsx`
- `BackToTopButton.tsx`

## Related Documents

- [workspace-system.md](./workspace-system.md)
- [theme-and-branding.md](./theme-and-branding.md)
