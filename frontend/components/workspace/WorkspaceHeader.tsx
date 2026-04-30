"use client";

import { useState, type ReactNode } from "react";
import { Info, X } from "lucide-react";

import { DownloadIcon, RefreshIcon } from "@/components/icons/SiteIcons";

type WorkspaceHeaderProps = {
  countLabel?: string;
  fileInfo?: string;
  fileName?: string;
  infoContent?: ReactNode;
  onDownload?: () => void;
  onReset?: () => void;
  processingLabel?: string | null;
  title: string;
};

function fileInfoParts(fileInfo?: string, countLabel?: string): string[] {
  const parts = (fileInfo ?? "")
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);
  if (countLabel && !parts.includes(countLabel)) {
    parts.unshift(countLabel);
  }
  return parts;
}

type StatusInfo = { label: string; color: "active" | "green" | "red" | "amber" };

function statusInfo(label?: string | null): StatusInfo | null {
  const normalized = (label ?? "").trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  if (normalized.includes("upload")) {
    return { label: "Uploading", color: "active" };
  }
  if (normalized.includes("queue")) {
    return { label: "Queued", color: "amber" };
  }
  if (normalized.includes("process")) {
    return { label: "Processing", color: "active" };
  }
  if (normalized.includes("fail") || normalized.includes("error")) {
    return { label: "Failed", color: "red" };
  }
  if (normalized.includes("complete") || normalized.includes("ready") || normalized.includes("success")) {
    return { label: "Complete", color: "green" };
  }
  return null;
}

const statusColors: Record<string, string> = {
  active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  green: "border-emerald-200 bg-emerald-50 text-emerald-700",
  red: "border-rose-200 bg-rose-50 text-rose-700",
  amber: "border-amber-200 bg-amber-50 text-amber-700",
};

const statusDotColors: Record<string, string> = {
  active: "bg-[#059669]",
  green: "bg-emerald-500",
  red: "bg-rose-500",
  amber: "bg-amber-400",
};

export function WorkspaceHeader({
  countLabel,
  fileInfo,
  fileName,
  infoContent,
  onDownload,
  onReset,
  processingLabel,
  title,
}: WorkspaceHeaderProps) {
  const [infoOpen, setInfoOpen] = useState(false);
  const metaParts = fileInfoParts(fileInfo, countLabel);
  const status = statusInfo(processingLabel);

  return (
    <>
      <div className="border-b border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-zinc-950 sm:px-6">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-zinc-500">
              PDFTools / {title}
            </p>
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5">
              {fileName ? (
                <span className="min-w-0 max-w-[240px] truncate font-mono text-[13px] font-medium text-slate-800 dark:text-zinc-100 sm:max-w-[360px] md:max-w-none">
                  {fileName}
                </span>
              ) : null}
              {metaParts.map((part) => (
                <span
                  className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-400"
                  key={part}
                >
                  {part}
                </span>
              ))}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {status ? (
              <div
                className={[
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-semibold",
                  statusColors[status.color],
                ].join(" ")}
              >
                <span className={["h-1.5 w-1.5 rounded-full", statusDotColors[status.color]].join(" ")} />
                <span>{status.label}</span>
              </div>
            ) : null}
            {infoContent ? (
              <button
                aria-label="File details"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700 dark:border-white/10 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white"
                onClick={() => setInfoOpen(true)}
                type="button"
              >
                <Info className="h-4 w-4" />
              </button>
            ) : null}
            {onDownload ? (
              <button
                className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-[13px] font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:text-zinc-200 dark:hover:bg-white/5"
                onClick={onDownload}
                type="button"
              >
                <DownloadIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Download</span>
                <span className="sm:hidden">Save</span>
              </button>
            ) : null}
            {onReset ? (
              <button
                className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-[13px] font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:text-zinc-200 dark:hover:bg-white/5"
                onClick={onReset}
                type="button"
              >
                <RefreshIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Process another</span>
                <span className="sm:hidden">New file</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>
      {infoOpen && infoContent ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4"
          onClick={() => setInfoOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-t-2xl border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-zinc-900 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-white/10">
              <h2 className="text-base font-semibold text-slate-900 dark:text-zinc-100">File details</h2>
              <button
                aria-label="Close"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-zinc-500 dark:hover:bg-white/5 dark:hover:text-white"
                onClick={() => setInfoOpen(false)}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[65dvh] overflow-y-auto overscroll-contain p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] text-sm text-slate-700 dark:text-zinc-300">{infoContent}</div>
          </div>
        </div>
      ) : null}
    </>
  );
}
