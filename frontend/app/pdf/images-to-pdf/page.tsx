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

type ImagesToPdfSettings = {
  compressImages: boolean;
  customHeight: number;
  customWidth: number;
  fit: "fit" | "fill" | "actual" | "custom";
  imageQuality: number;
  marginPreset: "none" | "small" | "medium" | "large" | "custom";
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  marginTop: number;
  orientation: "portrait" | "landscape";
  outputFilename: string;
  pageSize: "a4" | "a3" | "a5" | "letter" | "legal" | "custom";
};

const sections: Array<ControlSection<ImagesToPdfSettings>> = [
  {
    key: "page-settings",
    label: "Page Settings",
    fields: [
      {
        key: "pageSize",
        label: "Page size",
        type: "select",
        options: [
          { label: "A4", value: "a4" },
          { label: "A3", value: "a3" },
          { label: "A5", value: "a5" },
          { label: "Letter", value: "letter" },
          { label: "Legal", value: "legal" },
          { label: "Custom", value: "custom" },
        ],
      },
      {
        key: "customWidth",
        label: "Custom width",
        type: "number",
        min: 1,
        show: (settings) => settings.pageSize === "custom",
      },
      {
        key: "customHeight",
        label: "Custom height",
        type: "number",
        min: 1,
        show: (settings) => settings.pageSize === "custom",
      },
      {
        key: "orientation",
        label: "Orientation",
        type: "buttonGroup",
        options: [
          { label: "Portrait", value: "portrait" },
          { label: "Landscape", value: "landscape" },
        ],
      },
      {
        key: "fit",
        label: "Fit image to page",
        type: "select",
        options: [
          { label: "Fit", value: "fit" },
          { label: "Fill", value: "fill" },
          { label: "Actual size", value: "actual" },
          { label: "Custom", value: "custom" },
        ],
      },
    ],
  },
  {
    key: "margins",
    label: "Margins",
    fields: [
      {
        key: "marginPreset",
        label: "Margin preset",
        type: "select",
        options: [
          { label: "None", value: "none" },
          { label: "Small (10mm)", value: "small" },
          { label: "Medium (20mm)", value: "medium" },
          { label: "Large (30mm)", value: "large" },
          { label: "Custom", value: "custom" },
        ],
      },
      { key: "marginTop", label: "Top", type: "number", min: 0, show: (settings) => settings.marginPreset === "custom" },
      { key: "marginRight", label: "Right", type: "number", min: 0, show: (settings) => settings.marginPreset === "custom" },
      { key: "marginBottom", label: "Bottom", type: "number", min: 0, show: (settings) => settings.marginPreset === "custom" },
      { key: "marginLeft", label: "Left", type: "number", min: 0, show: (settings) => settings.marginPreset === "custom" },
    ],
  },
  {
    key: "image-settings",
    label: "Image Settings",
    fields: [
      { key: "imageQuality", label: "Image quality", type: "slider", min: 1, max: 100 },
      { key: "compressImages", label: "Compress images", type: "toggle" },
    ],
  },
  {
    key: "output",
    label: "Output",
    fields: [
      { key: "outputFilename", label: "Output filename", type: "text", placeholder: "images.pdf" },
    ],
  },
];

export default function PdfImagesToPdfPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [size, setSize] = useState<WorkspaceThumbnailSize>("medium");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const previews = useImagePreviewItems(files);
  const items = toImageGridItems(previews);
  const totalBytes = useMemo(() => files.reduce((sum, file) => sum + file.size, 0), [files]);
  const { state: settings, update } = useObjectState<ImagesToPdfSettings>({
    compressImages: true,
    customHeight: 297,
    customWidth: 210,
    fit: "fit",
    imageQuality: 90,
    marginBottom: 20,
    marginLeft: 20,
    marginPreset: "medium",
    marginRight: 20,
    marginTop: 20,
    orientation: "portrait",
    outputFilename: "images.pdf",
    pageSize: "a4",
  });
  const job = useWorkspaceJob({
    filename: settings.outputFilename || "images.pdf",
    prefix: "pdf",
  });

  const handleProcess = () => {
    if (files.length === 0) {
      return;
    }

    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    formData.append("page_size", settings.pageSize);
    formData.append("custom_width", String(settings.customWidth));
    formData.append("custom_height", String(settings.customHeight));
    formData.append("orientation", settings.orientation);
    formData.append("fit", settings.fit);
    formData.append("margin_preset", settings.marginPreset);
    formData.append("margin_top", String(settings.marginTop));
    formData.append("margin_right", String(settings.marginRight));
    formData.append("margin_bottom", String(settings.marginBottom));
    formData.append("margin_left", String(settings.marginLeft));
    formData.append("image_quality", String(settings.imageQuality));
    formData.append("compress_images", String(settings.compressImages));
    formData.append("output_filename", settings.outputFilename);
    job.process("pdf/images-to-pdf", formData);
  };

  return (
    <>
      <input
        accept="image/*"
        className="hidden"
        multiple
        onChange={(event) =>
          setFiles((current) => [...current, ...Array.from(event.target.files ?? [])])
        }
        ref={inputRef}
        type="file"
      />
      <ImageWorkspace
        breadcrumbTitle="Images to PDF"
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
        countLabel={files.length > 0 ? `${files.length} selected` : undefined}
        description="Arrange images, adjust page layout, and turn the sequence into a single PDF."
        downloadPanel={
          job.state !== "idle" && job.state !== "uploading" && !job.panelDismissed ? (
            <DownloadPanel
              error={job.error}
              errorDetails={job.errorDetails ?? null}
              estimatedTime={estimateProcessingTime(totalBytes, files.length)}
              jobId={job.jobId}
              notice={job.notice}
              onDownload={job.state === "success" ? job.download : undefined}
              onProcessAnother={() => {
                setFiles([]);
                job.reset();
              }}
              onReedit={job.dismissPanel}
              rateLimitScope={job.rateLimitScope}
              state={job.state === "failure" ? "failure" : job.state === "success" ? "success" : job.state}
            />
          ) : null
        }
        emptyState={
          <EmptyWorkspaceState
            accept="image/*"
            description="Upload one or more images to build a PDF in the workspace."
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
                ? job.error ?? "PDF creation failed."
                : "Drag images in the canvas to reorder pages before export."}
            </div>

            <div className="space-y-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400 dark:text-zinc-500">
                Images ({files.length} selected)
              </p>
              <button
                className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-[14px] text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-white/5"
                onClick={() => inputRef.current?.click()}
                type="button"
              >
                Add more images
              </button>
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
