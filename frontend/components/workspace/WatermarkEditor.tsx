"use client";

import { Crosshair, Image as ImageIcon, Maximize2, Minimize2, Move, RotateCcw, RotateCw, Trash2, Type, Upload, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";

import { EditorCanvas } from "@/components/workspace/WorkspaceShells";
import { clamp } from "@/lib/format";
import { INTERACTIVE_PAN_GUARD_SELECTORS } from "@/lib/use-workspace-zoom";

/**
 * Mobile gesture priority (also the order in which the watermark overlay
 * dispatches gestures):
 *   1. Two pointers down on the overlay → pinch-resize the watermark.
 *   2. One pointer down on the overlay  → drag/move the watermark.
 *   3. Pointer down on the empty canvas → handled by the canvas pan layer
 *      (only when zoomed past Fit), since this overlay stops events.
 *   4. Pointer down outside the canvas  → normal page scroll.
 *
 * The overlay sets `touch-action: none` and uses pointer capture so the
 * browser doesn't try to scroll the page while the user is editing the
 * watermark, and we can keep tracking pointers even if a finger drifts
 * outside the overlay's bounding box.
 */
const PINCH_MIN_DISTANCE_PX = 4;
const IMAGE_WIDTH_MIN_PERCENT = 4;
const IMAGE_WIDTH_MAX_PERCENT = 95;
const TEXT_FONT_MIN_PX = 10;
const TEXT_FONT_MAX_PX = 260;

export type WatermarkKind = "text" | "image";

export type WatermarkApplyMode = "all" | "current" | "selected" | "range";

export type WatermarkPositionPreset =
  | "custom"
  | "center"
  | "top-left"
  | "top-center"
  | "top-right"
  | "middle-left"
  | "middle-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right"
  | "diagonal-center"
  | "tiled";

export type WatermarkEditorState = {
  applyMode: WatermarkApplyMode;
  bold: boolean;
  color: string;
  fontFamily: string;
  fontSize: number;
  italic: boolean;
  opacity: number;
  pageRange: string;
  positionPreset: WatermarkPositionPreset;
  rotation: number;
  selectedPages: string;
  text: string;
  type: WatermarkKind;
  widthPercent: number;
  xPercent: number;
  yPercent: number;
};

export type UploadedWatermarkAsset = {
  fileId?: string;
  name: string;
  src: string;
};

const positionPresets: Array<{ label: string; value: WatermarkPositionPreset; x: number; y: number; rotation?: number }> = [
  { label: "Center", value: "center", x: 50, y: 50 },
  { label: "Top left", value: "top-left", x: 18, y: 16 },
  { label: "Top center", value: "top-center", x: 50, y: 16 },
  { label: "Top right", value: "top-right", x: 82, y: 16 },
  { label: "Middle left", value: "middle-left", x: 18, y: 50 },
  { label: "Middle right", value: "middle-right", x: 82, y: 50 },
  { label: "Bottom left", value: "bottom-left", x: 18, y: 84 },
  { label: "Bottom center", value: "bottom-center", x: 50, y: 84 },
  { label: "Bottom right", value: "bottom-right", x: 82, y: 84 },
  { label: "Diagonal center", value: "diagonal-center", x: 50, y: 50, rotation: -35 },
  { label: "Tiled", value: "tiled", x: 50, y: 50, rotation: -35 },
];

export const textWatermarkPresets = ["Confidential", "Draft", "Approved", "Sample", "Copy", "Paid", "Invoice", "Custom"];

function snapPercent(value: number) {
  for (const target of [0, 10, 50, 90, 100]) {
    if (Math.abs(value - target) <= 1.5) {
      return target;
    }
  }
  return value;
}

export function applyWatermarkPositionPreset(
  preset: WatermarkPositionPreset,
  update: (patch: Partial<WatermarkEditorState>) => void,
) {
  const found = positionPresets.find((entry) => entry.value === preset);
  if (!found) {
    update({ positionPreset: "custom" });
    return;
  }
  update({
    positionPreset: preset,
    rotation: found.rotation ?? 0,
    xPercent: found.x,
    yPercent: found.y,
  });
}

type PointerMap = Map<number, { x: number; y: number }>;

type WatermarkGesture =
  | { mode: "drag"; startClientX: number; startClientY: number; startX: number; startY: number }
  | {
      mode: "pinch";
      startDistance: number;
      startWidthPercent: number;
      startFontSize: number;
      startXPercent: number;
      startYPercent: number;
      startCenterX: number;
      startCenterY: number;
    };

function pinchDistance(pts: Array<{ x: number; y: number }>): number {
  if (pts.length < 2) {
    return 0;
  }
  return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
}

function pinchCenter(pts: Array<{ x: number; y: number }>): { x: number; y: number } {
  if (pts.length < 2) {
    return pts[0] ?? { x: 0, y: 0 };
  }
  return { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
}

export function WatermarkEditor({
  asset,
  baseAlt,
  baseSrc,
  currentPage,
  onAssetSelected,
  onChange,
  onPageChange,
  onRemoveAsset,
  pageCount,
  state,
}: {
  asset?: UploadedWatermarkAsset | null;
  baseAlt: string;
  baseSrc: string;
  currentPage?: number;
  onAssetSelected: (files: File[]) => void;
  onChange: (patch: Partial<WatermarkEditorState>) => void;
  onPageChange?: (page: number) => void;
  onRemoveAsset?: () => void;
  pageCount?: number;
  state: WatermarkEditorState;
}) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const pointersRef = useRef<PointerMap>(new Map());
  const gestureRef = useRef<WatermarkGesture | null>(null);
  const stateRef = useRef(state);
  const onChangeRef = useRef(onChange);
  const [selected, setSelected] = useState(true);
  const [naturalSize, setNaturalSize] = useState<{ height: number; width: number } | null>(null);

  // Keep refs in sync so pointer handlers always read current state without
  // having to be re-bound on every render (which would lose pointer capture).
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Attach pointer handlers directly to the overlay element so we can keep
  // tracking pointers via setPointerCapture even if fingers drift outside the
  // overlay's bounding box. This also lets a desktop resize-handle button
  // override the gesture by stopping propagation.
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) {
      return;
    }

    const isInteractiveTarget = (target: EventTarget | null) =>
      target instanceof Element &&
      target !== overlay &&
      Boolean(target.closest(`${INTERACTIVE_PAN_GUARD_SELECTORS},[data-resize-handle]`));

    const startGesture = () => {
      const frame = frameRef.current;
      if (!frame) {
        return;
      }

      const pts = Array.from(pointersRef.current.values());
      if (pts.length >= 2) {
        const distance = pinchDistance(pts);
        const center = pinchCenter(pts);
        if (distance < PINCH_MIN_DISTANCE_PX) {
          return;
        }
        const current = stateRef.current;
        gestureRef.current = {
          mode: "pinch",
          startDistance: distance,
          startWidthPercent: current.widthPercent,
          startFontSize: current.fontSize,
          startXPercent: current.xPercent,
          startYPercent: current.yPercent,
          startCenterX: center.x,
          startCenterY: center.y,
        };
      } else if (pts.length === 1) {
        const [point] = pts;
        const current = stateRef.current;
        gestureRef.current = {
          mode: "drag",
          startClientX: point.x,
          startClientY: point.y,
          startX: current.xPercent,
          startY: current.yPercent,
        };
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (isInteractiveTarget(event.target)) {
        return;
      }
      // Capture this pointer so subsequent move/up events route here even if
      // the finger leaves the overlay rectangle.
      try {
        overlay.setPointerCapture(event.pointerId);
      } catch {
        // Some browsers (notably very old Safari) throw if capture is unsupported.
      }
      pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      setSelected(true);
      startGesture();
      event.preventDefault();
      event.stopPropagation();
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!pointersRef.current.has(event.pointerId)) {
        return;
      }
      pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

      const frame = frameRef.current;
      if (!frame) {
        return;
      }
      const bounds = frame.getBoundingClientRect();
      if (bounds.width <= 0 || bounds.height <= 0) {
        return;
      }

      const gesture = gestureRef.current;
      const onChangeNow = onChangeRef.current;
      const stateNow = stateRef.current;

      if (gesture?.mode === "pinch" && pointersRef.current.size >= 2) {
        const pts = Array.from(pointersRef.current.values()).slice(0, 2);
        const distance = pinchDistance(pts);
        if (distance < PINCH_MIN_DISTANCE_PX || gesture.startDistance < PINCH_MIN_DISTANCE_PX) {
          return;
        }
        const scale = distance / gesture.startDistance;
        if (stateNow.type === "image") {
          onChangeNow({
            positionPreset: "custom",
            widthPercent: clamp(
              Number((gesture.startWidthPercent * scale).toFixed(2)),
              IMAGE_WIDTH_MIN_PERCENT,
              IMAGE_WIDTH_MAX_PERCENT,
            ),
          });
        } else {
          onChangeNow({
            positionPreset: "custom",
            fontSize: clamp(Math.round(gesture.startFontSize * scale), TEXT_FONT_MIN_PX, TEXT_FONT_MAX_PX),
          });
        }
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if (gesture?.mode === "drag" && pointersRef.current.size === 1) {
        const deltaX = ((event.clientX - gesture.startClientX) / bounds.width) * 100;
        const deltaY = ((event.clientY - gesture.startClientY) / bounds.height) * 100;
        onChangeNow({
          positionPreset: "custom",
          xPercent: clamp(Number(snapPercent(gesture.startX + deltaX).toFixed(2)), 0, 100),
          yPercent: clamp(Number(snapPercent(gesture.startY + deltaY).toFixed(2)), 0, 100),
        });
        event.preventDefault();
        event.stopPropagation();
        return;
      }
    };

    const releasePointer = (pointerId: number) => {
      pointersRef.current.delete(pointerId);
      try {
        if (overlay.hasPointerCapture(pointerId)) {
          overlay.releasePointerCapture(pointerId);
        }
      } catch {
        // Ignore — some browsers don't expose hasPointerCapture.
      }
      // If a finger lifts mid-pinch we drop the gesture entirely; the user can
      // place fingers down again to start a fresh drag/pinch. This is simpler
      // and safer than trying to morph pinch → drag mid-stream.
      if (pointersRef.current.size === 0 || gestureRef.current?.mode === "pinch") {
        gestureRef.current = null;
      } else if (pointersRef.current.size === 1 && gestureRef.current?.mode === "drag") {
        // Drag was tracking a different finger — restart from the surviving one.
        startGesture();
      }
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (!pointersRef.current.has(event.pointerId)) {
        return;
      }
      releasePointer(event.pointerId);
    };

    const handlePointerCancel = (event: PointerEvent) => {
      releasePointer(event.pointerId);
    };

    overlay.addEventListener("pointerdown", handlePointerDown);
    overlay.addEventListener("pointermove", handlePointerMove);
    overlay.addEventListener("pointerup", handlePointerUp);
    overlay.addEventListener("pointercancel", handlePointerCancel);
    overlay.addEventListener("lostpointercapture", handlePointerCancel);

    return () => {
      overlay.removeEventListener("pointerdown", handlePointerDown);
      overlay.removeEventListener("pointermove", handlePointerMove);
      overlay.removeEventListener("pointerup", handlePointerUp);
      overlay.removeEventListener("pointercancel", handlePointerCancel);
      overlay.removeEventListener("lostpointercapture", handlePointerCancel);
      pointersRef.current.clear();
      gestureRef.current = null;
    };
  }, []);

  const startResize = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      // Desktop precision resize handle. Stop propagation so the overlay's
      // pointerdown handler does not also fire and start a drag.
      event.preventDefault();
      event.stopPropagation();
      setSelected(true);

      const startClientX = event.clientX;
      const startWidth = state.widthPercent;
      const startFontSize = state.fontSize;

      const handleMove = (moveEvent: PointerEvent) => {
        moveEvent.preventDefault();
        const frame = frameRef.current;
        if (!frame) {
          return;
        }
        const bounds = frame.getBoundingClientRect();
        if (bounds.width <= 0) {
          return;
        }
        const deltaX = ((moveEvent.clientX - startClientX) / bounds.width) * 100;
        if (state.type === "image") {
          onChange({
            widthPercent: clamp(
              Number((startWidth + deltaX).toFixed(2)),
              IMAGE_WIDTH_MIN_PERCENT,
              IMAGE_WIDTH_MAX_PERCENT,
            ),
          });
        } else {
          onChange({
            fontSize: clamp(Math.round(startFontSize + deltaX * 3), TEXT_FONT_MIN_PX, TEXT_FONT_MAX_PX),
          });
        }
      };

      const handleUp = () => {
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
        window.removeEventListener("pointercancel", handleUp);
      };

      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
      window.addEventListener("pointercancel", handleUp);
    },
    [onChange, state.type, state.widthPercent, state.fontSize],
  );

  const nudge = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
      return;
    }
    event.preventDefault();
    const delta = event.shiftKey ? 5 : 1;
    onChange({
      positionPreset: "custom",
      xPercent: clamp(state.xPercent + (event.key === "ArrowLeft" ? -delta : event.key === "ArrowRight" ? delta : 0), 0, 100),
      yPercent: clamp(state.yPercent + (event.key === "ArrowUp" ? -delta : event.key === "ArrowDown" ? delta : 0), 0, 100),
    });
  };

  const overlayCommon = {
    left: `${state.xPercent}%`,
    opacity: state.opacity / 100,
    top: `${state.yPercent}%`,
    transform: `translate(-50%, -50%) rotate(${state.rotation}deg)`,
  };

  const tilePreview = state.positionPreset === "tiled";

  return (
    <WatermarkEditorCanvas
      asset={asset}
      baseAlt={baseAlt}
      baseSrc={baseSrc}
      currentPage={currentPage}
      frameRef={frameRef}
      naturalSize={naturalSize}
      onAssetSelected={onAssetSelected}
      onChange={onChange}
      onPageChange={onPageChange}
      onRemoveAsset={onRemoveAsset}
      overlayRef={overlayRef}
      pageCount={pageCount}
      selected={selected}
      setNaturalSize={setNaturalSize}
      setSelected={setSelected}
      startResize={startResize}
      state={state}
      tilePreview={tilePreview}
      overlayCommon={overlayCommon}
      nudge={nudge}
    />
  );
}

