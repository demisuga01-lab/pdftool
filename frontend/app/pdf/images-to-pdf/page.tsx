"use client";

import { useMemo, useRef, useState } from "react";

import { DownloadPanel } from "@/components/ui/DownloadPanel";
import { UploadProgress } from "@/components/ui/UploadProgress";
import { ImageThumbnailGrid, ImageWorkspace, EmptyWorkspaceState } from "@/components/workspace/ImageWorkspace";
import { WorkspaceControls, type ControlSection } from "@/components/workspace/Controls";
import { UnsupportedOptionNote } from "@/components/workspace/UnsupportedOptionNote";
import type { WorkspaceThumbnailSize } from "@/components/workspace/PDFWorkspace";
import { estimateProcessingTime, formatBytes } from "@/lib/format";
import { useWorkspaceJob } from "@/lib/workspace-job";
import { toImageGridItems, useImagePreviewItems, useObjectState } from "@/lib/workspace-data";

type ImagesToPdfSettings = {
  outputFilename: string;
};

const sections: Array<ControlSection<ImagesToPdfSettings>> = [
  {
    key: "layout-note",
    label: "Layout",
    render: () => (
      <UnsupportedOptionNote>
        Images are currently combined using the backend default layout. Page size, margins, and fit options are planned.
      </UnsupportedOptionNote>
    ),
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
    outputFilename: "images.pdf",
  });
  const job = useWorkspaceJob({
    approximateFileSize: totalBytes > 0 ? formatBytes(totalBytes) : undefined,
    fileType: files.length > 1 ? "multiple images" : files[0]?.name.split(".").pop(),
    filename: settings.outputFilename || "images.pdf",
    inputFileName: files.length > 1 ? `${files.length} images` : files[0]?.name,
    prefix: "pdf",
    toolName: "Images to PDF",
  });

  const handleProcess = () => {
    if (files.length === 0) {
      return;
    }

    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
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
        description="Arrange images and turn the sequence into a single PDF using the backend default layout."
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
              toolName="Images to PDF"
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
