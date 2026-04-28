"use client";

import type { ControlSection } from "@/components/workspace/Controls";
import { SingleImageWorkspacePage, PreviewStage } from "@/components/workspace/WorkspacePageBuilders";
import { formatBytes, formatDimensions, slugifyBaseName } from "@/lib/format";

type CompressSettings = {
  chromaSubsampling: "4:4:4" | "4:2:2" | "4:2:0";
  colorDepth: "32-bit" | "24-bit" | "8-bit";
  convertToSrgb: boolean;
  format: "auto" | "jpeg" | "png" | "webp" | "avif";
  maxOutputKb: number;
  pngCompression: number;
  progressive: boolean;
  quality: number;
  sharpen: boolean;
  sharpenAmount: number;
  stripGps: boolean;
  stripMetadata: boolean;
  tryAllFormats: boolean;
};

const sections: Array<ControlSection<CompressSettings>> = [
  {
    key: "target-quality",
    label: "Target Quality",
    fields: [{ key: "quality", label: "Quality", type: "slider", min: 1, max: 100 }],
  },
  {
    key: "output-format",
    label: "Output Format",
    fields: [
      {
        key: "format",
        label: "Format",
        type: "buttonGroup",
        options: [
          { label: "Auto", value: "auto" },
          { label: "JPEG", value: "jpeg" },
          { label: "PNG", value: "png" },
          { label: "WebP", value: "webp" },
          { label: "AVIF", value: "avif" },
        ],
      },
    ],
  },
  {
    key: "jpeg-settings",
    label: "JPEG Settings",
    fields: [
      { key: "progressive", label: "Progressive encoding", type: "toggle" },
      {
        key: "chromaSubsampling",
        label: "Chroma subsampling",
        type: "select",
        options: [
          { label: "4:4:4", value: "4:4:4" },
          { label: "4:2:2", value: "4:2:2" },
          { label: "4:2:0", value: "4:2:0" },
        ],
      },
    ],
  },
  {
    key: "png-settings",
    label: "PNG Settings",
    fields: [
      { key: "pngCompression", label: "Compression level", type: "slider", min: 0, max: 9 },
      {
        key: "colorDepth",
        label: "Color depth",
        type: "select",
        options: [
          { label: "32-bit", value: "32-bit" },
          { label: "24-bit", value: "24-bit" },
          { label: "8-bit", value: "8-bit" },
        ],
      },
    ],
  },
  {
    key: "advanced",
    label: "Advanced",
    fields: [
      { key: "stripMetadata", label: "Strip all metadata", type: "toggle" },
      { key: "stripGps", label: "Strip GPS specifically", type: "toggle" },
      { key: "convertToSrgb", label: "Convert to sRGB", type: "toggle" },
      { key: "sharpen", label: "Sharpen after compression", type: "toggle" },
      {
        key: "sharpenAmount",
        label: "Sharpen amount",
        type: "slider",
        min: 0,
        max: 100,
        show: (settings) => settings.sharpen,
      },
    ],
  },
  {
    key: "optimization",
    label: "Optimization",
    fields: [
      { key: "tryAllFormats", label: "Try all formats and pick smallest", type: "toggle" },
      { key: "maxOutputKb", label: "Max output size in KB", type: "number", min: 0 },
    ],
  },
];

export default function ImageCompressPage() {
  return (
    <SingleImageWorkspacePage<CompressSettings>
      buildFormData={({ file, settings }) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("quality", String(settings.quality));
        formData.append("format", settings.format);
        formData.append("progressive", String(settings.progressive));
        formData.append("png_compression", String(settings.pngCompression));
        formData.append("strip_metadata", String(settings.stripMetadata));
        formData.append("strip_gps", String(settings.stripGps));
        formData.append("convert_to_srgb", String(settings.convertToSrgb));
        formData.append("sharpen", String(settings.sharpen));
        formData.append("sharpen_amount", String(settings.sharpenAmount));
        formData.append("max_output_kb", String(settings.maxOutputKb));
        return formData;
      }}
      description="Compare the image side by side, tune compression settings, and export a smaller file."
      downloadFilename={(file, settings) => {
        const base = slugifyBaseName(file.name);
        const extension =
          settings.format === "auto"
            ? file.name.split(".").pop() ?? "jpg"
            : settings.format === "jpeg"
              ? "jpg"
              : settings.format;
        return `${base}-compressed.${extension}`;
      }}
      emptyDescription="Upload an image to compare it before and after compression in the workspace."
      endpoint="image/compress"
      initialSettings={{
        chromaSubsampling: "4:2:0",
        colorDepth: "24-bit",
        convertToSrgb: true,
        format: "auto",
        maxOutputKb: 0,
        pngCompression: 6,
        progressive: true,
        quality: 82,
        sharpen: false,
        sharpenAmount: 20,
        stripGps: true,
        stripMetadata: true,
        tryAllFormats: false,
      }}
      presets={[
        { label: "Aggressive", values: { quality: 60, stripMetadata: true, progressive: true } },
        { label: "Balanced", values: { quality: 82, progressive: true } },
        { label: "Lossless", values: { format: "png", quality: 100 } },
        { label: "Web Fast", values: { format: "webp", quality: 75, stripMetadata: true } },
      ]}
      renderCenter={({ file, preview, settings }) => (
        <PreviewStage className="mx-auto max-w-5xl">
          <div className="grid gap-4 p-6 lg:grid-cols-2">
            {[
              { label: "Original", size: preview ? formatBytes(preview.size) : "--" },
              {
                label: "Compressed preview",
                size: preview ? `~${Math.max(1, Math.round((preview.size * settings.quality) / 100))} B` : "--",
              },
            ].map((panel) => (
              <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4" key={panel.label}>
                <div className="mb-3 flex items-center justify-between text-[13px] text-slate-500">
                  <span>{panel.label}</span>
                  <span>{panel.size}</span>
                </div>
                <div className="flex min-h-[340px] items-center justify-center">
                  {preview ? (
                    <img
                      alt={file.name}
                      className="max-h-[320px] max-w-full rounded-xl border border-[#E5E7EB] bg-white object-contain"
                      src={preview.dataUrl}
                    />
                  ) : null}
                </div>
                {preview ? (
                  <p className="mt-3 text-[13px] text-slate-500">
                    {formatDimensions(preview.width, preview.height)} / {preview.format}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </PreviewStage>
      )}
      sections={sections}
      title="Compress Image"
    />
  );
}
