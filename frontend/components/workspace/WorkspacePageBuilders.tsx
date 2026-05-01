"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Maximize2, Minus, Plus } from "lucide-react";

import { DownloadPanel } from "@/components/ui/DownloadPanel";
import { UploadProgress } from "@/components/ui/UploadProgress";
import { EmptyWorkspaceState, ImageWorkspace } from "@/components/workspace/ImageWorkspace";
import { WorkspaceControls, type ControlSection } from "@/components/workspace/Controls";
import { CompactWorkspaceShell, PreviewCard } from "@/components/workspace/WorkspaceShells";
import {
  EmptyPdfWorkspaceState,
  PDFWorkspace,
  type PdfPageCard,
  type WorkspaceThumbnailSize,
} from "@/components/workspace/PDFWorkspace";
import { estimateProcessingTime, formatBytes } from "@/lib/format";
import {
  getFileMetadata,
  getPdfPagePreviewUrl,
  uploadFileToWorkspace,
  type UploadedFileMetadata,
  type UploadProgressHandler,
} from "@/lib/files";
import { useWorkspaceJob } from "@/lib/workspace-job";
import {
  imageSummary,
  uploadedFileDetails,
  selectedPagesLabel,
  uploadedFileSummary,
  useImagePreviewItems,
  useObjectState,
  usePageSelection,
  useUploadedPdfPageItems,
  useSingleImagePreview,
} from "@/lib/workspace-data";
import { useDragPan, useWorkspaceZoom } from "@/lib/use-workspace-zoom";

type PresetButton<T> = {
  label: string;
  values: Partial<T>;
};

