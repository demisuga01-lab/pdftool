"use client";

import { useMemo, useRef, useState } from "react";

import { DownloadPanel } from "@/components/ui/DownloadPanel";
import { UploadProgress } from "@/components/ui/UploadProgress";
import { ImageThumbnailGrid, ImageWorkspace, EmptyWorkspaceState } from "@/components/workspace/ImageWorkspace";
import { WorkspaceControls, type ControlSection } from "@/components/workspace/Controls";
import type { WorkspaceThumbnailSize } from "@/components/workspace/PDFWorkspace";
import { estimateProcessingTime, formatBytes } from "@/lib/format";
import { useWorkspaceJob } from "@/lib/workspace-job";
import { toImageGridItems, useImagePreviewItems, useObjectState } from "@/lib/workspace-data";

type BatchResizeSettings = {
  addDimensionsSuffix: boolean;
  customPrefix: string;
  fit: "cover" | "contain" | "fill" | "inside" | "outside";
  format: "same" | "jpeg" | "png" | "webp";
  height: number;
  namingPattern: "{original}" | "{original}-resized" | "{n}" | "custom";
  overridePerImage: boolean;
  quality: number;
  width: number;
};

const sections: Array<ControlSection<BatchResizeSettings>> = [
  {
    key: "input-files",
    label: "Input Files",
    render: (_settings, _update) => null,
  },
  {
    key: "output-dimensions",
    label: "Output Dimensions",
    render: (_settings, update) => (
      <div className="grid grid-cols-2 gap-2">
        {[
          [1920, 1080, "1920x1080"],
          [1280, 720, "1280x720"],
          [800, 600, "800x600"],
          [1080, 1080, "Square"],
          [1080, 1920, "Portrait"],
          [3840, 2160, "4K"],
        ].map(([width, height, label]) => (
          <button
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-white/5"
            key={label}
            onClick={() => {
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
    fields: [
      { key: "width", label: "Width", type: "number", min: 1 },
      { key: "height", label: "Height", type: "number", min: 1 },
      {
        key: "fit",
        label: "Resize mode",
        type: "select",
        options: [
          { label: "Cover", value: "cover" },
          { label: "Contain", value: "contain" },
          { label: "Fill", value: "fill" },
          { label: "Inside", value: "inside" },
          { label: "Outside", value: "outside" },
        ],
      },
    ],
  },
  {
    key: "per-image",
    label: "Per-Image Settings",
    fields: [{ key: "overridePerImage", label: "Override dimensions for specific images", type: "toggle" }],
  },
  {
    key: "output-format",
    label: "Output Format",
    fields: [
      {
        key: "format",
        label: "Convert all to",
        type: "select",
        options: [
          { label: "Same as input", value: "same" },
          { label: "JPEG", value: "jpeg" },
          { label: "PNG", value: "png" },
          { label: "WebP", value: "webp" },
        ],
      },
      { key: "quality", label: "Quality", type: "slider", min: 1, max: 100 },
    ],
  },
  {
    key: "naming",
    label: "Naming",
    fields: [
      {
        key: "namingPattern",
        label: "Pattern",
        type: "select",
        options: [
          { label: "{original}", value: "{original}" },
          { label: "{original}-resized", value: "{original}-resized" },
          { label: "{n}", value: "{n}" },
          { label: "Custom", value: "custom" },
        ],
      },
      { key: "customPrefix", label: "Custom prefix", type: "text", show: (settings) => settings.namingPattern === "custom" },
      { key: "addDimensionsSuffix", label: "Add dimensions suffix", type: "toggle" },
    ],
  },
];

export default function ImageBatchResizePage() {
  const [files, setFiles] = useState<File[]>([]);
  const [size, setSize] = useState<WorkspaceThumbnailSize>("medium");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const previews = useImagePreviewItems(files);
  const items = toImageGridItems(previews);
  const totalBytes = useMemo(() => files.reduce((sum, file) => sum + file.size, 0), [files]);
  const { state: settings, update } = useObjectState<BatchResizeSettings>({
    addDimensionsSuffix: true,
    customPrefix: "",
    fit: "contain",
    format: "same",
    height: 1080,
    namingPattern: "{original}-resized",
    overridePerImage: false,
    quality: 85,
    width: 1920,
  });
  const job = useWorkspaceJob({
    filename: "batch-resize.zip",
    prefix: "image",
  });

  const handleProcess = () => {
    if (files.length === 0) {
      return;
    }

    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    formData.append("width", String(settings.width));
    formData.append("height", String(settings.height));
    formData.append("fit", settings.fit);
    formData.append("format", settings.format);
    formData.append("quality", String(settings.quality));
    formData.append("naming_pattern", settings.namingPattern);
    formData.append("custom_prefix", settings.customPrefix);
    formData.append("add_dimensions_suffix", String(settings.addDimensionsSuffix));
    job.process("image/batch-resize", formData);
  };

  return (
    <>
      <input
        accept="image/*"
        className="hidden"
        multiple
        onChange={(event) => setFiles((current) => [...current, ...Array.from(event.target.files ?? [])])}
        ref={inputRef}
        type="file"
      />
      <ImageWorkspace
        breadcrumbTitle="Batch Resize"
        centerContent={
          <ImageThumbnailGrid
            items={items}
            onRemove={(id) => setFiles(files.filter((_, index) => items[index]?.id !== id))}
            onReorder={(nextItems) => {
              const lookup = new Map(items.map((item, index) => [item.id, files[index]]));
              setFiles(nextItems.map((item) => lookup.get(item.id)).filter(Boolean) as File[]);
            }}
            size={size}
          />
        }
        countLabel={files.length > 0 ? `${files.length} images` : undefined}
        description="Resize a full batch from one canvas, then download the processed set as a ZIP archive."
        downloadPanel={
          job.state !== "idle" && job.state !== "uploading" && !job.panelDismissed ? (
            <DownloadPanel
              error={job.error}
              errorDetails={job.errorDetails ?? job.result?.traceback ?? null}
              estimatedTime={estimateProcessingTime(totalBytes, files.length)}
              jobId={job.jobId}
              onDownload={job.state === "success" ? job.download : undefined}
              onProcessAnother={() => {
                setFiles([]);
                job.reset();
              }}
              onReedit={job.dismissPanel}
              state={job.state === "failure" ? "failure" : job.state === "success" ? "success" : job.state}
            />
          ) : null
        }
        emptyState={
          <EmptyWorkspaceState
            accept="image/*"
            description="Upload multiple images to resize the whole batch together."
            multiple
            onFilesSelected={(nextFiles) => {
              setFiles(nextFiles);
              job.reset();
            }}
          />
        }
        estimatedTime={estimateProcessingTime(totalBytes, files.length)}
        fileInfo={files.length > 0 ? formatBytes(totalBytes) : undefined}
        fileName={files.length > 0 ? `${files.length} images ready` : undefined}
        hasContent={files.length > 0}
        onDownload={job.state === "success" ? job.download : undefined}
        onProcess={handleProcess}
        onReset={() => {
          setFiles([]);
          job.reset();
        }}
        processButtonDisabled={files.length === 0}
        processingLabel={job.processingLabel}
        rightPanel={
          <div className="space-y-6">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-[13px] leading-6 text-slate-500 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-300">
              {job.state === "failure"
                ? job.error ?? "Batch resize failed."
                : "Use the workspace to reorder files before generating a resized ZIP bundle."}
            </div>

            <div className="space-y-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400 dark:text-zinc-500">
                Input Files
              </p>
              <div className="grid gap-2">
                <button
                  className="h-9 rounded-md border border-slate-200 bg-white px-3 text-[14px] text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-white/5"
                  onClick={() => inputRef.current?.click()}
                  type="button"
                >
                  Add more files
                </button>
                <button
                  className="h-9 rounded-md border border-slate-200 bg-white px-3 text-[14px] text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-white/5"
                  onClick={() => setFiles([])}
                  type="button"
                >
                  Remove all
                </button>
              </div>
            </div>

            <WorkspaceControls sections={sections} state={settings} update={update} />
          </div>
        }
        setSize={setSize}
        showSizeToggle
        size={size}
        uploadOverlay={
          files[0] && job.state === "uploading" ? (
            <UploadProgress
              fileName={`${files.length} files`}
              fileSize={totalBytes}
              percent={job.uploadPercent}
              speedKBs={job.uploadSpeedKBs}
            />
          ) : null
        }
      />
    </>
  );
}
