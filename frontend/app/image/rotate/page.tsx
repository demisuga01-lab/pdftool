"use client";

import { FlipHorizontal2, FlipVertical2, RotateCcw, RotateCw } from "lucide-react";

import type { ControlSection } from "@/components/workspace/Controls";
import { RotateCcwIcon, RotateCwIcon } from "@/components/icons/SiteIcons";
import { SingleImageWorkspacePage, PreviewStage } from "@/components/workspace/WorkspacePageBuilders";
import { slugifyBaseName } from "@/lib/format";

type RotateSettings = {
  angle: number;
  autoCrop: boolean;
  background: "transparent" | "white" | "black" | "custom";
  backgroundColor: string;
  expandCanvas: boolean;
  flipHorizontal: boolean;
  flipVertical: boolean;
  format: "same" | "png" | "jpeg";
  outputFilename: string;
  quality: number;
};

const sections: Array<ControlSection<RotateSettings>> = [
  {
    key: "rotation",
    label: "Rotation",
    render: (settings, update) => (
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {[
            { delta: -90, label: "90° CCW", icon: RotateCcwIcon },
            { delta: 180, label: "180°", icon: RotateCwIcon },
            { delta: 90, label: "90° CW", icon: RotateCwIcon },
          ].map((option) => {
            const Icon = option.icon;
            return (
              <button
                className="flex h-10 items-center justify-center gap-1.5 rounded-lg border border-slate-200 text-[13px] font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-white/5"
                key={option.label}
                onClick={() => update("angle", settings.angle + option.delta)}
                type="button"
              >
                <Icon className="h-4 w-4" />
                {option.label}
              </button>
            );
          })}
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <label className="block text-[13px] font-medium text-slate-700">Custom angle</label>
            <span className="text-sm font-medium text-slate-500">{settings.angle}°</span>
          </div>
          <input
            className="field-range"
            max={360}
            min={-360}
            onChange={(event) => update("angle", Number(event.target.value))}
            step={1}
            type="range"
            value={settings.angle}
          />
          <input
            className="field-input"
            max={360}
            min={-360}
            onChange={(event) => update("angle", Number(event.target.value))}
            type="number"
            value={settings.angle}
          />
        </div>
      </div>
    ),
  },
  {
    key: "flip",
    label: "Flip",
    fields: [
      { key: "flipHorizontal", label: "Flip horizontal", type: "toggle" },
      { key: "flipVertical", label: "Flip vertical", type: "toggle" },
    ],
  },
  {
    key: "background",
    label: "Background",
    fields: [
      {
        key: "background",
        label: "Background color",
        type: "select",
        options: [
          { label: "Transparent", value: "transparent" },
          { label: "White", value: "white" },
          { label: "Black", value: "black" },
          { label: "Custom", value: "custom" },
        ],
      },
      { key: "backgroundColor", label: "Custom color", type: "color", show: (settings) => settings.background === "custom" },
      { key: "expandCanvas", label: "Expand canvas to fit", type: "toggle" },
      { key: "autoCrop", label: "Auto-crop empty corners", type: "toggle" },
    ],
  },
  {
    key: "output",
    label: "Output",
    fields: [
      {
        key: "format",
        label: "Format",
        type: "select",
        options: [
          { label: "Same as input", value: "same" },
          { label: "PNG", value: "png" },
          { label: "JPEG", value: "jpeg" },
        ],
      },
      { key: "quality", label: "Quality", type: "slider", min: 1, max: 100, show: (settings) => settings.format === "jpeg" },
      { key: "outputFilename", label: "Output filename", type: "text", placeholder: "image-rotated" },
    ],
  },
];

