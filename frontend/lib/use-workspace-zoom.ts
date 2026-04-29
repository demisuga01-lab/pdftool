"use client";

import { useCallback, useMemo, useRef, useState } from "react";

export const WORKSPACE_MIN_ZOOM = 25;
export const WORKSPACE_MAX_ZOOM = 500;
export const WORKSPACE_ZOOM_STEP = 25;

export type WorkspaceZoomMode = "fit" | "manual";

export function clampWorkspaceZoom(value: number): number {
  return Math.max(WORKSPACE_MIN_ZOOM, Math.min(WORKSPACE_MAX_ZOOM, Math.round(value)));
}

export function useWorkspaceZoom(initialZoom = 100) {
  const [mode, setMode] = useState<WorkspaceZoomMode>("fit");
  const [zoom, setZoom] = useState(clampWorkspaceZoom(initialZoom));
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const effectiveZoom = mode === "fit" ? 100 : zoom;

  const setManualZoom = useCallback((nextZoom: number | ((current: number) => number)) => {
    setMode("manual");
    setZoom((current) => clampWorkspaceZoom(typeof nextZoom === "function" ? nextZoom(current) : nextZoom));
  }, []);

  const fit = useCallback(() => {
    setMode("fit");
    scrollRef.current?.scrollTo({ left: 0, top: 0 });
  }, []);

  const reset = useCallback(() => {
    setMode("manual");
    setZoom(100);
    scrollRef.current?.scrollTo({ left: 0, top: 0 });
  }, []);

  const zoomIn = useCallback(() => {
    setManualZoom((current) => current + WORKSPACE_ZOOM_STEP);
  }, [setManualZoom]);

  const zoomOut = useCallback(() => {
    setManualZoom((current) => current - WORKSPACE_ZOOM_STEP);
  }, [setManualZoom]);

  const zoomByWheel = useCallback(
    (deltaY: number) => {
      setManualZoom((current) => current + (deltaY < 0 ? WORKSPACE_ZOOM_STEP : -WORKSPACE_ZOOM_STEP));
    },
    [setManualZoom],
  );

  const label = useMemo(() => (mode === "fit" ? "Fit" : `${zoom}%`), [mode, zoom]);

  return {
    effectiveZoom,
    fit,
    label,
    mode,
    reset,
    scrollRef,
    setManualZoom,
    zoom,
    zoomByWheel,
    zoomIn,
    zoomOut,
  };
}
