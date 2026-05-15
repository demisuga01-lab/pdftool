"use client";

import { useMemo, useRef, useState } from "react";

import { RotateCcwIcon, RotateCwIcon } from "@/components/icons/SiteIcons";
import { DownloadPanel } from "@/components/ui/DownloadPanel";
import { UploadProgress } from "@/components/ui/UploadProgress";
import { WorkspaceControls, type ControlSection } from "@/components/workspace/Controls";
import { EmptyPdfWorkspaceState, PDFThumbnailGrid, type PdfPageCard, type WorkspaceThumbnailSize } from "@/components/workspace/PDFWorkspace";
import { UnifiedWorkspace } from "@/components/workspace/UnifiedWorkspace";
import { estimateProcessingTime, formatBytes, slugifyBaseName } from "@/lib/format";
import { useWorkspaceFiles } from "@/lib/use-workspace-files";
import { useWorkspaceJob } from "@/lib/workspace-job";
import { selectedPagesLabel, uploadedFileDetails, usePageSelection, useUploadedPdfPageItems } from "@/lib/workspace-data";

type RotateSettings = {
  angle: 90 | 180 | 270;
  applyTo: "all" | "selected" | "even" | "odd";
};

const sections: Array<ControlSection<RotateSettings>> = [
  {
    key: "rotate-selection",
    label: "Rotate Selection",
    fields: [
      {
        key: "applyTo",
        label: "Apply to",
        type: "buttonGroup",
        options: [
          { label: "All", value: "all" },
          { label: "Selected", value: "selected" },
          { label: "Even", value: "even" },
          { label: "Odd", value: "odd" },
        ],
      },
    ],
  },
];

function applyRotation(items: PdfPageCard[], matcher: (item: PdfPageCard) => boolean, delta: number) {
  return items.map((item) =>
    matcher(item)
      ? {
          ...item,
          rotation: (((item.rotation ?? 0) + delta) % 360 + 360) % 360,
          selected: true,
        }
      : item,
  );
}

