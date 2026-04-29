"use client";

import { Maximize2, Minus, Plus } from "lucide-react";
import { type ReactNode } from "react";

export function WorkspaceToolbar({
  children,
  fit,
  label,
  reset,
  zoomIn,
  zoomOut,
}: {
  children?: ReactNode;
  fit?: () => void;
  label?: string;
  reset?: () => void;
  zoomIn?: () => void;
  zoomOut?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-3 py-3 dark:border-white/10 sm:px-4">
      {fit && reset && zoomIn && zoomOut && label ? (
        <div className="flex flex-wrap items-center gap-2">
          <button aria-label="Zoom out" className="secondary-button h-10 w-10 p-0" onClick={zoomOut} type="button">
            <Minus className="h-4 w-4" />
          </button>
          <span className="min-w-[68px] text-center text-sm font-semibold text-zinc-600 dark:text-zinc-300">{label}</span>
          <button aria-label="Zoom in" className="secondary-button h-10 w-10 p-0" onClick={zoomIn} type="button">
            <Plus className="h-4 w-4" />
          </button>
          <button className="secondary-button h-10 px-3 text-sm" onClick={fit} type="button">
            Fit
          </button>
          <button className="secondary-button h-10 px-3 text-sm" onClick={reset} type="button">
            100%
          </button>
          <button aria-label="Fit preview" className="secondary-button h-10 w-10 p-0" onClick={fit} type="button">
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div />
      )}
      {children}
    </div>
  );
}
