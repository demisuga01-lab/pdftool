"use client";

import type { ControlSection } from "@/components/workspace/Controls";
import { SingleImageWorkspacePage, PreviewStage } from "@/components/workspace/WorkspacePageBuilders";
import { formatDimensions, slugifyBaseName } from "@/lib/format";

type ResizeSettings = {
  allowUpscale: boolean;
  aspectRatio: "original" | "1:1" | "4:3" | "3:4" | "16:9" | "9:16" | "3:2" | "2:3" | "5:4" | "4:5" | "21:9" | "custom";
  background: "white" | "transparent" | "custom";
  backgroundColor: string;
  customRatioHeight: number;
  customRatioWidth: number;
  fit: "cover" | "contain" | "fill" | "stretch" | "inside";
  height: number;
  kernel: "lanczos3" | "lanczos2" | "cubic" | "linear" | "nearest";
  lockAspect: boolean;
  outputFilename: string;
  outputFormat: "auto" | "jpg" | "png" | "webp";
  percentage: number;
  presetSize: "640x480" | "800x600" | "1024x768" | "1280x720" | "1280x1024" | "1366x768" | "1600x900" | "1920x1080" | "2560x1440" | "3840x2160" | "instagram-post" | "instagram-story" | "youtube-thumbnail" | "x-post" | "facebook-cover" | "linkedin-cover" | "a4-300" | "a4-150" | "a3-300" | "letter-300" | "custom";
  quality: number;
  resizeMode: "pixels" | "percentage" | "preset" | "aspect-ratio" | "fit-box" | "custom";
  unit: "px" | "%";
  width: number;
  withoutEnlargement: boolean;
};

