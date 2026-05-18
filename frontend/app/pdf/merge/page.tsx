"use client";

// Workspace note: Merge intentionally uses FileWorkspaceGrid (vertical file rows)
// rather than the generic GridWorkspace<T> used by Split / Rotate / Images-to-PDF.
// Page thumbnails and file rows have different ideal layouts — file rows want a
// vertical list with metadata, page thumbnails want a card grid with zoom.
// The outer UnifiedWorkspace shell, header, settings panel, and download panel
// are already shared. Do not migrate to GridWorkspace<T> without first
// generalising it to support a vertical-list strategy.

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { DownloadPanel } from "@/components/ui/DownloadPanel";
import { UploadProgress } from "@/components/ui/UploadProgress";
import { WorkspaceControls, type ControlSection } from "@/components/workspace/Controls";
import { UnsupportedOptionNote } from "@/components/workspace/UnsupportedOptionNote";
import { EmptyPdfWorkspaceState } from "@/components/workspace/PDFWorkspace";
import { FileWorkspaceGrid } from "@/components/workspace/FileWorkspaceGrid";
import { UnifiedWorkspace } from "@/components/workspace/UnifiedWorkspace";
import { estimateProcessingTime, formatBytes } from "@/lib/format";
import { useWorkspaceFiles, workspaceFileIds } from "@/lib/use-workspace-files";
import { useWorkspaceJob } from "@/lib/workspace-job";
import { uploadedFileDetails } from "@/lib/workspace-data";

type MergeSettings = {
  addBookmarks: boolean;
  outputFilename: string;
  title: string;
};

const sections: Array<ControlSection<MergeSettings>> = [
  {
    key: "output-settings",
    label: "Output Settings",
    fields: [
      { key: "addBookmarks", label: "Add bookmarks", type: "toggle" },
    ],
  },
  {
    key: "metadata",
    label: "Metadata",
    fields: [
      { key: "title", label: "Output title", type: "text", placeholder: "Merged PDF" },
    ],
  },
  {
    key: "planned-advanced",
    label: "Advanced Options",
    render: () => (
      <UnsupportedOptionNote>
        Basic bookmarks/title metadata are supported. Advanced metadata and page numbering options are planned.
      </UnsupportedOptionNote>
    ),
  },
  {
    key: "output",
    label: "Output",
    fields: [{ key: "outputFilename", label: "Output filename", type: "text", placeholder: "merged.pdf" }],
  },
];

function useMergeSettings() {
  const [state, setState] = useState<MergeSettings>({
    addBookmarks: true,
    outputFilename: "merged.pdf",
    title: "",
  });

  return {
    state,
    update: <K extends keyof MergeSettings>(key: K, value: MergeSettings[K]) => {
      setState((current) => ({ ...current, [key]: value }));
    },
  };
}

