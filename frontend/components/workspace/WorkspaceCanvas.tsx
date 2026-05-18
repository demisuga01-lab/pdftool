"use client";

import { Minus, Plus, RotateCcw } from "lucide-react";
import type { ReactNode } from "react";

export type WorkspaceZoomLevel = 50 | 60 | 70 | 80 | 90 | 100 | 110 | 120 | 130 | 140 | 150 | 160 | 170 | 180 | 190 | 200;

export const WORKSPACE_ZOOM_MIN = 50;
export const WORKSPACE_ZOOM_MAX = 200;
export const WORKSPACE_ZOOM_STEP = 10;

export function clampWorkspaceZoom(value: number): WorkspaceZoomLevel {
  const stepped = Math.round(value / WORKSPACE_ZOOM_STEP) * WORKSPACE_ZOOM_STEP;
  return Math.min(WORKSPACE_ZOOM_MAX, Math.max(WORKSPACE_ZOOM_MIN, stepped)) as WorkspaceZoomLevel;
}

export function WorkspaceZoomControls({
  onChange,
  value,
}: {
  onChange: (value: WorkspaceZoomLevel) => void;
  value: WorkspaceZoomLevel;
}) {
  const setZoom = (nextValue: number) => onChange(clampWorkspaceZoom(nextValue));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        aria-label="Zoom out"
        className="secondary-button h-9 w-9 p-0"
        disabled={value <= WORKSPACE_ZOOM_MIN}
        onClick={() => setZoom(value - WORKSPACE_ZOOM_STEP)}
        type="button"
      >
        <Minus className="h-4 w-4" />
      </button>
      <input
        aria-label="Thumbnail zoom"
        className="field-range w-28 sm:w-32"
        max={WORKSPACE_ZOOM_MAX}
        min={WORKSPACE_ZOOM_MIN}
        onChange={(event) => setZoom(Number(event.target.value))}
        step={WORKSPACE_ZOOM_STEP}
        type="range"
        value={value}
      />
      <button
        aria-label="Zoom in"
        className="secondary-button h-9 w-9 p-0"
        disabled={value >= WORKSPACE_ZOOM_MAX}
        onClick={() => setZoom(value + WORKSPACE_ZOOM_STEP)}
        type="button"
      >
        <Plus className="h-4 w-4" />
      </button>
      <button
        aria-label="Reset zoom"
        className="secondary-button h-9 w-9 p-0"
        disabled={value === 100}
        onClick={() => onChange(100)}
        type="button"
      >
        <RotateCcw className="h-4 w-4" />
      </button>
      <span className="min-w-[52px] text-center text-sm font-semibold text-zinc-600 dark:text-zinc-300">
        {value}%
      </span>
    </div>
  );
}

export function WorkspaceCanvas({
  children,
  className,
  summary,
  toolbar,
}: {
  children: ReactNode;
  className?: string;
  summary?: ReactNode;
  toolbar?: ReactNode;
}) {
  return (
    <section className={["min-w-0 space-y-3", className ?? ""].join(" ")}>
      {toolbar ? (
        <div className="rounded-lg border border-zinc-200 bg-white px-3 py-3 dark:border-white/10 dark:bg-zinc-900 sm:px-4">
          {toolbar}
        </div>
      ) : null}
      {summary}
      <div className="min-w-0 overflow-visible">{children}</div>
    </section>
  );
}