export default function PdfRotatePage() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [size, setSize] = useState<WorkspaceThumbnailSize>("medium");
  const [settings, setSettings] = useState<RotateSettings>({ angle: 90, applyTo: "all" });
  const workspaceFiles = useWorkspaceFiles({ accept: ".pdf,application/pdf" });
  const fileRecord = workspaceFiles.files[0] ?? null;
  const { items, pageCount, setItems } = useUploadedPdfPageItems(fileRecord?.file_id ?? null, Number(fileRecord?.page_count ?? 0));
  const { allSelected, deselectAll, selectAll, toggleItem } = usePageSelection(items, setItems);
  const filename = fileRecord?.display_name ? `${slugifyBaseName(fileRecord.display_name)}-rotated.pdf` : "rotated.pdf";
  const job = useWorkspaceJob({ filename, prefix: "pdf" });

  const selectionMatcher = (item: PdfPageCard) => {
    if (settings.applyTo === "selected") {
      return Boolean(item.selected);
    }
    if (settings.applyTo === "even") {
      return item.pageNumber % 2 === 0;
    }
    if (settings.applyTo === "odd") {
      return item.pageNumber % 2 === 1;
    }
    return true;
  };

  const uniqueAngles = Array.from(new Set(items.filter((item) => (item.rotation ?? 0) > 0).map((item) => item.rotation ?? 0).filter(Boolean)));
  const targetCount = items.filter(selectionMatcher).length;
  const fileInfo = fileRecord ? [fileRecord.page_count ? `${fileRecord.page_count} pages` : undefined, formatBytes(fileRecord.size_bytes)].filter(Boolean).join(" / ") : undefined;

  const infoContent = useMemo(() => {
    const details = uploadedFileDetails(fileRecord);
    if (details.length === 0) {
      return null;
    }
    return (
      <div className="space-y-3">
        {details.map((detail) => (
          <div className="flex items-start justify-between gap-4 border-b border-zinc-100 pb-3 last:border-b-0 last:pb-0 dark:border-white/10" key={detail.label}>
            <span className="text-zinc-500 dark:text-zinc-400">{detail.label}</span>
            <span className="max-w-[60%] text-right font-medium text-zinc-900 dark:text-zinc-100">{detail.value}</span>
          </div>
        ))}
      </div>
    );
  }, [fileRecord]);

  const handleProcess = () => {
    if (!fileRecord) {
      return;
    }

    const formData = new FormData();
    formData.append("file_id", fileRecord.file_id);
    formData.append("angle", String(settings.angle));

    let pages = "all";
    if (settings.applyTo === "selected") {
      pages = selectedPagesLabel(items);
    } else if (settings.applyTo === "even") {
      pages = items.filter((item) => item.pageNumber % 2 === 0).map((item) => item.pageNumber).join(",");
    } else if (settings.applyTo === "odd") {
      pages = items.filter((item) => item.pageNumber % 2 === 1).map((item) => item.pageNumber).join(",");
    }
    formData.append("pages", pages);
    formData.append("output_filename", fileRecord.display_name ? `${slugifyBaseName(fileRecord.display_name)}-rotated` : "rotated");
    void job.process("pdf/rotate", formData, { timeoutKind: "fast" });
  };

  return (
    <>
      <input
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={(event) => {
          void workspaceFiles.addFiles(Array.from(event.target.files ?? []), "replace");
          job.reset();
        }}
        ref={inputRef}
        type="file"
      />
      <UnifiedWorkspace
        countLabel={pageCount > 0 ? `${pageCount} pages` : undefined}
        description="Rotate a single uploaded PDF from one shared page grid. Rotation previews update immediately before processing."
        downloadPanel={
          fileRecord && job.state !== "idle" && job.state !== "uploading" && !job.panelDismissed ? (
            <DownloadPanel
              error={job.error}
              errorDetails={job.errorDetails ?? null}
              estimatedTime={estimateProcessingTime(fileRecord.size_bytes, pageCount)}
              jobId={job.jobId}
              notice={job.notice}
              onDownload={job.state === "success" ? job.download : undefined}
              onProcessAnother={() => {
                workspaceFiles.resetFiles();
                setItems([]);
                job.reset();
              }}
              onReedit={job.dismissPanel}
              rateLimitScope={job.rateLimitScope}
              state={job.state === "failure" ? "failure" : job.state === "success" ? "success" : job.state}
            />
          ) : null
        }
        editor={
          fileRecord ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm shadow-black/5 dark:border-white/10 dark:bg-zinc-900">
                <div>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Live page rotation preview</p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Choose a rotation angle, then the page thumbnails rotate immediately in the grid.</p>
                </div>
                <button className="secondary-button min-h-11 px-4" onClick={() => inputRef.current?.click()} type="button">
                  Replace PDF
                </button>
              </div>
              <PDFThumbnailGrid
                items={items}
                onReorder={setItems}
                onToggleSelect={toggleItem}
                renderHoverActions={(item) => (
                  <div className="flex gap-2">
                    <button
                      className="rounded-lg border border-white/80 bg-white/90 px-3 py-2 text-sm text-zinc-700 shadow-sm transition hover:bg-white dark:border-white/15 dark:bg-zinc-900/90 dark:text-zinc-200 dark:hover:bg-zinc-950"
                      onClick={() =>
                        setItems(items.map((entry) => (
                          entry.id === item.id ? { ...entry, rotation: (((entry.rotation ?? 0) + 270) % 360 + 360) % 360, selected: true } : entry
                        )))
                      }
                      type="button"
                    >
                      <RotateCcwIcon className="h-4 w-4" />
                    </button>
                    <button
                      className="rounded-lg border border-white/80 bg-white/90 px-3 py-2 text-sm text-zinc-700 shadow-sm transition hover:bg-white dark:border-white/15 dark:bg-zinc-900/90 dark:text-zinc-200 dark:hover:bg-zinc-950"
                      onClick={() =>
                        setItems(items.map((entry) => (
                          entry.id === item.id ? { ...entry, rotation: (((entry.rotation ?? 0) + 90) % 360 + 360) % 360, selected: true } : entry
                        )))
                      }
                      type="button"
                    >
                      <RotateCwIcon className="h-4 w-4" />
                    </button>
                  </div>
                )}
                size={size}
              />
            </div>
          ) : null
        }
        emptyState={
          <EmptyPdfWorkspaceState
            description="Upload a PDF to review its pages and adjust rotation before processing."
            onFilesSelected={(nextFiles) => {
              void workspaceFiles.addFiles(nextFiles, "replace");
              job.reset();
            }}
          />
        }
        estimatedTime={fileRecord ? estimateProcessingTime(fileRecord.size_bytes, pageCount) : undefined}
        fileInfo={fileInfo}
        fileName={fileRecord?.display_name}
        hasContent={Boolean(fileRecord)}
        infoContent={infoContent}
        kind="grid"
        onDownload={job.state === "success" ? job.download : undefined}
        onFilesDropped={(nextFiles) => {
          void workspaceFiles.addFiles(nextFiles, "replace");
          job.reset();
        }}
        onProcess={handleProcess}
        onReset={() => {
          workspaceFiles.resetFiles();
          setItems([]);
          job.reset();
        }}
        processButtonDisabled={!fileRecord || targetCount === 0 || uniqueAngles.length > 1}
        processButtonLabel="Rotate PDF"
        processingLabel={
          workspaceFiles.uploadState === "uploading"
            ? "Uploading file"
            : workspaceFiles.uploadState === "failure"
              ? workspaceFiles.uploadError ?? "Upload failed"
              : job.processingLabel
        }
        resultPanel={
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-[13px] leading-6 text-zinc-600 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-300">
            {targetCount} pages will be rotated {settings.angle} degrees.
          </div>
        }
        settingsPanel={
          <div className="space-y-6">
            <div
              className={[
                "rounded-xl border px-4 py-3 text-[13px] leading-6",
                workspaceFiles.uploadState === "failure" || job.state === "failure"
                  ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200"
                  : job.state === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200"
                    : "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-300",
              ].join(" ")}
            >
              {workspaceFiles.uploadState === "failure"
                ? workspaceFiles.uploadError ?? "Upload failed."
                : job.state === "failure"
                  ? job.error ?? "Rotation failed."
                  : uniqueAngles.length > 1
                    ? "Use one rotation angle per run. This backend applies one angle to the chosen page set."
                    : "This rotate workspace is single-PDF by design. Drop a new PDF anywhere in the workspace to replace the current one."}
            </div>

            <WorkspaceControls
              sections={sections}
              state={settings}
              update={(key, value) => setSettings((current) => ({ ...current, [key]: value }))}
            />

            <div className="space-y-4 border-t border-zinc-200 pt-6 dark:border-white/10">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">Rotate Selection</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { angle: 90 as const, label: "90 CW", icon: RotateCwIcon },
                  { angle: 180 as const, label: "180", icon: RotateCwIcon },
                  { angle: 270 as const, label: "90 CCW", icon: RotateCcwIcon },
                ].map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      className={[
                        "flex h-11 items-center justify-center gap-2 rounded-lg border text-[14px] transition",
                        settings.angle === option.angle
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-400 dark:bg-emerald-500/10 dark:text-emerald-300"
                          : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-white/5",
                      ].join(" ")}
                      key={option.label}
                      onClick={() => {
                        setSettings((current) => ({ ...current, angle: option.angle }));
                        setItems(applyRotation(items, selectionMatcher, option.angle === 270 ? -90 : option.angle));
                      }}
                      type="button"
                    >
                      <Icon className="h-4 w-4" />
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4 border-t border-zinc-200 pt-6 dark:border-white/10">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">Page Selection</p>
              <div className="grid grid-cols-2 gap-2">
                <button className="secondary-button min-h-10" onClick={selectAll} type="button">Select all</button>
                <button className="secondary-button min-h-10" onClick={() => setItems(items.map((item) => ({ ...item, selected: item.pageNumber % 2 === 0 })))} type="button">Select even</button>
                <button className="secondary-button min-h-10" onClick={() => setItems(items.map((item) => ({ ...item, selected: item.pageNumber % 2 === 1 })))} type="button">Select odd</button>
                <button className="secondary-button min-h-10" onClick={deselectAll} type="button">Clear</button>
              </div>
            </div>

            <div className="space-y-3 border-t border-zinc-200 pt-6 dark:border-white/10">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">Grid Size</p>
              <div className="grid grid-cols-3 gap-2">
                {(["small", "medium", "large"] as const).map((value) => (
                  <button
                    className={[
                      "secondary-button min-h-10",
                      size === value ? "border-emerald-500 text-emerald-700 dark:border-emerald-400 dark:text-emerald-300" : "",
                    ].join(" ")}
                    key={value}
                    onClick={() => setSize(value)}
                    type="button"
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
          </div>
        }
        title="Rotate PDF"
        uploadOverlay={
          workspaceFiles.uploadState === "uploading" && workspaceFiles.pendingFiles.length > 0 ? (
            <UploadProgress
              fileLabel="Uploading PDF"
              fileName={workspaceFiles.pendingFiles[0]?.name ?? "PDF"}
              fileSize={workspaceFiles.pendingFiles[0]?.size ?? 0}
              onCancel={workspaceFiles.cancelUpload}
              percent={workspaceFiles.uploadPercent}
              remainingSecs={workspaceFiles.uploadRemainingSecs}
              speedKBs={workspaceFiles.uploadSpeedKBs}
              totalBytes={workspaceFiles.uploadTotalBytes}
              uploadedBytes={workspaceFiles.uploadedBytes}
            />
          ) : null
        }
      />
    </>
  );
}