const sections: Array<ControlSection<ResizeSettings>> = [
  {
    key: "resize-mode",
    label: "Resize Mode",
    fields: [
      {
        key: "resizeMode",
        label: "Mode",
        type: "radioCards",
        options: [
          { label: "By pixels", description: "Set exact pixel dimensions", value: "pixels" },
          { label: "By percentage", description: "Scale from original size", value: "percentage" },
          { label: "By preset size", description: "Use a social or print preset", value: "preset" },
          { label: "By aspect ratio", description: "Calculate dimensions from a ratio", value: "aspect-ratio" },
          { label: "Fit inside box", description: "Constrain inside a target box", value: "fit-box" },
          { label: "Custom", description: "Enter any explicit width and height", value: "custom" },
        ],
      },
    ],
  },
  {
    key: "dimensions",
    label: "Dimensions",
    render: (settings, update) => (
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="block text-[13px] text-slate-700">Width</label>
          <input
            className="h-9 w-full rounded-md border border-slate-200 px-3 text-[14px] text-slate-700 outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-1"
            min={1}
            onChange={(event) => {
              const nextWidth = Number(event.target.value);
              update("width", nextWidth);
              if (settings.lockAspect && settings.width > 0) {
                update("height", Math.max(1, Math.round(nextWidth * (settings.height / settings.width))));
              }
            }}
            type="number"
            value={settings.width}
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-[13px] text-slate-700">Height</label>
          <input
            className="h-9 w-full rounded-md border border-slate-200 px-3 text-[14px] text-slate-700 outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-1"
            min={1}
            onChange={(event) => {
              const nextHeight = Number(event.target.value);
              update("height", nextHeight);
              if (settings.lockAspect && settings.height > 0) {
                update("width", Math.max(1, Math.round(nextHeight * (settings.width / settings.height))));
              }
            }}
            type="number"
            value={settings.height}
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-[13px] text-slate-700">Unit</label>
          <select
            className="field-input"
            onChange={(event) => update("unit", event.target.value as ResizeSettings["unit"])}
            value={settings.unit}
          >
            <option value="px">px</option>
            <option value="%">%</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="block text-[13px] text-slate-700">Percentage</label>
          <input
            className="field-input"
            min={1}
            onChange={(event) => update("percentage", Number(event.target.value))}
            type="number"
            value={settings.percentage}
          />
        </div>
        <div className="col-span-2 flex items-center justify-between rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2">
          <span className="text-[13px] text-slate-600">Lock aspect ratio</span>
          <button
            className={[
              "relative inline-flex h-6 w-11 items-center rounded-full transition",
              settings.lockAspect ? "bg-[#2563EB]" : "bg-slate-200",
            ].join(" ")}
            onClick={() => update("lockAspect", !settings.lockAspect)}
            type="button"
          >
            <span
              className={[
                "inline-block h-5 w-5 rounded-full bg-white transition",
                settings.lockAspect ? "translate-x-5" : "translate-x-0.5",
              ].join(" ")}
            />
          </button>
        </div>
      </div>
    ),
  },
  {
    key: "aspect-ratio",
    label: "Aspect Ratio",
    render: (settings, update) => (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {[
            ["original", "Original"],
            ["1:1", "1:1"],
            ["4:3", "4:3"],
            ["3:4", "3:4"],
            ["16:9", "16:9"],
            ["9:16", "9:16"],
            ["3:2", "3:2"],
            ["2:3", "2:3"],
            ["5:4", "5:4"],
            ["4:5", "4:5"],
            ["21:9", "21:9"],
            ["custom", "Custom"],
          ].map(([value, label]) => (
            <button
              className={[
                "rounded-lg border px-3 py-2 text-[13px]",
                settings.aspectRatio === value ? "border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]" : "border-slate-200 text-slate-700",
              ].join(" ")}
              key={value}
              onClick={() => update("aspectRatio", value as ResizeSettings["aspectRatio"])}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
        {settings.aspectRatio === "custom" ? (
          <div className="grid grid-cols-2 gap-2">
            <input className="field-input" min={1} onChange={(event) => update("customRatioWidth", Number(event.target.value))} type="number" value={settings.customRatioWidth} />
            <input className="field-input" min={1} onChange={(event) => update("customRatioHeight", Number(event.target.value))} type="number" value={settings.customRatioHeight} />
          </div>
        ) : null}
      </div>
    ),
  },
  {
    key: "resampling",
    label: "Resampling Algorithm",
    fields: [
      {
        key: "kernel",
        label: "Kernel",
        type: "select",
        options: [
          { label: "Lanczos3", value: "lanczos3" },
          { label: "Lanczos2", value: "lanczos2" },
          { label: "Cubic", value: "cubic" },
          { label: "Linear", value: "linear" },
          { label: "Nearest Neighbor", value: "nearest" },
        ],
      },
    ],
  },
  {
    key: "output-size",
    label: "Preset Sizes",
    render: (_settings, update) => (
      <div className="grid grid-cols-2 gap-2">
        {[ 
          [640, 480, "640 x 480", "640x480"],
          [800, 600, "800 x 600", "800x600"],
          [1024, 768, "1024 x 768", "1024x768"],
          [1280, 720, "1280 x 720", "1280x720"],
          [1280, 1024, "1280 x 1024", "1280x1024"],
          [1366, 768, "1366 x 768", "1366x768"],
          [1600, 900, "1600 x 900", "1600x900"],
          [1920, 1080, "1920 x 1080", "1920x1080"],
          [2560, 1440, "2560 x 1440", "2560x1440"],
          [3840, 2160, "3840 x 2160", "3840x2160"],
          [1080, 1080, "Instagram Post", "instagram-post"],
          [1080, 1920, "Instagram Story", "instagram-story"],
          [1280, 720, "YouTube Thumb", "youtube-thumbnail"],
          [1600, 900, "Twitter/X Post", "x-post"],
          [1640, 924, "Facebook Cover", "facebook-cover"],
          [1584, 396, "LinkedIn Cover", "linkedin-cover"],
          [2480, 3508, "A4 300 DPI", "a4-300"],
          [1240, 1754, "A4 150 DPI", "a4-150"],
          [3508, 4961, "A3 300 DPI", "a3-300"],
          [2550, 3300, "Letter 300 DPI", "letter-300"],
        ].map(([width, height, label, preset]) => (
          <button
            className="rounded-lg border border-slate-200 px-3 py-2 text-[13px] text-slate-700"
            key={label}
            onClick={() => {
              update("presetSize", preset as ResizeSettings["presetSize"]);
              update("width", Number(width));
              update("height", Number(height));
            }}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>
    ),
  },
  {
    key: "fit-mode",
    label: "Fit Mode",
    fields: [
      {
        key: "fit",
        label: "Fit",
        type: "radioCards",
        options: [
          { label: "Contain", description: "Fit inside the box", value: "contain" },
          { label: "Fit inside box", description: "Resize without cropping", value: "inside" },
          { label: "Cover", description: "Fill and crop excess", value: "cover" },
          { label: "Fill", description: "Pad to exact dimensions", value: "fill" },
          { label: "Stretch", description: "Ignore aspect ratio", value: "stretch" },
        ],
      },
      { key: "allowUpscale", label: "Allow upscale", type: "toggle" },
      { key: "withoutEnlargement", label: "No upscale", type: "toggle" },
      {
        key: "background",
        label: "Background color",
        type: "select",
        options: [
          { label: "White", value: "white" },
          { label: "Transparent", value: "transparent" },
          { label: "Custom", value: "custom" },
        ],
      },
      {
        key: "backgroundColor",
        label: "Custom color",
        type: "color",
        show: (settings) => settings.background === "custom",
      },
    ],
  },
  {
    key: "quality",
    label: "Quality",
    fields: [
      {
        key: "outputFormat",
        label: "Output format",
        type: "select",
        options: [
          { label: "Same as input", value: "auto" },
          { label: "JPEG", value: "jpg" },
          { label: "PNG", value: "png" },
          { label: "WebP", value: "webp" },
        ],
      },
      {
        key: "quality",
        label: "Quality",
        type: "slider",
        min: 1,
        max: 100,
        show: (settings) => settings.outputFormat === "jpg" || settings.outputFormat === "webp",
      },
      {
        key: "outputFilename",
        label: "Output filename",
        type: "text",
        placeholder: "certificate-small",
      },
    ],
  },
];

export default function ImageResizePage() {
  return (
    <SingleImageWorkspacePage<ResizeSettings>
      buildFormData={({ file, settings }) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("width", String(settings.width));
        formData.append("height", String(settings.height));
        formData.append("mode", settings.resizeMode === "fit-box" || settings.resizeMode === "custom" ? "pixels" : settings.resizeMode);
        formData.append("percentage", String(settings.percentage));
        formData.append("fit", settings.resizeMode === "fit-box" ? "inside" : settings.fit);
        formData.append("kernel", settings.kernel === "linear" ? "cubic" : settings.kernel);
        formData.append("without_enlargement", String(settings.withoutEnlargement));
        formData.append("allow_upscale", String(settings.allowUpscale && !settings.withoutEnlargement));
        formData.append("background", settings.background === "custom" ? settings.backgroundColor : settings.background === "transparent" ? "#00000000" : "#ffffff");
        formData.append("quality", String(settings.quality));
        formData.append("output_format", settings.outputFormat);
        formData.append("output_filename", settings.outputFilename.trim());
        return formData;
      }}
      description="Set exact dimensions, fit rules, and output format."
      downloadFilename={(file, settings) => {
        const requestedBase = settings.outputFilename.trim();
        const base = requestedBase || slugifyBaseName(file.name);
        const extension =
          settings.outputFormat === "auto"
            ? file.name.split(".").pop() ?? "png"
            : settings.outputFormat;
        return requestedBase ? `${base}.${extension}` : `${base}-${settings.width}x${settings.height}.${extension}`;
      }}
      emptyDescription="Upload an image to set new dimensions and download the resized file."
      endpoint="image/resize"
      initialSettings={{
        allowUpscale: false,
        aspectRatio: "original",
        background: "white",
        backgroundColor: "#ffffff",
        customRatioHeight: 1,
        customRatioWidth: 1,
        fit: "contain",
        height: 1080,
        kernel: "lanczos3",
        lockAspect: true,
        outputFilename: "",
        outputFormat: "auto",
        percentage: 100,
        presetSize: "custom",
        quality: 85,
        resizeMode: "pixels",
        unit: "px",
        width: 1920,
        withoutEnlargement: true,
      }}
      presets={[
        { label: "1920x1080", values: { width: 1920, height: 1080 } },
        { label: "Fit 1280", values: { width: 1280, height: 720, fit: "inside", resizeMode: "fit-box" } },
        { label: "Square", values: { width: 1080, height: 1080, fit: "cover" } },
        { label: "Twitter Header", values: { width: 1500, height: 500, fit: "cover" } },
        { label: "A4 300 DPI", values: { width: 2480, height: 3508, fit: "contain" } },
      ]}
      renderCenter={({ file, preview, settings }) => (
        <div className="space-y-3">
          <PreviewStage className="mx-auto max-w-3xl">
            {preview ? (
              <div className="relative flex items-center justify-center bg-[#F3F4F6] p-4">
                <img
                  alt={file.name}
                  className="max-h-[min(55vh,480px)] max-w-full rounded-lg border border-[#E5E7EB] bg-white object-contain"
                  src={preview.dataUrl}
                />
              </div>
            ) : null}
          </PreviewStage>
          <div className="mx-auto flex max-w-3xl flex-wrap gap-3">
            <div className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Original</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">
                {preview ? formatDimensions(preview.width, preview.height) : "--"}
              </p>
            </div>
            <div className="rounded-xl border border-[#2563EB]/30 bg-[#EFF6FF] px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2563EB]">Output</p>
              <p className="mt-1 text-sm font-semibold text-[#1D4ED8]">
                {settings.width} × {settings.height} px
              </p>
            </div>
          </div>
        </div>
      )}
      sections={sections}
      title="Resize Image"
    />
  );
}