export default function ImageRotatePage() {
  return (
    <SingleImageWorkspacePage<RotateSettings>
      buildFormData={({ file, settings }) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("angle", String(settings.angle));
        formData.append("flip_horizontal", String(settings.flipHorizontal));
        formData.append("flip_vertical", String(settings.flipVertical));
        formData.append("expand_canvas", String(settings.expandCanvas));
        formData.append("background", settings.background === "custom" ? settings.backgroundColor : settings.background === "white" ? "#ffffff" : settings.background === "black" ? "#000000" : "#00000000");
        formData.append("auto_crop", String(settings.autoCrop));
        formData.append("output_format", settings.format === "same" ? "auto" : settings.format);
        formData.append("output_filename", settings.outputFilename.trim());
        return formData;
      }}
      description="Rotate, flip, and choose a background color. Preview updates in real time."
      downloadFilename={(file, settings) => {
        const base = settings.outputFilename.trim() || slugifyBaseName(file.name);
        const extension =
          settings.format === "same" ? file.name.split(".").pop() ?? "png" : settings.format === "jpeg" ? "jpg" : settings.format;
        return `${base}-rotated.${extension}`;
      }}
      emptyDescription="Upload an image to rotate or flip it."
      endpoint="image/rotate"
      initialSettings={{
        angle: 0,
        autoCrop: false,
        background: "transparent",
        backgroundColor: "#ffffff",
        expandCanvas: true,
        flipHorizontal: false,
        flipVertical: false,
        format: "same",
        outputFilename: "",
        quality: 85,
      }}
      layoutKind="editor"
      renderCenter={({ file, preview, settings, update }) => (
        <PreviewStage className="mx-auto max-w-[760px]">
          <div className="flex items-center justify-between gap-3 border-b border-[#E5E7EB] px-4 py-3">
            <span className="text-sm font-medium text-slate-500">
              {settings.angle !== 0 ? `${settings.angle}°` : "No rotation"}
              {settings.flipHorizontal ? " · Flip H" : ""}
              {settings.flipVertical ? " · Flip V" : ""}
            </span>
            <div className="flex items-center gap-1">
              <button
                aria-label="Rotate 90° counter-clockwise"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-white/5"
                onClick={() => update("angle", settings.angle - 90)}
                type="button"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                aria-label="Rotate 90° clockwise"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-white/5"
                onClick={() => update("angle", settings.angle + 90)}
                type="button"
              >
                <RotateCw className="h-4 w-4" />
              </button>
              <button
                aria-label="Flip horizontal"
                className={[
                  "inline-flex h-9 w-9 items-center justify-center rounded-lg border text-slate-600",
                  settings.flipHorizontal ? "border-[#2563EB] bg-[#EFF6FF] text-[#2563EB] dark:border-blue-400 dark:bg-blue-500/10 dark:text-blue-300" : "border-slate-200 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-white/5",
                ].join(" ")}
                onClick={() => update("flipHorizontal", !settings.flipHorizontal)}
                type="button"
              >
                <FlipHorizontal2 className="h-4 w-4" />
              </button>
              <button
                aria-label="Flip vertical"
                className={[
                  "inline-flex h-9 w-9 items-center justify-center rounded-lg border text-slate-600",
                  settings.flipVertical ? "border-[#2563EB] bg-[#EFF6FF] text-[#2563EB] dark:border-blue-400 dark:bg-blue-500/10 dark:text-blue-300" : "border-slate-200 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-white/5",
                ].join(" ")}
                onClick={() => update("flipVertical", !settings.flipVertical)}
                type="button"
              >
                <FlipVertical2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="flex min-h-[min(55vh,420px)] items-center justify-center overflow-hidden bg-[#F3F4F6] p-4 dark:bg-slate-950">
            {preview ? (
              <img
                alt={file.name}
                className="max-h-[min(52vh,400px)] max-w-full rounded-lg border border-[#E5E7EB] bg-white object-contain transition duration-150 dark:border-white/10"
                src={preview.dataUrl}
                style={{
                  transform: `rotate(${settings.angle}deg) scaleX(${settings.flipHorizontal ? -1 : 1}) scaleY(${settings.flipVertical ? -1 : 1})`,
                }}
              />
            ) : null}
          </div>
        </PreviewStage>
      )}
      sections={sections}
      title="Rotate Image"
    />
  );
}
