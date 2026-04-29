"use client";

import type { ControlSection } from "@/components/workspace/Controls";
import { SingleImageWorkspacePage, PreviewStage } from "@/components/workspace/WorkspacePageBuilders";
import { slugifyBaseName } from "@/lib/format";

type RemoveBackgroundSettings = {
  backgroundMode: "transparent" | "solid" | "blur";
  blurAmount: number;
  edgeSmoothing: number;
  feather: number;
  format: "png" | "webp";
  maskAdjust: number;
  outputBackground: "white" | "custom";
  outputBackgroundColor: string;
  processingMode: "auto" | "precise" | "aggressive";
  solidColor: string;
};

const sections: Array<ControlSection<RemoveBackgroundSettings>> = [
  {
    key: "processing-mode",
    label: "Processing Mode",
    fields: [
      {
        key: "processingMode",
        label: "Mode",
        type: "radioCards",
        options: [
          { label: "Auto", description: "AI-based GrabCut algorithm", value: "auto" },
          { label: "Precise edges", description: "Better for hair and fine details", value: "precise" },
          { label: "Aggressive", description: "Removes more background", value: "aggressive" },
        ],
      },
    ],
  },
  {
    key: "background-replacement",
    label: "Background Replacement",
    fields: [
      {
        key: "backgroundMode",
        label: "Background",
        type: "buttonGroup",
        options: [
          { label: "Transparent", value: "transparent" },
          { label: "Solid", value: "solid" },
          { label: "Blur", value: "blur" },
        ],
      },
      { key: "solidColor", label: "Solid color", type: "color", show: (settings) => settings.backgroundMode === "solid" },
      { key: "blurAmount", label: "Blur amount", type: "slider", min: 0, max: 30, show: (settings) => settings.backgroundMode === "blur" },
    ],
  },
  {
    key: "edge-refinement",
    label: "Edge Refinement",
    fields: [
      { key: "edgeSmoothing", label: "Edge smoothing", type: "slider", min: 0, max: 10 },
      { key: "feather", label: "Feather edges", type: "slider", min: 0, max: 10 },
      { key: "maskAdjust", label: "Expand or contract mask", type: "slider", min: -20, max: 20 },
    ],
  },
  {
    key: "output",
    label: "Output",
    fields: [
      {
        key: "format",
        label: "Format",
        type: "buttonGroup",
        options: [
          { label: "PNG", value: "png" },
          { label: "WebP", value: "webp" },
        ],
      },
      {
        key: "outputBackground",
        label: "Background color",
        type: "select",
        options: [
          { label: "White", value: "white" },
          { label: "Custom", value: "custom" },
        ],
      },
      { key: "outputBackgroundColor", label: "Custom color", type: "color", show: (settings) => settings.outputBackground === "custom" },
    ],
  },
];

export default function ImageRemoveBackgroundPage() {
  return (
    <SingleImageWorkspacePage<RemoveBackgroundSettings>
      buildFormData={({ file, settings }) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("processing_mode", settings.processingMode);
        formData.append("background_mode", settings.backgroundMode);
        formData.append("solid_color", settings.solidColor);
        formData.append("blur_amount", String(settings.blurAmount));
        formData.append("edge_smoothing", String(settings.edgeSmoothing));
        formData.append("feather", String(settings.feather));
        formData.append("mask_adjust", String(settings.maskAdjust));
        formData.append("format", settings.format);
        return formData;
      }}
      description="Preview the before-and-after comparison while you tune mask and background settings."
      downloadFilename={(file, settings) => `${slugifyBaseName(file.name)}-cutout.${settings.format}`}
      emptyDescription="Upload an image to remove its background and preview the result."
      endpoint="image/remove-background"
      initialSettings={{
        backgroundMode: "transparent",
        blurAmount: 8,
        edgeSmoothing: 4,
        feather: 2,
        format: "png",
        maskAdjust: 0,
        outputBackground: "white",
        outputBackgroundColor: "#ffffff",
        processingMode: "auto",
        solidColor: "#ffffff",
      }}
      renderCenter={({ file, preview }) => (
        <PreviewStage className="mx-auto max-w-5xl">
          <div className="grid gap-4 p-6 lg:grid-cols-2">
            {["Original", "Background removed"].map((label, index) => (
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-white/10 dark:bg-zinc-900" key={label}>
                <p className="mb-3 text-[13px] text-slate-500 dark:text-zinc-400">{label}</p>
                <div className={["flex min-h-[360px] items-center justify-center rounded-xl border border-zinc-200 p-4 dark:border-white/10", index === 1 ? "preview-checkerboard" : "bg-zinc-50 dark:bg-zinc-950"].join(" ")}>
                  {preview ? (
                    <img
                      alt={file.name}
                      className="max-h-[320px] max-w-full rounded-xl object-contain"
                      src={preview.dataUrl}
                    />
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </PreviewStage>
      )}
      sections={sections}
      title="Remove Background"
    />
  );
}
