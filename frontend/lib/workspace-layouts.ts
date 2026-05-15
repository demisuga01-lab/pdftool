export type WorkspaceLayoutKind = "compact" | "grid" | "editor";

export type WorkspaceToolId =
  | "compress"
  | "convert"
  | "ocr"
  | "pdf-compress"
  | "pdf-convert"
  | "pdf-extract-text"
  | "pdf-protect"
  | "pdf-decrypt"
  | "pdf-repair"
  | "pdf-info"
  | "pdf-merge"
  | "pdf-split"
  | "pdf-rotate"
  | "pdf-watermark"
  | "pdf-crop"
  | "pdf-reorder"
  | "image-compress"
  | "image-convert"
  | "image-info"
  | "image-batch-resize"
  | "image-remove-background"
  | "image-ocr"
  | "image-resize"
  | "image-rotate"
  | "image-crop"
  | "image-watermark"
  | "office-to-pdf"
  | "csv-excel-convert"
  | "archive-compress";

// Workspace layout decision map:
// compact = upload/file card + contained preview + settings.
// grid = clean file/page list or thumbnail grid for multi-file and batch operations.
// editor = large interactive surface for dragging, selecting, cropping, rotating, or placing overlays.
export const TOOL_WORKSPACE_LAYOUTS: Record<WorkspaceToolId, WorkspaceLayoutKind> = {
  compress: "compact",
  convert: "compact",
  ocr: "compact",
  "pdf-compress": "compact",
  "pdf-convert": "compact",
  "pdf-extract-text": "compact",
  "pdf-protect": "compact",
  "pdf-decrypt": "compact",
  "pdf-repair": "compact",
  "pdf-info": "compact",
  "pdf-merge": "grid",
  "pdf-split": "grid",
  "pdf-rotate": "grid",
  "pdf-watermark": "editor",
  "pdf-crop": "editor",
  "pdf-reorder": "grid",
  "image-compress": "compact",
  "image-convert": "compact",
  "image-info": "compact",
  "image-batch-resize": "grid",
  "image-remove-background": "compact",
  "image-ocr": "compact",
  "image-resize": "editor",
  "image-rotate": "editor",
  "image-crop": "editor",
  "image-watermark": "editor",
  "office-to-pdf": "compact",
  "csv-excel-convert": "compact",
  "archive-compress": "compact",
};

export function workspaceLayoutFor(toolId: WorkspaceToolId): WorkspaceLayoutKind {
  return TOOL_WORKSPACE_LAYOUTS[toolId];
}