export function PreviewStage({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        "overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-zinc-900",
        className ?? "",
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function SidebarStatus({
  error,
  idleText,
  state,
}: {
  error: string | null;
  idleText: string;
  state: "idle" | "uploading" | "queued" | "processing" | "success" | "failure";
}) {
  const copy =
    state === "failure"
      ? error ?? "Processing failed."
      : state === "success"
        ? "Result is ready to download."
        : state === "processing"
          ? "Processing in progress."
          : state === "queued"
            ? "Queued and waiting for a worker."
            : state === "uploading"
              ? "Uploading your file."
              : idleText;

  return (
    <div
      className={[
        "rounded-xl border px-4 py-3 text-[13px] leading-6",
        state === "failure"
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : state === "success"
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-zinc-200 bg-zinc-50 text-slate-500 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300",
      ].join(" ")}
    >
      {copy}
    </div>
  );
}

function PresetRow<T extends Record<string, unknown>>({
  onApply,
  presets,
}: {
  onApply: (values: Partial<T>) => void;
  presets: Array<PresetButton<T>>;
}) {
  if (presets.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {presets.map((preset) => (
        <button
          className="h-8 rounded-lg border border-slate-200 px-3 text-[13px] text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/5 dark:hover:text-white"
          key={preset.label}
          onClick={() => onApply(preset.values)}
          type="button"
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}

function PreviewZoomControls({
  onFit,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  zoom,
}: {
  onFit: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  zoom: number | "fit";
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        aria-label="Zoom out"
        className="secondary-button h-9 w-9 p-0"
        onClick={onZoomOut}
        type="button"
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className="min-w-[72px] text-center text-sm font-semibold text-slate-600 dark:text-zinc-300">{zoom === "fit" ? "Fit" : `${zoom}%`}</span>
      <button
        aria-label="Zoom in"
        className="secondary-button h-9 w-9 p-0"
        onClick={onZoomIn}
        type="button"
      >
        <Plus className="h-4 w-4" />
      </button>
      <button className="secondary-button h-9 px-3 text-sm" onClick={onZoomReset} type="button">
        100%
      </button>
      <button
        aria-label="Fit to screen"
        className="secondary-button h-9 w-9 p-0"
        onClick={onFit}
        type="button"
      >
        <Maximize2 className="h-4 w-4" />
      </button>
    </div>
  );
}

export function UploadedPdfPreview({
  fileId,
  items,
  pageCount,
}: {
  fileId: string;
  items: PdfPageCard[];
  pageCount: number;
}) {
  const [page, setPage] = useState(1);
  const [failed, setFailed] = useState(false);
  const [naturalSize, setNaturalSize] = useState<{ height: number; width: number } | null>(null);
  const safePage = Math.min(Math.max(page, 1), Math.max(pageCount, 1));
  const zoom = useWorkspaceZoom({ contentSize: naturalSize });
  const dragPan = useDragPan(zoom.viewportRef, {
    enabled: !zoom.fitMode && zoom.effectiveZoom > 100,
  });

  useEffect(() => {
    const node = zoom.viewportRef.current;
    if (!node) {
      return;
    }

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      zoom.zoomByWheel(event.deltaY);
    };

    node.addEventListener("wheel", handleWheel, { passive: false });
    return () => node.removeEventListener("wheel", handleWheel);
  }, [zoom]);

  useEffect(() => {
    setFailed(false);
  }, [fileId, safePage]);

  const displayWidth = naturalSize ? (naturalSize.width * zoom.effectiveZoom) / 100 : undefined;
  const displayHeight = naturalSize ? (naturalSize.height * zoom.effectiveZoom) / 100 : undefined;

  return (
    <div className="space-y-4">
      <PreviewStage className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-white/10">
          <div className="flex items-center gap-2">
            <button
              aria-label="Previous page"
              className="secondary-button h-9 px-3"
              disabled={safePage <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              type="button"
            >
              Prev
            </button>
            <span className="min-w-[92px] text-center text-sm font-semibold text-slate-600 dark:text-zinc-300">
              {safePage} / {Math.max(pageCount, 1)}
            </span>
            <button
              aria-label="Next page"
              className="secondary-button h-9 px-3"
              disabled={safePage >= pageCount}
              onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
              type="button"
            >
              Next
            </button>
          </div>

          <PreviewZoomControls
            onFit={() => {
              zoom.fit();
            }}
            onZoomIn={zoom.zoomIn}
            onZoomOut={zoom.zoomOut}
            onZoomReset={zoom.reset}
            zoom={zoom.fitMode ? "fit" : zoom.zoom}
          />
        </div>

        <div
          className="h-[min(70vh,640px)] overflow-auto bg-slate-100 dark:bg-zinc-950"
          ref={zoom.viewportRef}
          style={{ cursor: dragPan.panCursor }}
        >
          <div className="flex min-h-full min-w-full items-center justify-center p-4 sm:p-6">
            {failed ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                Preview failed, but processing may still work.
              </div>
            ) : (
              <div
                className="relative shrink-0"
                style={
                  displayWidth && displayHeight
                    ? { height: displayHeight, width: displayWidth }
                    : undefined
                }
              >
                <img
                  alt={`Page ${safePage}`}
                  className="block rounded-lg border border-slate-300 bg-white shadow-[0_14px_34px_rgba(15,23,42,0.12)] dark:border-white/10"
                  onError={() => setFailed(true)}
                  onLoad={(event) => {
                    if (event.currentTarget.naturalWidth > 0 && event.currentTarget.naturalHeight > 0) {
                      setNaturalSize({
                        height: event.currentTarget.naturalHeight,
                        width: event.currentTarget.naturalWidth,
                      });
                    }
                  }}
                  src={getPdfPagePreviewUrl(fileId, safePage, 100)}
                  style={
                    displayWidth && displayHeight
                      ? {
                          height: displayHeight,
                          maxHeight: "none",
                          maxWidth: "none",
                          width: displayWidth,
                        }
                      : { maxHeight: "100%", maxWidth: "100%" }
                  }
                />
              </div>
            )}
          </div>
        </div>
      </PreviewStage>

      {items.length > 1 ? (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {items.map((item) => (
            <button
              className={[
                "w-24 shrink-0 rounded-xl border bg-white p-2 text-left transition dark:bg-zinc-900",
                item.pageNumber === safePage
                  ? "border-[#059669] ring-2 ring-[#059669]/15 dark:border-emerald-400"
                  : "border-slate-200 dark:border-white/10",
              ].join(" ")}
              key={item.id}
              onClick={() => setPage(item.pageNumber)}
              type="button"
            >
              <img alt={`Page ${item.pageNumber}`} className="aspect-[1/1.35] w-full rounded object-cover" src={item.thumbnail} />
              <span className="mt-1 block text-center text-xs font-semibold text-slate-500 dark:text-zinc-400">{item.pageNumber}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function UploadedImagePreview({
  alt,
  src,
  height,
  width,
}: {
  alt: string;
  src: string;
  height?: number;
  width?: number;
}) {
  const [failed, setFailed] = useState(false);
  const [naturalSize, setNaturalSize] = useState<{ height: number; width: number } | null>(
    width && height ? { height, width } : null,
  );
  const zoom = useWorkspaceZoom({ contentSize: naturalSize });
  const dragPan = useDragPan(zoom.viewportRef, {
    enabled: !zoom.fitMode && zoom.effectiveZoom > 100,
  });

  useEffect(() => {
    const node = zoom.viewportRef.current;
    if (!node) {
      return;
    }

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      zoom.zoomByWheel(event.deltaY);
    };

    node.addEventListener("wheel", handleWheel, { passive: false });
    return () => node.removeEventListener("wheel", handleWheel);
  }, [zoom]);

  const displayWidth = naturalSize ? (naturalSize.width * zoom.effectiveZoom) / 100 : undefined;
  const displayHeight = naturalSize ? (naturalSize.height * zoom.effectiveZoom) / 100 : undefined;

  return (
    <PreviewStage className="mx-auto max-w-[760px]">
      <div className="flex flex-wrap items-center justify-end gap-3 border-b border-slate-200 px-4 py-3 dark:border-white/10">
        <PreviewZoomControls
          onFit={() => {
            zoom.fit();
          }}
          onZoomIn={zoom.zoomIn}
          onZoomOut={zoom.zoomOut}
          onZoomReset={zoom.reset}
          zoom={zoom.fitMode ? "fit" : zoom.zoom}
        />
      </div>
      <div
        className="preview-checkerboard h-[min(70vh,620px)] overflow-auto bg-slate-100 dark:bg-zinc-950"
        ref={zoom.viewportRef}
        style={{ cursor: dragPan.panCursor }}
      >
        <div className="flex min-h-full min-w-full items-center justify-center p-4 sm:p-6">
          {failed ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
              Preview failed, but processing may still work.
            </div>
          ) : (
            <div
              className="relative shrink-0"
              style={
                displayWidth && displayHeight
                  ? { height: displayHeight, width: displayWidth }
                  : undefined
              }
            >
              <img
                alt={alt}
                className="block rounded-xl border border-slate-200 bg-white shadow-[0_14px_34px_rgba(15,23,42,0.12)] dark:border-white/10"
                onError={() => setFailed(true)}
                onLoad={(event) => {
                  if (event.currentTarget.naturalWidth > 0 && event.currentTarget.naturalHeight > 0) {
                    setNaturalSize({
                      height: event.currentTarget.naturalHeight,
                      width: event.currentTarget.naturalWidth,
                    });
                  }
                }}
                src={src}
                style={
                  displayWidth && displayHeight
                    ? {
                        height: displayHeight,
                        maxHeight: "none",
                        maxWidth: "none",
                        width: displayWidth,
                      }
                    : { maxHeight: "100%", maxWidth: "100%" }
                }
              />
            </div>
          )}
        </div>
      </div>
    </PreviewStage>
  );
}

type SinglePdfWorkspacePageProps<T extends Record<string, unknown>> = {
  buildFormData: (args: {
    file: File;
    items: PdfPageCard[];
    settings: T;
  }) => FormData;
  description: string;
  downloadFilename: (file: File, settings: T) => string;
  emptyDescription: string;
  endpoint: string;
  idleStatusText?: string;
  initialSettings: T;
  layoutKind?: "compact" | "editor";
  presets?: Array<PresetButton<T>>;
  processDisabled?: (args: { file: File | null; items: PdfPageCard[]; settings: T }) => boolean;
  renderCenter?: (args: {
    file: File;
    items: PdfPageCard[];
    pageCount: number;
    selectedPages: string;
    setItems: (items: PdfPageCard[]) => void;
    settings: T;
    update: <K extends keyof T>(key: K, value: T[K]) => void;
  }) => ReactNode;
  rightPanelFooter?: ReactNode;
  sections: Array<ControlSection<T>>;
  showSelectionBar?: boolean;
  showSizeToggle?: boolean;
  title: string;
};

function fileFromMetadata(metadata: UploadedFileMetadata): File {
  return new File([], metadata.original_name || metadata.filename, {
    type: metadata.mime_type || "application/octet-stream",
  });
}

function workspaceSettingsKey(endpoint: string, fileId: string): string {
  return `workspace-settings:${endpoint}:${fileId}`;
}

function fileInfoContent(fileMeta: UploadedFileMetadata | null) {
  const details = uploadedFileDetails(fileMeta);
  if (details.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {details.map((detail) => (
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0" key={detail.label}>
          <span className="text-slate-500">{detail.label}</span>
          <span className="max-w-[60%] text-right font-medium text-slate-900">{detail.value}</span>
        </div>
      ))}
    </div>
  );
}

export function SinglePdfWorkspacePage<T extends Record<string, unknown>>({
  buildFormData,
  description,
  downloadFilename,
  emptyDescription,
  endpoint,
  idleStatusText = "Upload a PDF to start configuring this workspace.",
  initialSettings,
  layoutKind = "compact",
  presets = [],
  processDisabled,
  renderCenter,
  rightPanelFooter,
  sections,
  showSelectionBar = true,
  showSizeToggle = true,
  title,
}: SinglePdfWorkspacePageProps<T>) {
  const pathname = usePathname();
  const router = useRouter();
  const [queryString, setQueryString] = useState("");
  const searchParams = useMemo(() => new URLSearchParams(queryString), [queryString]);
  const uploadAbortRef = useRef<AbortController | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileMeta, setFileMeta] = useState<UploadedFileMetadata | null>(null);
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "failure">("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [uploadSpeedKBs, setUploadSpeedKBs] = useState(0);
  const [uploadRemainingSecs, setUploadRemainingSecs] = useState(0);
  const [uploadedBytes, setUploadedBytes] = useState(0);
  const [uploadTotalBytes, setUploadTotalBytes] = useState(0);
  const [size, setSize] = useState<WorkspaceThumbnailSize>("medium");
  const { merge, state: settings, update } = useObjectState(initialSettings);
  const initialPageCount = Number(fileMeta?.metadata?.page_count ?? fileMeta?.pages ?? 0);
  const { error: previewError, items, pageCount, setItems } = useUploadedPdfPageItems(fileMeta?.file_id ?? null, initialPageCount);
  const { allSelected, deselectAll, selectAll, toggleItem } = usePageSelection(items, setItems);
  const currentFile = file ?? (fileMeta ? fileFromMetadata(fileMeta) : null);
  const job = useWorkspaceJob({
    filename: currentFile ? downloadFilename(currentFile, settings) : "output.pdf",
    prefix: "pdf",
  });

  const syncFileQuery = useCallback(
    (fileId: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (fileId) {
        params.set("file_id", fileId);
      } else {
        params.delete("file_id");
      }
      const query = params.toString();
      setQueryString(query);
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const handleUploadProgress: UploadProgressHandler = (progress) => {
    setUploadPercent(progress.percentage);
    setUploadSpeedKBs(progress.uploadSpeedKBs);
    setUploadRemainingSecs(progress.estimatedSecondsRemaining);
    setUploadedBytes(progress.uploadedBytes);
    setUploadTotalBytes(progress.totalBytes);
  };

  useEffect(() => {
    setQueryString(window.location.search.replace(/^\?/, ""));
  }, [pathname]);

  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      const nextFile = files[0];
      if (!nextFile) {
        return;
      }

      uploadAbortRef.current?.abort();
      const controller = new AbortController();
      uploadAbortRef.current = controller;
      setFile(nextFile);
      setFileMeta(null);
      setItems([]);
      setUploadState("uploading");
      setUploadError(null);
      setUploadPercent(0);
      setUploadSpeedKBs(0);
      setUploadRemainingSecs(0);
      setUploadedBytes(0);
      setUploadTotalBytes(nextFile.size);
      job.reset();

      try {
        const metadata = await uploadFileToWorkspace(nextFile, handleUploadProgress, controller.signal);
        setFileMeta(metadata);
        setUploadState("idle");
        syncFileQuery(metadata.file_id);
      } catch (caughtError) {
        if (controller.signal.aborted) {
          return;
        }
        setUploadState("failure");
        setUploadError(caughtError instanceof Error ? caughtError.message : "Upload failed");
      }
    },
    [job, setItems, syncFileQuery],
  );

  const cancelUpload = useCallback(() => {
    uploadAbortRef.current?.abort();
    uploadAbortRef.current = null;
    setFile(null);
    setFileMeta(null);
    setItems([]);
    setUploadState("idle");
    setUploadError(null);
    setUploadPercent(0);
    setUploadSpeedKBs(0);
    setUploadRemainingSecs(0);
    setUploadedBytes(0);
    setUploadTotalBytes(0);
  }, [setItems]);

  const handleProcess = () => {
    if (!fileMeta || !currentFile) {
      return;
    }

    const formData = buildFormData({ file: currentFile, items, settings });
    formData.delete("file");
    formData.append("file_id", fileMeta.file_id);
    job.process(endpoint, formData);
  };

  useEffect(() => {
    const queryFileId = searchParams.get("file_id");
    if (!queryFileId || fileMeta?.file_id === queryFileId) {
      return;
    }

    let cancelled = false;
    getFileMetadata(queryFileId)
      .then((metadata) => {
        if (!cancelled) {
          setFile(null);
          setFileMeta(metadata);
          setUploadState("idle");
        }
      })
      .catch((caughtError: unknown) => {
        if (!cancelled) {
          setUploadState("failure");
          setUploadError(caughtError instanceof Error ? caughtError.message : "Uploaded file could not be loaded.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [fileMeta?.file_id, searchParams]);

  useEffect(() => {
    if (!fileMeta?.file_id) {
      return;
    }

    const stored = window.localStorage.getItem(workspaceSettingsKey(endpoint, fileMeta.file_id));
    if (!stored) {
      return;
    }

    try {
      merge(JSON.parse(stored) as Partial<T>);
    } catch {
      window.localStorage.removeItem(workspaceSettingsKey(endpoint, fileMeta.file_id));
    }
  }, [endpoint, fileMeta?.file_id]);

  useEffect(() => {
    if (!fileMeta?.file_id) {
      return;
    }
    window.localStorage.setItem(workspaceSettingsKey(endpoint, fileMeta.file_id), JSON.stringify(settings));
  }, [endpoint, fileMeta?.file_id, settings]);

  const disabled = processDisabled?.({ file: currentFile, items, settings }) ?? !fileMeta;
  const selectedPages = selectedPagesLabel(items);
  const downloadPanelContent =
    fileMeta && currentFile && job.state !== "idle" && job.state !== "uploading" && !job.panelDismissed ? (
      <DownloadPanel
        error={job.error}
        errorDetails={job.errorDetails ?? null}
        estimatedTime={estimateProcessingTime(fileMeta.size_bytes, pageCount)}
        jobId={job.jobId}
        notice={job.notice}
        onDownload={job.state === "success" ? job.download : undefined}
        onProcessAnother={() => {
          setFile(null);
          setFileMeta(null);
          setItems([]);
          job.reset();
          syncFileQuery(null);
        }}
        onReedit={job.dismissPanel}
        rateLimitScope={job.rateLimitScope}
        state={job.state === "failure" ? "failure" : job.state === "success" ? "success" : job.state}
        statusText={job.processingLabel ?? undefined}
      />
    ) : null;
  const emptyStateContent = (
    <EmptyPdfWorkspaceState
      description={emptyDescription}
      onFilesSelected={(files) => {
        void handleFilesSelected(files);
      }}
    />
  );
  const rightPanelContent = (
    <div className="space-y-6">
      <SidebarStatus
        error={uploadError ?? job.error}
        idleText={previewError ?? idleStatusText}
        state={uploadState === "failure" ? "failure" : job.state}
      />
      <PresetRow onApply={merge} presets={presets} />
      <WorkspaceControls sections={sections} state={settings} update={update} />
      {rightPanelFooter}
    </div>
  );
  const processingLabel =
    uploadState === "uploading"
      ? "Uploading file"
      : uploadState === "failure"
        ? uploadError ?? "Upload failed"
        : job.processingLabel;
  const uploadOverlayContent =
    file && uploadState === "uploading" ? (
      <UploadProgress
        fileLabel="Uploading file"
        fileName={file.name}
        fileSize={file.size}
        onCancel={cancelUpload}
        percent={uploadPercent}
        remainingSecs={uploadRemainingSecs}
        speedKBs={uploadSpeedKBs}
        totalBytes={uploadTotalBytes}
        uploadedBytes={uploadedBytes}
      />
    ) : null;

  if (layoutKind === "compact") {
    const compactPreview = fileMeta ? (
      renderCenter ? (
        renderCenter({
          file: currentFile ?? fileFromMetadata(fileMeta),
          items,
          pageCount,
          selectedPages,
          setItems,
          settings,
          update,
        })
      ) : (
        <PreviewCard
          badges={[
            pageCount > 0 ? `${pageCount} pages` : "PDF",
            formatBytes(fileMeta.size_bytes),
            fileMeta.metadata?.encrypted ? "Encrypted" : undefined,
          ].filter(Boolean) as string[]}
          description="Compact preview for this PDF job."
          title={fileMeta.original_name ?? currentFile?.name ?? "Uploaded PDF"}
        >
          <img
            alt={`Preview of ${fileMeta.original_name}`}
            className="max-h-[320px] w-auto max-w-full rounded-lg border border-zinc-200 bg-white object-contain shadow-sm"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
            src={getPdfPagePreviewUrl(fileMeta.file_id, 1, 100)}
          />
        </PreviewCard>
      )
    ) : null;

    return (
      <CompactWorkspaceShell
        countLabel={pageCount > 0 ? `${pageCount} pages` : undefined}
        description={description}
        downloadPanel={downloadPanelContent}
        emptyState={emptyStateContent}
        estimatedTime={fileMeta ? estimateProcessingTime(fileMeta.size_bytes, pageCount) : undefined}
        fileInfo={uploadedFileSummary(fileMeta, previewError ?? undefined)}
        fileName={fileMeta?.original_name ?? file?.name}
        hasContent={Boolean(fileMeta)}
        infoContent={fileInfoContent(fileMeta)}
        onDownload={job.state === "success" ? job.download : undefined}
        onFilesDropped={(files) => {
          void handleFilesSelected(files);
        }}
        onProcess={handleProcess}
        onReset={() => {
          setFile(null);
          setFileMeta(null);
          setItems([]);
          job.reset();
          syncFileQuery(null);
        }}
        preview={compactPreview}
        processButtonDisabled={disabled}
        processingLabel={processingLabel}
        settingsPanel={rightPanelContent}
        title={title}
        uploadOverlay={uploadOverlayContent}
      />
    );
  }

  return (
    <PDFWorkspace
      breadcrumbTitle={title}
      countLabel={pageCount > 0 ? `${pageCount} pages` : undefined}
      description={description}
      downloadPanel={downloadPanelContent}
      emptyState={emptyStateContent}
      estimatedTime={fileMeta ? estimateProcessingTime(fileMeta.size_bytes, pageCount) : undefined}
      fileInfo={uploadedFileSummary(fileMeta, previewError ?? undefined)}
      fileName={fileMeta?.original_name ?? file?.name}
      hasContent={Boolean(fileMeta)}
      infoContent={fileInfoContent(fileMeta)}
      onDeselectAll={deselectAll}
      onDownload={job.state === "success" ? job.download : undefined}
      onProcess={handleProcess}
      onReset={() => {
        setFile(null);
        setFileMeta(null);
        setItems([]);
        job.reset();
        syncFileQuery(null);
      }}
      onSelectAll={selectAll}
      processButtonDisabled={disabled}
      processingLabel={processingLabel}
      renderCenter={
        fileMeta ? (
          renderCenter ? (
            renderCenter({
              file: currentFile ?? fileFromMetadata(fileMeta),
              items,
              pageCount,
              selectedPages,
              setItems,
              settings,
              update,
            })
          ) : (
            <UploadedPdfPreview fileId={fileMeta.file_id} items={items} pageCount={pageCount} />
          )
        ) : null
      }
      rightPanel={rightPanelContent}
      selectAllChecked={allSelected}
      setSize={setSize}
      showSelectionBar={showSelectionBar}
      showSizeToggle={showSizeToggle}
      size={size}
      uploadOverlay={uploadOverlayContent}
    />
  );
}

type SingleImageWorkspacePageProps<T extends Record<string, unknown>> = {
  accept?: string;
  buildFormData: (args: { file: File; settings: T }) => FormData;
  description: string;
  downloadFilename: (file: File, settings: T) => string;
  emptyDescription: string;
  endpoint: string;
  idleStatusText?: string;
  initialSettings: T;
  layoutKind?: "compact" | "editor";
  presets?: Array<PresetButton<T>>;
  processDisabled?: (args: { file: File | null; settings: T }) => boolean;
  renderCenter?: (args: {
    file: File;
    preview: ReturnType<typeof useSingleImagePreview>;
    settings: T;
    update: <K extends keyof T>(key: K, value: T[K]) => void;
  }) => ReactNode;
  rightPanelFooter?: ReactNode;
  sections: Array<ControlSection<T>>;
  title: string;
};

export function SingleImageWorkspacePage<T extends Record<string, unknown>>({
  accept = "image/*",
  buildFormData,
  description,
  downloadFilename,
  emptyDescription,
  endpoint,
  idleStatusText = "Upload an image to start configuring this workspace.",
  initialSettings,
  layoutKind = "compact",
  presets = [],
  processDisabled,
  renderCenter,
  rightPanelFooter,
  sections,
  title,
}: SingleImageWorkspacePageProps<T>) {
  const pathname = usePathname();
  const router = useRouter();
  const [queryString, setQueryString] = useState("");
  const searchParams = useMemo(() => new URLSearchParams(queryString), [queryString]);
  const uploadAbortRef = useRef<AbortController | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileMeta, setFileMeta] = useState<UploadedFileMetadata | null>(null);
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "failure">("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [uploadSpeedKBs, setUploadSpeedKBs] = useState(0);
  const [uploadRemainingSecs, setUploadRemainingSecs] = useState(0);
  const [uploadedBytes, setUploadedBytes] = useState(0);
  const [uploadTotalBytes, setUploadTotalBytes] = useState(0);
  const { merge, state: settings, update } = useObjectState(initialSettings);
  const localPreview = useSingleImagePreview(file);
  const currentFile = file ?? (fileMeta ? fileFromMetadata(fileMeta) : null);
  const preview = localPreview ?? (
    fileMeta && currentFile
      ? {
          dataUrl: fileMeta.preview_url,
          file: currentFile,
          format: fileMeta.extension,
          height: Number(fileMeta.metadata?.height ?? 0),
          size: fileMeta.size_bytes,
          width: Number(fileMeta.metadata?.width ?? 0),
        }
      : null
  );
  const job = useWorkspaceJob({
    filename: currentFile ? downloadFilename(currentFile, settings) : "output",
    prefix: "image",
  });

  const syncFileQuery = useCallback(
    (fileId: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (fileId) {
        params.set("file_id", fileId);
      } else {
        params.delete("file_id");
      }
      const query = params.toString();
      setQueryString(query);
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const handleUploadProgress: UploadProgressHandler = (progress) => {
    setUploadPercent(progress.percentage);
    setUploadSpeedKBs(progress.uploadSpeedKBs);
    setUploadRemainingSecs(progress.estimatedSecondsRemaining);
    setUploadedBytes(progress.uploadedBytes);
    setUploadTotalBytes(progress.totalBytes);
  };

  useEffect(() => {
    setQueryString(window.location.search.replace(/^\?/, ""));
  }, [pathname]);

  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      const nextFile = files[0];
      if (!nextFile) {
        return;
      }

      uploadAbortRef.current?.abort();
      const controller = new AbortController();
      uploadAbortRef.current = controller;
      setFile(nextFile);
      setFileMeta(null);
      setUploadState("uploading");
      setUploadError(null);
      setUploadPercent(0);
      setUploadSpeedKBs(0);
      setUploadRemainingSecs(0);
      setUploadedBytes(0);
      setUploadTotalBytes(nextFile.size);
      job.reset();

      try {
        const metadata = await uploadFileToWorkspace(nextFile, handleUploadProgress, controller.signal);
        setFileMeta(metadata);
        setUploadState("idle");
        syncFileQuery(metadata.file_id);
      } catch (caughtError) {
        if (controller.signal.aborted) {
          return;
        }
        setUploadState("failure");
        setUploadError(caughtError instanceof Error ? caughtError.message : "Upload failed");
      }
    },
    [job, syncFileQuery],
  );

  const cancelUpload = useCallback(() => {
    uploadAbortRef.current?.abort();
    uploadAbortRef.current = null;
    setFile(null);
    setFileMeta(null);
    setUploadState("idle");
    setUploadError(null);
    setUploadPercent(0);
    setUploadSpeedKBs(0);
    setUploadRemainingSecs(0);
    setUploadedBytes(0);
    setUploadTotalBytes(0);
  }, []);

  const handleProcess = () => {
    if (!fileMeta || !currentFile) {
      return;
    }

    const formData = buildFormData({ file: currentFile, settings });
    formData.delete("file");
    formData.append("file_id", fileMeta.file_id);
    job.process(endpoint, formData);
  };

  useEffect(() => {
    const queryFileId = searchParams.get("file_id");
    if (!queryFileId || fileMeta?.file_id === queryFileId) {
      return;
    }

    let cancelled = false;
    getFileMetadata(queryFileId)
      .then((metadata) => {
        if (!cancelled) {
          setFile(null);
          setFileMeta(metadata);
          setUploadState("idle");
        }
      })
      .catch((caughtError: unknown) => {
        if (!cancelled) {
          setUploadState("failure");
          setUploadError(caughtError instanceof Error ? caughtError.message : "Uploaded file could not be loaded.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [fileMeta?.file_id, searchParams]);

  useEffect(() => {
    if (!fileMeta?.file_id) {
      return;
    }

    const stored = window.localStorage.getItem(workspaceSettingsKey(endpoint, fileMeta.file_id));
    if (!stored) {
      return;
    }

    try {
      merge(JSON.parse(stored) as Partial<T>);
    } catch {
      window.localStorage.removeItem(workspaceSettingsKey(endpoint, fileMeta.file_id));
    }
  }, [endpoint, fileMeta?.file_id]);

  useEffect(() => {
    if (!fileMeta?.file_id) {
      return;
    }
    window.localStorage.setItem(workspaceSettingsKey(endpoint, fileMeta.file_id), JSON.stringify(settings));
  }, [endpoint, fileMeta?.file_id, settings]);

  const downloadPanelContent =
    fileMeta && job.state !== "idle" && job.state !== "uploading" && !job.panelDismissed ? (
      <DownloadPanel
        error={job.error}
        errorDetails={job.errorDetails ?? null}
        estimatedTime={estimateProcessingTime(fileMeta.size_bytes, 1)}
        jobId={job.jobId}
        notice={job.notice}
        onDownload={job.state === "success" ? job.download : undefined}
        onProcessAnother={() => {
          setFile(null);
          setFileMeta(null);
          job.reset();
          syncFileQuery(null);
        }}
        onReedit={job.dismissPanel}
        rateLimitScope={job.rateLimitScope}
        state={job.state === "failure" ? "failure" : job.state === "success" ? "success" : job.state}
        statusText={job.processingLabel ?? undefined}
      />
    ) : null;
  const emptyStateContent = (
    <EmptyWorkspaceState
      accept={accept}
      description={emptyDescription}
      onFilesSelected={(files) => {
        void handleFilesSelected(files);
      }}
    />
  );
  const rightPanelContent = (
    <div className="space-y-6">
      <SidebarStatus
        error={uploadError ?? job.error}
        idleText={idleStatusText}
        state={uploadState === "failure" ? "failure" : job.state}
      />
      <PresetRow onApply={merge} presets={presets} />
      <WorkspaceControls sections={sections} state={settings} update={update} />
      {rightPanelFooter}
    </div>
  );
  const processingLabel =
    uploadState === "uploading"
      ? "Uploading file"
      : uploadState === "failure"
        ? uploadError ?? "Upload failed"
        : job.processingLabel;
  const uploadOverlayContent =
    file && uploadState === "uploading" ? (
      <UploadProgress
        fileLabel="Uploading file"
        fileName={file.name}
        fileSize={file.size}
        onCancel={cancelUpload}
        percent={uploadPercent}
        remainingSecs={uploadRemainingSecs}
        speedKBs={uploadSpeedKBs}
        totalBytes={uploadTotalBytes}
        uploadedBytes={uploadedBytes}
      />
    ) : null;

  if (layoutKind === "compact") {
    const compactPreview =
      fileMeta && (
        renderCenter ? (
          renderCenter({ file: currentFile ?? fileFromMetadata(fileMeta), preview, settings, update })
        ) : preview ? (
          <PreviewCard
            badges={[
              preview.width > 0 && preview.height > 0 ? `${preview.width} x ${preview.height} px` : undefined,
              formatBytes(fileMeta.size_bytes),
              fileMeta.extension.toUpperCase(),
            ].filter(Boolean) as string[]}
            description="Compact preview for this image job."
            title={fileMeta.original_name ?? currentFile?.name ?? "Uploaded image"}
          >
            <img
              alt={fileMeta.original_name}
              className="max-h-[320px] w-auto max-w-full rounded-lg border border-zinc-200 bg-white object-contain shadow-sm"
              src={preview.dataUrl}
            />
          </PreviewCard>
        ) : null
      );

    return (
      <CompactWorkspaceShell
        countLabel={preview && preview.width > 0 && preview.height > 0 ? `${preview.width} x ${preview.height} px` : undefined}
        description={description}
        downloadPanel={downloadPanelContent}
        emptyState={emptyStateContent}
        estimatedTime={fileMeta ? estimateProcessingTime(fileMeta.size_bytes, 1) : undefined}
        fileInfo={uploadedFileSummary(fileMeta) ?? imageSummary(preview)}
        fileName={fileMeta?.original_name ?? file?.name}
        hasContent={Boolean(fileMeta)}
        infoContent={fileInfoContent(fileMeta)}
        onDownload={job.state === "success" ? job.download : undefined}
        onFilesDropped={(files) => {
          void handleFilesSelected(files);
        }}
        onProcess={handleProcess}
        onReset={() => {
          setFile(null);
          setFileMeta(null);
          job.reset();
          syncFileQuery(null);
        }}
        preview={compactPreview}
        processButtonDisabled={processDisabled?.({ file: currentFile, settings }) ?? !fileMeta}
        processingLabel={processingLabel}
        settingsPanel={rightPanelContent}
        title={title}
        uploadOverlay={uploadOverlayContent}
      />
    );
  }

  return (
    <ImageWorkspace
      breadcrumbTitle={title}
      centerContent={
        fileMeta && (
          renderCenter ? (
            renderCenter({ file: currentFile ?? fileFromMetadata(fileMeta), preview, settings, update })
          ) : (
            preview ? <UploadedImagePreview alt={fileMeta.original_name} height={preview.height} src={preview.dataUrl} width={preview.width} /> : null
          )
        )
      }
      countLabel={preview && preview.width > 0 && preview.height > 0 ? `${preview.width} x ${preview.height} px` : undefined}
      description={description}
      downloadPanel={downloadPanelContent}
      emptyState={emptyStateContent}
      estimatedTime={fileMeta ? estimateProcessingTime(fileMeta.size_bytes, 1) : undefined}
      fileInfo={uploadedFileSummary(fileMeta) ?? imageSummary(preview)}
      fileName={fileMeta?.original_name ?? file?.name}
      hasContent={Boolean(fileMeta)}
      infoContent={fileInfoContent(fileMeta)}
      onDownload={job.state === "success" ? job.download : undefined}
      onProcess={handleProcess}
      onReset={() => {
        setFile(null);
        setFileMeta(null);
        job.reset();
        syncFileQuery(null);
      }}
      processButtonDisabled={processDisabled?.({ file: currentFile, settings }) ?? !fileMeta}
      processingLabel={processingLabel}
      rightPanel={rightPanelContent}
      uploadOverlay={uploadOverlayContent}
    />
  );
}

type MultiImageWorkspacePageProps<T extends Record<string, unknown>> = {
  buildFormData: (args: { files: File[]; settings: T }) => FormData;
  description: string;
  downloadFilename: string;
  emptyDescription: string;
  endpoint: string;
  initialSettings: T;
  presets?: Array<PresetButton<T>>;
  renderCenter: (args: {
    files: File[];
    imageItems: ReturnType<typeof useImagePreviewItems>;
    settings: T;
    setFiles: (files: File[]) => void;
    update: <K extends keyof T>(key: K, value: T[K]) => void;
  }) => ReactNode;
  sections: Array<ControlSection<T>>;
  title: string;
};

export function MultiImageWorkspacePage<T extends Record<string, unknown>>({
  buildFormData,
  description,
  downloadFilename,
  emptyDescription,
  endpoint,
  initialSettings,
  presets = [],
  renderCenter,
  sections,
  title,
}: MultiImageWorkspacePageProps<T>) {
  const [files, setFiles] = useState<File[]>([]);
  const { merge, state: settings, update } = useObjectState(initialSettings);
  const previews = useImagePreviewItems(files);
  const totalBytes = useMemo(
    () => files.reduce((sum, file) => sum + file.size, 0),
    [files],
  );
  const job = useWorkspaceJob({
    filename: downloadFilename,
    prefix: "image",
  });

  const handleProcess = () => {
    if (files.length === 0) {
      return;
    }

    job.process(endpoint, buildFormData({ files, settings }));
  };

  return (
    <ImageWorkspace
      breadcrumbTitle={title}
      centerContent={renderCenter({ files, imageItems: previews, settings, setFiles, update })}
      countLabel={files.length > 0 ? `${files.length} images` : undefined}
      description={description}
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
            statusText={job.processingLabel ?? undefined}
          />
        ) : null
      }
      emptyState={
        <EmptyWorkspaceState
          accept="image/*"
          description={emptyDescription}
          multiple
          onFilesSelected={(nextFiles) => {
            setFiles(nextFiles);
            job.reset();
          }}
        />
      }
      estimatedTime={estimateProcessingTime(totalBytes, files.length)}
      fileInfo={files.length > 0 ? formatBytes(totalBytes) : undefined}
      fileName={files.length > 0 ? `${files.length} files` : undefined}
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
          <SidebarStatus
            error={job.error}
            idleText="Add files to start configuring this workspace."
            state={job.state}
          />
          <PresetRow onApply={merge} presets={presets} />
          <WorkspaceControls sections={sections} state={settings} update={update} />
        </div>
      }
      showSizeToggle
      uploadOverlay={
        files[0] && job.state === "uploading" ? (
          <UploadProgress
            fileName={files.length > 1 ? `${files.length} files` : files[0].name}
            fileSize={totalBytes}
            percent={job.uploadPercent}
            speedKBs={job.uploadSpeedKBs}
          />
        ) : null
      }
    />
  );
}
