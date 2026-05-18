"use client";

import { useMemo, useRef, useState } from "react";
import { GripVertical, X } from "lucide-react";

import { DownloadPanel } from "@/components/ui/DownloadPanel";
import { UploadProgress } from "@/components/ui/UploadProgress";
import { ImageWorkspace, EmptyWorkspaceState } from "@/components/workspace/ImageWorkspace";
import { WorkspaceControls, type ControlSection } from "@/components/workspace/Controls";
import { UnsupportedOptionNote } from "@/components/workspace/UnsupportedOptionNote";
import {
  GridThumbnail,
  GridWorkspace,
  type GridWorkspaceItemBase,
} from "@/components/workspace/PageGridWorkspace";
import { estimateProcessingTime, formatBytes } from "@/lib/format";
import { useWorkspaceJob } from "@/lib/workspace-job";
import { toImageGridItems, useImagePreviewItems, useObjectState } from "@/lib/workspace-data";

type ImageWorkspaceItem = GridWorkspaceItemBase & {
  dimensionsLabel?: string;
  fileName: string;
  preview: string;
  sizeLabel?: string;
};

type BatchResizeSettings = {
  height: number;
  width: number;
};

const sections: Array<ControlSection<BatchResizeSettings>> = [
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
    ],
  },
  {
    key: "backend-defaults",
    label: "Output Defaults",
    render: () => (
      <UnsupportedOptionNote>
        Batch resize currently uses backend defaults for format, fit, quality, and naming.
      </UnsupportedOptionNote>
    ),
  },
];

export default function ImageBatchResizePage() {
  const [files, setFiles] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const previews = useImagePreviewItems(files);
  const baseItems = toImageGridItems(previews);
  const items: ImageWorkspaceItem[] = baseItems.map((item) => ({
    ...item,
    previewUrl: item.preview,
    thumbnailUrl: item.preview,
  }));
  const totalBytes = useMemo(() => files.reduce((sum, file) => sum + file.size, 0), [files]);
  const { state: settings, update } = useObjectState<BatchResizeSettings>({
    height: 1080,
    width: 1920,
  });
  const job = useWorkspaceJob({
    approximateFileSize: totalBytes > 0 ? formatBytes(totalBytes) : undefined,
    fileType: files.length > 1 ? "multiple images" : files[0]?.name.split(".").pop(),
    filename: "batch-resize.zip",
    inputFileName: files.length > 1 ? `${files.length} images` : files[0]?.name,
    prefix: "image",
    toolName: "Batch Resize",
  });

  const handleProcess = () => {
    if (files.length === 0) {
      return;
    }

    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    formData.append("width", String(settings.width));
    formData.append("height", String(settings.height));
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
          <GridWorkspace<ImageWorkspaceItem>
            items={items}
            onItemsChange={(nextItems) => {
              const lookup = new Map(items.map((item, index) => [item.id, files[index]]));
              setFiles(nextItems.map((item) => lookup.get(item.id)).filter(Boolean) as File[]);
            }}
            previewLabels={{
              pageLabel: (item) => item.fileName,
              currentPositionLabel: (_item, position) => `Image ${position} of ${items.length}`,
            }}
            removedNotice=""
            showRemoveAction={false}
            renderCard={(args) => {
              const { attributes, dragEnabled, index, isDragging, item, listeners, onClick, onKeyDown, onPreview, setActivatorNodeRef, setNodeRef, style, total } = args;
              return (
                <article
                  aria-label={`Image ${index + 1}: ${item.fileName}`}
                  className={[
                    "group relative rounded-lg border bg-white p-2 shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/30 dark:bg-zinc-900",
                    "border-zinc-200 hover:border-zinc-300 dark:border-white/10 dark:hover:border-zinc-600",
                    isDragging ? "z-10 opacity-70 shadow-md ring-2 ring-emerald-600/20" : "",
                  ].join(" ")}
                  onClick={onClick}
                  onKeyDown={onKeyDown}
                  ref={setNodeRef}
                  role="button"
                  style={style}
                  tabIndex={0}
                >
                  {dragEnabled ? (
                    <button
                      aria-label={`Drag image ${item.fileName}`}
                      className="absolute right-3 top-3 z-10 flex h-9 w-9 cursor-grab items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-500 transition hover:text-zinc-900 active:cursor-grabbing dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:text-white"
                      onClick={(event) => event.stopPropagation()}
                      ref={setActivatorNodeRef}
                      type="button"
                      {...attributes}
                      {...listeners}
                    >
                      <GripVertical className="h-4 w-4" />
                    </button>
                  ) : null}

                  <button
                    aria-label={`Preview image ${item.fileName}`}
                    className="block w-full overflow-hidden rounded-md bg-zinc-100 p-2 dark:bg-zinc-950"
                    onClick={(event) => {
                      event.stopPropagation();
                      onPreview?.();
                    }}
                    type="button"
                  >
                    <GridThumbnail
                      alt={item.fileName}
                      className="aspect-square w-full rounded border border-zinc-200 bg-white object-cover dark:border-white/10"
                      src={item.preview}
                    />
                  </button>

                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="block truncate text-xs font-semibold text-zinc-700 dark:text-zinc-200">
                        {item.fileName}
                      </span>
                      <span className="block text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
                        {item.dimensionsLabel ?? `Image ${index + 1} of ${total}`}
                        {item.sizeLabel ? ` / ${item.sizeLabel}` : ""}
                      </span>
                    </div>
                    <button
                      aria-label={`Remove image ${item.fileName}`}
                      className="secondary-button h-8 w-8 p-0 text-rose-600"
                      onClick={(event) => {
                        event.stopPropagation();
                        setFiles(files.filter((_, fileIndex) => items[fileIndex]?.id !== item.id));
                      }}
                      title="Remove image"
                      type="button"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </article>
              );
            }}
          />
        }
        countLabel={files.length > 0 ? `${files.length} images` : undefined}
        description="Resize a full batch from one canvas, then download the processed set as a ZIP archive."
        downloadPanel={
          job.state !== "idle" && job.state !== "uploading" && !job.panelDismissed ? (
            <DownloadPanel
              error={job.error}
              errorDetails={job.errorDetails ?? null}
              estimatedTime={estimateProcessingTime(totalBytes, files.length)}
              approxFileSize={totalBytes > 0 ? formatBytes(totalBytes) : undefined}
              fileName={files.length > 1 ? `${files.length} images` : files[0]?.name}
              fileType={files.length > 1 ? "multiple images" : files[0]?.name.split(".").pop()}
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
              toolName="Batch Resize"
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
