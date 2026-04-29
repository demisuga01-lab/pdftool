"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export const WORKSPACE_MIN_ZOOM = 25;
export const WORKSPACE_MAX_ZOOM = 500;
export const WORKSPACE_ZOOM_STEP = 25;

export type WorkspaceZoomMode = "fit" | "manual";
export type WorkspaceContentSize = { height: number; width: number };

function normalizeDimension(value: number) {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function clampWorkspaceZoom(value: number): number {
  return Math.max(WORKSPACE_MIN_ZOOM, Math.min(WORKSPACE_MAX_ZOOM, Math.round(value)));
}

function calculateFitZoom(contentSize: WorkspaceContentSize | null, viewport: WorkspaceContentSize, padding: number) {
  if (!contentSize || contentSize.width <= 0 || contentSize.height <= 0) {
    return 100;
  }

  const usableWidth = Math.max(viewport.width - padding * 2, 1);
  const usableHeight = Math.max(viewport.height - padding * 2, 1);
  const widthZoom = (usableWidth / contentSize.width) * 100;
  const heightZoom = (usableHeight / contentSize.height) * 100;

  return clampWorkspaceZoom(Math.min(widthZoom, heightZoom));
}

export function useWorkspaceZoom({
  contentSize,
  fitPadding = 24,
  initialZoom = 100,
}: {
  contentSize?: WorkspaceContentSize | null;
  fitPadding?: number;
  initialZoom?: number;
} = {}) {
  const [fitMode, setFitMode] = useState(true);
  const [zoom, setZoom] = useState(clampWorkspaceZoom(initialZoom));
  const [viewportSize, setViewportSize] = useState<WorkspaceContentSize>({ height: 0, width: 0 });
  const viewportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) {
      return;
    }

    const updateViewport = () => {
      setViewportSize({
        height: normalizeDimension(node.clientHeight),
        width: normalizeDimension(node.clientWidth),
      });
    };

    updateViewport();

    const observer = new ResizeObserver(() => updateViewport());
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const safeContentSize = useMemo(
    () =>
      contentSize && normalizeDimension(contentSize.width) > 0 && normalizeDimension(contentSize.height) > 0
        ? { height: normalizeDimension(contentSize.height), width: normalizeDimension(contentSize.width) }
        : null,
    [contentSize],
  );

  const effectiveZoom = useMemo(
    () =>
      fitMode
        ? calculateFitZoom(safeContentSize, viewportSize, fitPadding)
        : clampWorkspaceZoom(zoom),
    [fitMode, fitPadding, safeContentSize, viewportSize, zoom],
  );

  const setManualZoom = useCallback(
    (nextZoom: number | ((current: number) => number)) => {
      setFitMode(false);
      setZoom((current) => {
        const baseZoom = fitMode ? effectiveZoom : current;
        const resolvedZoom = typeof nextZoom === "function" ? nextZoom(baseZoom) : nextZoom;
        return clampWorkspaceZoom(resolvedZoom);
      });
    },
    [effectiveZoom, fitMode],
  );

  const fit = useCallback(() => {
    setFitMode(true);
    viewportRef.current?.scrollTo({ left: 0, top: 0 });
  }, []);

  const reset = useCallback(() => {
    setFitMode(false);
    setZoom(100);
    viewportRef.current?.scrollTo({ left: 0, top: 0 });
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

  const label = useMemo(
    () => (fitMode ? "Fit" : `${clampWorkspaceZoom(zoom)}%`),
    [fitMode, zoom],
  );

  return {
    effectiveZoom,
    fit,
    fitMode,
    label,
    mode: fitMode ? ("fit" as const) : ("manual" as const),
    reset,
    setManualZoom,
    viewportRef,
    viewportSize,
    zoom,
    zoomByWheel,
    zoomIn,
    zoomOut,
  };
}
