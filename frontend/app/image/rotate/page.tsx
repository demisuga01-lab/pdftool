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
    key: "quick-rotate",
    label: "Quick Rotate",
    render: (settings, update) => (
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: RotateCcw, label: "Rotate 90° CCW" },
          { icon: RotateCw, label: "Rotate 90° CW" },
          { icon: FlipHorizontal2, label: "Flip Horizontal" },
          { icon: FlipVertical2, label: "Flip Vertical" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              className="flex h-20 flex-col items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              key={item.label}
              onClick={() => {
                if (item.label === "Rotate 90° CCW") {
                  update("angle", settings.angle - 90);
                } else if (item.label === "Rotate 90° CW") {
                  update("angle", settings.angle + 90);
                } else if (item.label === "Flip Horizontal") {
                  update("flipHorizontal", !settings.flipHorizontal);
                } else {
                  update("flipVertical", !settings.flipVertical);
                }
              }}
              type="button"
            >
              <Icon className="h-8 w-8" />
              <span className="text-[11px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    ),
  },
  {
    key: "rotation",
    label: "Custom Angle",
    render: (settings, update) => (
      <div className="space-y-3">
        <input
          className="w-full accent-[#2563EB]"
          max={360}
          min={-360}
          onChange={(event) => update("angle", Number(event.target.value))}
          step={1}
          type="range"
          value={settings.angle}
        />
        <div className="space-y-1.5">
          <label className="block text-[13px] text-slate-700">Angle</label>
          <input
            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
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
    key: "rotation-presets",
    label: "Presets",
    render: (settings, update) => (
      <div className="grid grid-cols-3 gap-2">
          {[
            { delta: 90, label: "90 CW", icon: RotateCwIcon },
            { delta: 180, label: "180", icon: RotateCwIcon },
            { delta: -90, label: "90 CCW", icon: RotateCcwIcon },
          ].map((option) => {
            const Icon = option.icon;
            return (
              <button
                className="flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 text-[14px] text-slate-700"
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
      description="Rotate and flip images with a live preview, then export in the format that fits the output."
      downloadFilename={(file, settings) => {
        const base = settings.outputFilename.trim() || slugifyBaseName(file.name);
        const extension =
          settings.format === "same" ? file.name.split(".").pop() ?? "png" : settings.format === "jpeg" ? "jpg" : settings.format;
        return `${base}-rotated.${extension}`;
      }}
      emptyDescription="Upload an image to rotate it with a live workspace preview."
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
      renderCenter={({ file, preview, settings, update }) => (
        <PreviewStage className="mx-auto max-w-[760px]">
          <div className="p-4 sm:p-6">
            <div className="flex min-h-[520px] items-center justify-center rounded-2xl bg-[#F9FAFB] p-4 sm:p-8">
              {preview ? (
                <div className="relative">
                  <div className="absolute inset-x-0 top-0 z-10 flex justify-center">
                    <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/90 px-2 py-2 shadow-sm backdrop-blur">
                      <button className="rounded-full p-2 text-slate-700 hover:bg-slate-100" onClick={() => update("angle", settings.angle - 90)} type="button">
                        <RotateCcw className="h-4 w-4" />
                      </button>
                      <button className="rounded-full p-2 text-slate-700 hover:bg-slate-100" onClick={() => update("angle", settings.angle + 90)} type="button">
                        <RotateCw className="h-4 w-4" />
                      </button>
                      <button className="rounded-full p-2 text-slate-700 hover:bg-slate-100" onClick={() => update("flipHorizontal", !settings.flipHorizontal)} type="button">
                        <FlipHorizontal2 className="h-4 w-4" />
                      </button>
                      <button className="rounded-full p-2 text-slate-700 hover:bg-slate-100" onClick={() => update("flipVertical", !settings.flipVertical)} type="button">
                        <FlipVertical2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <img
                    alt={file.name}
                    className="max-h-[420px] max-w-full rounded-xl border border-[#E5E7EB] bg-white object-contain transition"
                    src={preview.dataUrl}
                    style={{
                      transform: `rotate(${settings.angle}deg) scaleX(${settings.flipHorizontal ? -1 : 1}) scaleY(${settings.flipVertical ? -1 : 1})`,
                    }}
                  />
                  <div className="absolute bottom-4 left-4 rounded-full bg-slate-900/80 px-3 py-1 text-[12px] text-white">
                    {settings.angle} deg
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </PreviewStage>
      )}
      sections={sections}
      title="Rotate Image"
    />
  );
}