export default function PdfMergePage() {
  const pathname = usePathname();
  const router = useRouter();
  const [queryString, setQueryString] = useState("");
  const searchParams = useMemo(() => new URLSearchParams(queryString), [queryString]);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { state: settings, update } = useMergeSettings();
  const files = useWorkspaceFiles({ accept: ".pdf,application/pdf", multiple: true });
  const fileIds = useMemo(() => workspaceFileIds(files.files), [files.files]);
  const totalBytes = useMemo(() => files.files.reduce((sum, file) => sum + file.size_bytes, 0), [files.files]);
  const fileCount = files.files.length;
  const job = useWorkspaceJob({
    approximateFileSize: totalBytes > 0 ? formatBytes(totalBytes) : undefined,
    fileType: "multiple PDFs",
    filename: settings.outputFilename || "merged.pdf",
    inputFileName: fileCount > 1 ? `${fileCount} PDFs` : files.files[0]?.display_name,
    prefix: "pdf",
    toolName: "Merge PDFs",
  });

  useEffect(() => {
    setQueryString(window.location.search.replace(/^\?/, ""));
  }, [pathname]);

  useEffect(() => {
    const ids = (searchParams.get("file_ids") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    if (ids.length === 0 || files.files.length > 0) {
      return;
    }
    void files.hydrateFromIds(ids);
  }, [files, files.files.length, searchParams]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (fileIds.length > 0) {
      params.set("file_ids", fileIds.join(","));
    } else {
      params.delete("file_ids");
    }
    const nextQuery = params.toString();
    setQueryString(nextQuery);
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }, [fileIds, pathname, router, searchParams]);

  const handleProcess = () => {
    if (files.files.length < 2) {
      return;
    }

    const formData = new FormData();
    files.files.forEach((file) => formData.append("file_ids", file.file_id));
    formData.append("add_bookmarks", String(settings.addBookmarks));
    formData.append("metadata_title", settings.title);
    formData.append("output_filename", settings.outputFilename);
    void job.process("pdf/merge", formData, { timeoutKind: "heavy" });
  };

  const infoContent = useMemo(() => {
    const firstFile = files.files[0] ?? null;
    const details = uploadedFileDetails(firstFile);
    if (details.length === 0) {
      return null;
    }
    return (
      <div className="space-y-4">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Showing metadata for the first file in the current merge order.</p>
        {details.map((detail) => (
          <div className="flex items-start justify-between gap-4 border-b border-zinc-100 pb-3 last:border-b-0 last:pb-0 dark:border-white/10" key={detail.label}>
            <span className="text-zinc-500 dark:text-zinc-400">{detail.label}</span>
            <span className="max-w-[60%] text-right font-medium text-zinc-900 dark:text-zinc-100">{detail.value}</span>
          </div>
        ))}
      </div>
    );
  }, [files.files]);

  return (
    <>
      <input
        accept=".pdf,application/pdf"
        className="hidden"
        multiple
        onChange={(event) => {
          void files.addFiles(Array.from(event.target.files ?? []), "append");
          job.reset();
        }}
        ref={inputRef}
        type="file"
      />
      <UnifiedWorkspace
        countLabel={fileCount > 0 ? `${fileCount} files` : undefined}
        description="Upload two or more PDFs, reorder them in one shared file grid, and merge them into a single output."
        downloadPanel={
          fileCount > 0 && job.state !== "idle" && job.state !== "uploading" && !job.panelDismissed ? (
            <DownloadPanel
              error={job.error}
              errorDetails={job.errorDetails ?? null}
              estimatedTime={estimateProcessingTime(totalBytes, fileCount)}
              approxFileSize={totalBytes > 0 ? formatBytes(totalBytes) : undefined}
              fileName={fileCount > 1 ? `${fileCount} PDFs` : files.files[0]?.display_name}
              fileType="multiple PDFs"
              jobId={job.jobId}
              notice={job.notice}
              onDownload={job.state === "success" ? job.download : undefined}
              onProcessAnother={() => {
                files.resetFiles();
                job.reset();
              }}
              onReedit={job.dismissPanel}
              rateLimitScope={job.rateLimitScope}
              state={job.state === "failure" ? "failure" : job.state === "success" ? "success" : job.state}
              toolName="Merge PDFs"
            />
          ) : null
        }
        editor={
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm shadow-black/5 dark:border-white/10 dark:bg-zinc-900">
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Merge order</p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Drag to reorder. The backend receives this exact order.</p>
              </div>
              <button className="secondary-button min-h-11 px-4" onClick={() => inputRef.current?.click()} type="button">
                Add more PDFs
              </button>
            </div>
            <FileWorkspaceGrid
              items={files.files.map((file) => ({
                id: file.file_id,
                meta: [file.page_count ? `${file.page_count} pages` : undefined, formatBytes(file.size_bytes)].filter(Boolean).join(" / "),
                thumbnailUrl: file.thumbnail_url,
                title: file.display_name,
              }))}
              onMove={files.moveFile}
              onRemove={files.removeFile}
              onReorder={files.reorderFiles}
            />
          </div>
        }
        emptyState={
          <EmptyPdfWorkspaceState
            description="Upload two or more PDFs to merge them."
            multiple
            onFilesSelected={(nextFiles) => {
              void files.addFiles(nextFiles, "replace");
              job.reset();
            }}
          />
        }
        estimatedTime={estimateProcessingTime(totalBytes, fileCount)}
        fileInfo={fileCount > 0 ? formatBytes(totalBytes) : undefined}
        fileName={fileCount > 0 ? `${fileCount} files ready` : undefined}
        hasContent={fileCount > 0}
        infoContent={infoContent}
        kind="grid"
        onDownload={job.state === "success" ? job.download : undefined}
        onFilesDropped={(nextFiles) => {
          void files.addFiles(nextFiles, "append");
          job.reset();
        }}
        onProcess={handleProcess}
        onReset={() => {
          files.resetFiles();
          job.reset();
        }}
        processButtonDisabled={fileCount < 2}
        processButtonLabel="Merge PDFs"
        processingLabel={
          files.uploadState === "uploading"
            ? "Uploading files"
            : files.uploadState === "failure"
              ? files.uploadError ?? "Upload failed"
              : job.processingLabel
        }
        settingsPanel={
          <div className="space-y-6">
            <div
              className={[
                "rounded-xl border px-4 py-3 text-[13px] leading-6",
                files.uploadState === "failure" || job.state === "failure"
                  ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200"
                  : job.state === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200"
                    : "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-300",
              ].join(" ")}
            >
              {files.uploadState === "failure"
                ? files.uploadError ?? "Upload failed."
                : job.state === "failure"
                  ? job.error ?? "Merge failed."
                  : job.state === "success"
                    ? "Merged PDF is ready to download."
                    : fileCount >= 2
                      ? "Use the unified file grid to reorder, remove, or append PDFs before processing."
                      : "Upload two or more PDFs to merge them."}
            </div>
            <WorkspaceControls sections={sections} state={settings} update={update} />
          </div>
        }
        title="Merge PDFs"
        uploadOverlay={
          files.uploadState === "uploading" && files.pendingFiles.length > 0 ? (
            <UploadProgress
              fileLabel="Uploading files"
              fileName={`${files.pendingFiles.length} files`}
              fileSize={files.pendingFiles.reduce((sum, file) => sum + file.size, 0)}
              onCancel={files.cancelUpload}
              percent={files.uploadPercent}
              remainingSecs={files.uploadRemainingSecs}
              speedKBs={files.uploadSpeedKBs}
              totalBytes={files.uploadTotalBytes}
              uploadedBytes={files.uploadedBytes}
            />
          ) : null
        }
      />
    </>
  );
}
