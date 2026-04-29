"use client";

import { useState, type DragEvent, type ReactNode } from "react";

export function WorkspaceDropzone({
  children,
  disabled = false,
  onFilesDropped,
}: {
  children: ReactNode;
  disabled?: boolean;
  onFilesDropped?: (files: File[]) => void;
}) {
  const [dragging, setDragging] = useState(false);

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    if (disabled || !onFilesDropped) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    setDragging(false);
    onFilesDropped(Array.from(event.dataTransfer.files ?? []));
  };

  return (
    <div
      className="relative"
      onDragEnter={(event) => {
        if (disabled || !onFilesDropped) {
          return;
        }
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setDragging(false);
        }
      }}
      onDragOver={(event) => {
        if (disabled || !onFilesDropped) {
          return;
        }
        event.preventDefault();
        setDragging(true);
      }}
      onDrop={handleDrop}
    >
      {children}
      {dragging ? (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center rounded-[inherit] bg-emerald-500/10 p-4">
          <div className="rounded-2xl border border-emerald-500/30 bg-white px-5 py-4 text-sm font-semibold text-emerald-700 shadow-xl shadow-black/10 dark:bg-zinc-900 dark:text-emerald-300 dark:shadow-black/30">
            Drop files to upload
          </div>
        </div>
      ) : null}
    </div>
  );
}
