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
  | "archive-compress"
  | "file-hash"
  | "file-checksum-verify"
  | "file-hash-batch"
  | "file-file-type"
  | "file-extension-check"
  | "file-metadata-view"
  | "file-metadata-clean"
  | "file-archive-create"
  | "file-archive-extract"
  | "file-archive-inspect"
  | "file-archive-safety"
  | "file-batch-rename"
  | "file-filename-sanitize"
  | "file-duplicate-find"
  | "file-file-compare"
  | "file-file-split"
  | "file-file-join"
  | "file-office-metadata-clean"
  | "file-office-media-extract"
  | "file-macro-check"
  | "file-filename-check"
  | "file-inventory-report"
  | "file-text-encoding-convert";

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
  "file-hash": "compact",
  "file-checksum-verify": "compact",
  "file-file-type": "compact",
  "file-extension-check": "compact",
  "file-metadata-view": "compact",
  "file-metadata-clean": "compact",
  "file-file-compare": "compact",
  "file-archive-inspect": "compact",
  "file-archive-safety": "compact",
  "file-filename-sanitize": "compact",
  "file-duplicate-find": "compact",
  "file-file-split": "compact",
  "file-file-join": "compact",
  "file-office-metadata-clean": "compact",
  "file-office-media-extract": "compact",
  "file-macro-check": "compact",
  "file-filename-check": "compact",
  "file-text-encoding-convert": "compact",
  "file-hash-batch": "grid",
  "file-batch-rename": "grid",
  "file-inventory-report": "grid",
  "file-archive-create": "grid",
  "file-archive-extract": "grid",
};

export function workspaceLayoutFor(toolId: WorkspaceToolId): WorkspaceLayoutKind {
  return TOOL_WORKSPACE_LAYOUTS[toolId];
}
