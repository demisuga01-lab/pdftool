"use client";

import { Image as ImageIcon, Move, Type, Upload, X } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";

import { EditorCanvas } from "@/components/workspace/WorkspaceShells";
import { clamp } from "@/lib/format";

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
  const dragRef = useRef<
    | { mode: "move"; startClientX: number; startClientY: number; startX: number; startY: number }
    | { mode: "resize"; startClientX: number; startWidth: number; startFontSize: number }
    | null
  >(null);
  const [selected, setSelected] = useState(true);
  const [naturalSize, setNaturalSize] = useState<{ height: number; width: number } | null>(null);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (!dragRef.current || !frameRef.current) {
        return;
      }

      const bounds = frameRef.current.getBoundingClientRect();
      if (bounds.width <= 0 || bounds.height <= 0) {
        return;
      }

      if (dragRef.current.mode === "move") {
        event.preventDefault();
        const deltaX = ((event.clientX - dragRef.current.startClientX) / bounds.width) * 100;
        const deltaY = ((event.clientY - dragRef.current.startClientY) / bounds.height) * 100;
        onChange({
          positionPreset: "custom",
          xPercent: clamp(Number(snapPercent(dragRef.current.startX + deltaX).toFixed(2)), 0, 100),
          yPercent: clamp(Number(snapPercent(dragRef.current.startY + deltaY).toFixed(2)), 0, 100),
        });
        return;
      }

      event.preventDefault();
      const deltaX = ((event.clientX - dragRef.current.startClientX) / bounds.width) * 100;
      if (state.type === "image") {
        onChange({ widthPercent: clamp(Number((dragRef.current.startWidth + deltaX).toFixed(2)), 4, 95) });
      } else {
        onChange({ fontSize: clamp(Math.round(dragRef.current.startFontSize + deltaX * 3), 10, 260) });
      }
    };

    const handlePointerUp = () => {
      dragRef.current = null;
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [onChange, state.type]);

  const startMove = (event: ReactPointerEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("textarea,input,button,label")) {
      return;
    }
    event.preventDefault();
    setSelected(true);
    dragRef.current = {
      mode: "move",
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: state.xPercent,
      startY: state.yPercent,
    };
  };

  const startResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setSelected(true);
    dragRef.current = {
      mode: "resize",
      startClientX: event.clientX,
      startFontSize: state.fontSize,
      startWidth: state.widthPercent,
    };
  };

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
      pageCount={pageCount}
      selected={selected}
      setNaturalSize={setNaturalSize}
      setSelected={setSelected}
      startMove={startMove}
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
  pageCount,
  selected,
  setNaturalSize,
  setSelected,
  startMove,
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
  pageCount?: number;
  selected: boolean;
  setNaturalSize: (size: { height: number; width: number } | null) => void;
  setSelected: (selected: boolean) => void;
  startMove: (event: ReactPointerEvent<HTMLElement>) => void;
  startResize: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  state: WatermarkEditorState;
  tilePreview: boolean;
}) {
  return (
    <EditorCanvas
      contentSize={naturalSize}
      footer={
        pageCount && pageCount > 1 && onPageChange ? (
          <div className="flex gap-3 overflow-x-auto py-1">
            {Array.from({ length: pageCount }, (_, index) => index + 1).map((page) => (
              <button
                className={[
                  "h-10 min-w-10 rounded-lg border px-3 text-sm font-semibold",
                  currentPage === page
                    ? "border-[#2563EB] bg-[#EFF6FF] text-[#2563EB] dark:border-blue-400 dark:bg-blue-500/10 dark:text-blue-300"
                    : "border-slate-200 bg-white text-slate-600 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300",
                ].join(" ")}
                key={page}
                onClick={() => onPageChange(page)}
                type="button"
              >
                {page}
              </button>
            ))}
          </div>
        ) : null
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
                selected ? "ring-2 ring-[#2563EB] ring-offset-2 ring-offset-white dark:ring-blue-400 dark:ring-offset-slate-950" : "",
              ].join(" ")}
              onKeyDown={nudge}
              onPointerDown={startMove}
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
                  <label className="flex min-h-24 min-w-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[#2563EB] bg-white/90 px-4 py-3 text-sm font-semibold text-[#2563EB] dark:bg-slate-900/90 dark:text-blue-300">
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
                  <span className="absolute -left-3 -top-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#2563EB] text-white shadow">
                    <Move className="h-3.5 w-3.5" />
                  </span>
                  <button
                    aria-label="Resize watermark"
                    className="absolute -bottom-3 -right-3 h-7 w-7 rounded-full border-2 border-[#2563EB] bg-white shadow dark:bg-slate-900"
                    onPointerDown={startResize}
                    type="button"
                  />
                  {state.type === "image" && asset && onRemoveAsset ? (
                    <button
                      aria-label="Remove watermark image"
                      className="absolute -right-3 -top-3 inline-flex h-7 w-7 items-center justify-center rounded-full border border-rose-200 bg-white text-rose-600 shadow dark:border-rose-400/30 dark:bg-slate-900"
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
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Watermark type</p>
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
                  state.type === option.value ? "border-[#2563EB] bg-[#EFF6FF] text-[#2563EB] dark:border-blue-400 dark:bg-blue-500/10 dark:text-blue-300" : "border-slate-200 bg-white text-slate-600 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300",
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
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Text presets</p>
          <div className="flex flex-wrap gap-2">
            {textWatermarkPresets.map((preset) => (
              <button
                className="min-h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300"
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
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Position presets</p>
        <div className="grid grid-cols-2 gap-2">
          {positionPresets.map((preset) => (
            <button
              className={[
                "min-h-10 rounded-lg border px-3 text-sm font-medium",
                state.positionPreset === preset.value ? "border-[#2563EB] bg-[#EFF6FF] text-[#2563EB] dark:border-blue-400 dark:bg-blue-500/10 dark:text-blue-300" : "border-slate-200 bg-white text-slate-600 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300",
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
