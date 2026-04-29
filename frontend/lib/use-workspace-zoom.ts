"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";

export const WORKSPACE_MIN_ZOOM = 25;
export const WORKSPACE_MAX_ZOOM = 500;
export const WORKSPACE_ZOOM_STEP = 25;

export type WorkspaceZoomMode = "fit" | "manual";
export type WorkspaceContentSize = { height: number; width: number };
type DragPanOptions = {
  enabled: boolean;
  ignoreSelectors?: string;
};

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

export function useDragPan(
  viewportRef: RefObject<HTMLElement | null>,
  { enabled, ignoreSelectors = "button,input,select,textarea,[role='button'],[data-draggable-overlay],[data-no-pan]" }: DragPanOptions,
) {
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) {
      return;
    }

    const state = {
      active: false,
      pointerId: -1,
      scrollLeft: 0,
      scrollTop: 0,
      startX: 0,
      startY: 0,
    };

    const restoreSelection = () => {
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };

    const endPan = () => {
      state.active = false;
      state.pointerId = -1;
      setDragging(false);
      restoreSelection();
    };

    const shouldIgnoreTarget = (eventTarget: EventTarget | null) => {
      if (!(eventTarget instanceof Element)) {
        return false;
      }
      return Boolean(eventTarget.closest(ignoreSelectors));
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (!enabled || shouldIgnoreTarget(event.target)) {
        return;
      }
      if (event.button !== 0 && event.pointerType !== "touch") {
        return;
      }
      const canPan = node.scrollWidth > node.clientWidth + 1 || node.scrollHeight > node.clientHeight + 1;
      if (!canPan) {
        return;
      }
      state.active = true;
      state.pointerId = event.pointerId;
      state.startX = event.clientX;
      state.startY = event.clientY;
      state.scrollLeft = node.scrollLeft;
      state.scrollTop = node.scrollTop;
      setDragging(true);
      document.body.style.userSelect = "none";
      document.body.style.cursor = "grabbing";
      node.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!enabled || !state.active || state.pointerId !== event.pointerId) {
        return;
      }
      const deltaX = event.clientX - state.startX;
      const deltaY = event.clientY - state.startY;
      node.scrollLeft = state.scrollLeft - deltaX;
      node.scrollTop = state.scrollTop - deltaY;
      event.preventDefault();
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (state.pointerId !== event.pointerId) {
        return;
      }
      endPan();
    };

    const handlePointerCancel = () => endPan();

    node.addEventListener("pointerdown", handlePointerDown);
    node.addEventListener("pointermove", handlePointerMove);
    node.addEventListener("pointerup", handlePointerUp);
    node.addEventListener("pointercancel", handlePointerCancel);
    node.addEventListener("lostpointercapture", handlePointerCancel);

    return () => {
      node.removeEventListener("pointerdown", handlePointerDown);
      node.removeEventListener("pointermove", handlePointerMove);
      node.removeEventListener("pointerup", handlePointerUp);
      node.removeEventListener("pointercancel", handlePointerCancel);
      node.removeEventListener("lostpointercapture", handlePointerCancel);
      restoreSelection();
    };
  }, [enabled, ignoreSelectors, viewportRef]);

  return {
    dragging,
    panCursor: enabled ? (dragging ? "grabbing" : "grab") : "default",
  };
}