function WatermarkEditorCanvas({
  asset,
  baseAlt,
  baseSrc,
  currentPage,
  frameRef,
  naturalSize,
  nudge,
  onAssetSelected,
  onChange,
  onPageChange,
  onRemoveAsset,
  overlayCommon,
  overlayRef,
  pageCount,
  selected,
  setNaturalSize,
  setSelected,
  startResize,
  state,
  tilePreview,
}: {
  asset?: UploadedWatermarkAsset | null;
  baseAlt: string;
  baseSrc: string;
  currentPage?: number;
  frameRef: React.MutableRefObject<HTMLDivElement | null>;
  naturalSize: { height: number; width: number } | null;
  nudge: (event: KeyboardEvent<HTMLDivElement>) => void;
  onAssetSelected: (files: File[]) => void;
  onChange: (patch: Partial<WatermarkEditorState>) => void;
  onPageChange?: (page: number) => void;
  onRemoveAsset?: () => void;
  overlayCommon: { left: string; opacity: number; top: string; transform: string };
  overlayRef: React.MutableRefObject<HTMLDivElement | null>;
  pageCount?: number;
  selected: boolean;
  setNaturalSize: (size: { height: number; width: number } | null) => void;
  setSelected: (selected: boolean) => void;
  startResize: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  state: WatermarkEditorState;
  tilePreview: boolean;
}) {
  return (
    <EditorCanvas
      contentSize={naturalSize}
      footer={
        <div className="space-y-3">
          {selected ? (
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <button
                aria-label="Make watermark smaller"
                className="secondary-button min-h-11 gap-2 px-3 text-sm"
                onClick={() => onChange({ widthPercent: clamp(state.widthPercent - 4, 4, 95), fontSize: clamp(state.fontSize - 6, 10, 260) })}
                type="button"
              >
                <Minimize2 className="h-4 w-4" />
                Smaller
              </button>
              <button
                aria-label="Make watermark bigger"
                className="secondary-button min-h-11 gap-2 px-3 text-sm"
                onClick={() => onChange({ widthPercent: clamp(state.widthPercent + 4, 4, 95), fontSize: clamp(state.fontSize + 6, 10, 260) })}
                type="button"
              >
                <Maximize2 className="h-4 w-4" />
                Bigger
              </button>
              <button
                aria-label="Rotate watermark left"
                className="secondary-button min-h-11 gap-2 px-3 text-sm"
                onClick={() => onChange({ positionPreset: "custom", rotation: state.rotation - 15 })}
                type="button"
              >
                <RotateCcw className="h-4 w-4" />
                Rotate left
              </button>
              <button
                aria-label="Rotate watermark right"
                className="secondary-button min-h-11 gap-2 px-3 text-sm"
                onClick={() => onChange({ positionPreset: "custom", rotation: state.rotation + 15 })}
                type="button"
              >
                <RotateCw className="h-4 w-4" />
                Rotate right
              </button>
              <button
                aria-label="Center watermark"
                className="secondary-button min-h-11 gap-2 px-3 text-sm"
                onClick={() => onChange({ positionPreset: "center", rotation: 0, xPercent: 50, yPercent: 50 })}
                type="button"
              >
                <Crosshair className="h-4 w-4" />
                Center
              </button>
              <button
                aria-label="Reset watermark"
                className="secondary-button min-h-11 gap-2 px-3 text-sm"
                onClick={() => onChange({ fontSize: 72, positionPreset: "center", rotation: 0, widthPercent: 28, xPercent: 50, yPercent: 50 })}
                type="button"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </button>
              {state.type === "image" && asset && onRemoveAsset ? (
                <button
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 text-sm font-semibold text-rose-700 transition hover:border-rose-300 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-300"
                  onClick={onRemoveAsset}
                  type="button"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove logo
                </button>
              ) : null}
            </div>
          ) : null}

          {pageCount && pageCount > 1 && onPageChange ? (
            <div className="flex gap-3 overflow-x-auto py-1">
              {Array.from({ length: pageCount }, (_, index) => index + 1).map((page) => (
                <button
                  className={[
                    "h-10 min-w-10 rounded-lg border px-3 text-sm font-semibold",
                    currentPage === page
                      ? "border-[#059669] bg-[#ECFDF5] text-[#059669] dark:border-emerald-400 dark:bg-emerald-500/10 dark:text-emerald-300"
                      : "border-slate-200 bg-white text-slate-600 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300",
                  ].join(" ")}
                  key={page}
                  onClick={() => onPageChange(page)}
                  type="button"
                >
                  {page}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      }
      toolbar={
        <label className="secondary-button min-h-10 cursor-pointer gap-2 px-3 text-sm">
          <Upload className="h-4 w-4" />
          Logo
          <input
            accept="image/*"
            className="hidden"
            onChange={(event) => onAssetSelected(Array.from(event.target.files ?? []))}
            type="file"
          />
        </label>
      }
    >
      {({ effectiveZoom, mode }) => {
        const displayWidth = naturalSize ? (naturalSize.width * effectiveZoom) / 100 : undefined;
        const displayHeight = naturalSize ? (naturalSize.height * effectiveZoom) / 100 : undefined;

        return (
          <div
            className="preview-checkerboard relative shrink-0 overflow-visible rounded-lg"
            ref={frameRef}
            style={
              displayWidth && displayHeight
                ? { height: displayHeight, width: displayWidth }
                : mode === "fit"
                  ? { maxHeight: "100%", maxWidth: "100%" }
                  : undefined
            }
          >
            <img
              alt={baseAlt}
              className="block rounded-lg border border-slate-300 bg-white shadow-[0_14px_34px_rgba(15,23,42,0.12)]"
              draggable={false}
              onLoad={(event) => {
                if (event.currentTarget.naturalWidth > 0 && event.currentTarget.naturalHeight > 0) {
                  setNaturalSize({
                    height: event.currentTarget.naturalHeight,
                    width: event.currentTarget.naturalWidth,
                  });
                }
              }}
              src={baseSrc}
              style={
                displayWidth && displayHeight
                  ? {
                      height: displayHeight,
                      maxHeight: "none",
                      maxWidth: "none",
                      width: displayWidth,
                    }
                  : { maxHeight: "100%", maxWidth: "100%" }
              }
            />

            {tilePreview ? (
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                {Array.from({ length: 12 }, (_, index) => {
                  const x = 18 + (index % 4) * 22;
                  const y = 18 + Math.floor(index / 4) * 32;
                  return state.type === "image" && asset ? (
                    <img
                      alt=""
                      className="absolute max-w-none"
                      key={index}
                      src={asset.src}
                      style={{
                        left: `${x}%`,
                        opacity: state.opacity / 100,
                        top: `${y}%`,
                        transform: `translate(-50%, -50%) rotate(${state.rotation}deg)`,
                        width: `${Math.max(5, state.widthPercent * 0.7)}%`,
                      }}
                    />
                  ) : (
                    <span
                      className="absolute whitespace-nowrap font-semibold"
                      key={index}
                      style={{
                        color: state.color,
                        fontFamily: state.fontFamily,
                        fontSize: `${Math.max(12, state.fontSize * 0.65)}px`,
                        fontStyle: state.italic ? "italic" : "normal",
                        fontWeight: state.bold ? 800 : 600,
                        left: `${x}%`,
                        opacity: state.opacity / 100,
                        top: `${y}%`,
                        transform: `translate(-50%, -50%) rotate(${state.rotation}deg)`,
                      }}
                    >
                      {state.text || "Watermark"}
                    </span>
                  );
                })}
              </div>
            ) : null}

            <div
              className={[
                "absolute touch-none outline-none",
                selected ? "ring-2 ring-[#059669] ring-offset-2 ring-offset-white dark:ring-emerald-400 dark:ring-offset-zinc-950" : "",
              ].join(" ")}
              data-draggable-overlay
              data-no-pan
              onKeyDown={nudge}
              ref={overlayRef}
              role="button"
              style={state.type === "image" ? { ...overlayCommon, width: `${state.widthPercent}%` } : overlayCommon}
              tabIndex={0}
            >
              {state.type === "image" ? (
                asset ? (
                  <img
                    alt={asset.name}
                    className="block max-w-none rounded-sm"
                    draggable={false}
                    src={asset.src}
                    style={{ width: "100%" }}
                  />
                ) : (
                  <label className="flex min-h-24 min-w-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[#059669] bg-white/90 px-4 py-3 text-sm font-semibold text-[#059669] dark:bg-zinc-900/90 dark:text-emerald-300">
                    <ImageIcon className="h-5 w-5" />
                    Upload logo
                    <input
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => onAssetSelected(Array.from(event.target.files ?? []))}
                      type="file"
                    />
                  </label>
                )
              ) : (
                <textarea
                  aria-label="Watermark text"
                  className="min-h-[54px] min-w-[180px] resize-none overflow-hidden rounded-sm border border-white/50 bg-black/10 px-2 py-1 text-center leading-tight outline-none dark:border-white/20"
                  onChange={(event) => onChange({ text: event.target.value })}
                  onFocus={() => setSelected(true)}
                  spellCheck={false}
                  style={{
                    color: state.color,
                    fontFamily: state.fontFamily,
                    fontSize: `${state.fontSize}px`,
                    fontStyle: state.italic ? "italic" : "normal",
                    fontWeight: state.bold ? 800 : 600,
                    textShadow: "0 2px 12px rgba(0,0,0,0.25)",
                  }}
                  value={state.text}
                />
              )}

              {selected ? (
                <>
                  <span className="absolute -left-3 -top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#059669] text-white shadow">
                    <Move className="h-3.5 w-3.5" />
                  </span>
                  <button
                    aria-label="Resize watermark"
                    className="absolute -bottom-3 -right-3 hidden h-8 w-8 rounded-full border-2 border-[#059669] bg-white shadow dark:bg-zinc-900 sm:block"
                    data-resize-handle
                    onPointerDown={startResize}
                    type="button"
                  />
                  {state.type === "image" && asset && onRemoveAsset ? (
                    <button
                      aria-label="Remove watermark image"
                      className="absolute -right-3 -top-3 inline-flex h-7 w-7 items-center justify-center rounded-full border border-rose-200 bg-white text-rose-600 shadow dark:border-rose-400/30 dark:bg-zinc-900"
                      onClick={onRemoveAsset}
                      type="button"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </>
              ) : null}
            </div>
          </div>
        );
      }}
    </EditorCanvas>
  );
}

export function WatermarkPresetControls({
  onChange,
  state,
}: {
  onChange: (patch: Partial<WatermarkEditorState>) => void;
  state: WatermarkEditorState;
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-zinc-500">Watermark type</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon: Type, label: "Text", value: "text" as const },
            { icon: ImageIcon, label: "Image", value: "image" as const },
          ].map((option) => {
            const Icon = option.icon;
            return (
              <button
                className={[
                  "flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold",
                  state.type === option.value ? "border-[#059669] bg-[#ECFDF5] text-[#059669] dark:border-emerald-400 dark:bg-emerald-500/10 dark:text-emerald-300" : "border-slate-200 bg-white text-slate-600 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300",
                ].join(" ")}
                key={option.value}
                onClick={() => onChange({ type: option.value })}
                type="button"
              >
                <Icon className="h-4 w-4" />
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {state.type === "text" ? (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-zinc-500">Text presets</p>
          <div className="flex flex-wrap gap-2">
            {textWatermarkPresets.map((preset) => (
              <button
                className="min-h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300"
                key={preset}
                onClick={() => onChange({ text: preset === "Custom" ? state.text : preset })}
                type="button"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-zinc-500">Position presets</p>
        <div className="grid grid-cols-2 gap-2">
          {positionPresets.map((preset) => (
            <button
              className={[
                "min-h-10 rounded-lg border px-3 text-sm font-medium",
                state.positionPreset === preset.value ? "border-[#059669] bg-[#ECFDF5] text-[#059669] dark:border-emerald-400 dark:bg-emerald-500/10 dark:text-emerald-300" : "border-slate-200 bg-white text-slate-600 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300",
              ].join(" ")}
              key={preset.value}
              onClick={() => applyWatermarkPositionPreset(preset.value, onChange)}
              type="button"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
