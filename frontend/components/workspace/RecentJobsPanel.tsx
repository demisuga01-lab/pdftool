"use client";

import Link from "next/link";
import { Check, Clipboard, Download, ExternalLink, X } from "lucide-react";
import { useMemo, useState } from "react";

import { upsertRecentJob, useRecentJobs, type RecentJob, type RecentJobStatus } from "@/lib/recent-jobs";

function parseContentDispositionFilename(headerValue: string | null): string | undefined {
  if (!headerValue) {
    return undefined;
  }

  const utf8Match = headerValue.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const quotedMatch = headerValue.match(/filename="([^"]+)"/i);
  if (quotedMatch?.[1]) {
    return quotedMatch[1];
  }

  const plainMatch = headerValue.match(/filename=([^;]+)/i);
  return plainMatch?.[1]?.trim();
}

function relativeTime(value: string): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    return "recently";
  }

  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) {
    return "just now";
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function statusClass(status: RecentJobStatus): string {
  if (status === "success") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200";
  }
  if (status === "failed" || status === "expired") {
    return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200";
  }
  if (status === "processing") {
    return "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200";
  }
  return "border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300";
}

function labelForStatus(status: RecentJobStatus): string {
  if (status === "failed") {
    return "failed";
  }
  return status;
}

function readableOutputMode(value?: string): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }
  return trimmed.replace(/_/g, " ");
}

async function downloadRecentJob(job: RecentJob): Promise<void> {
  if (!job.downloadUrl) {
    return;
  }

  const response = await fetch(job.downloadUrl, {
    cache: "no-store",
    headers: job.accessToken ? { "X-Access-Token": job.accessToken } : undefined,
  });
  if (response.status === 404 || response.status === 410) {
    upsertRecentJob({
      ...job,
      errorMessage: "This temporary download is no longer available. Run the tool again.",
      status: "expired",
    });
    return;
  }
  if (!response.ok) {
    upsertRecentJob({
      ...job,
      errorMessage: "Download could not be started. The result may have expired.",
      status: job.status === "success" ? "unknown" : job.status,
    });
    return;
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download =
    parseContentDispositionFilename(response.headers.get("Content-Disposition")) ||
    job.outputFilename ||
    job.originalFilename ||
    `${job.id}.download`;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

export function RecentJobsPanel() {
  const { clear, jobs, refresh, remove } = useRecentJobs();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const visibleJobs = useMemo(() => jobs.slice(0, 10), [jobs]);

  const handleCopy = async (id: string) => {
    await navigator.clipboard.writeText(id);
    setCopiedId(id);
    window.setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 1400);
  };

  return (
    <section className="space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-zinc-950 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">Recent Jobs</p>
          <p className="text-sm font-medium leading-6 text-zinc-500 dark:text-zinc-400">
            Recent jobs are saved only in this browser. Downloads are temporary and may expire.
          </p>
        </div>
        {visibleJobs.length > 0 ? (
          <button
            className="shrink-0 text-xs font-semibold text-zinc-500 transition hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-300"
            onClick={() => {
              clear();
              refresh();
            }}
            type="button"
          >
            Clear all
          </button>
        ) : null}
      </div>

      {visibleJobs.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-200 bg-white px-3 py-3 text-sm font-medium text-zinc-500 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-400">
          Jobs you run from this browser will appear here.
        </p>
      ) : (
        <div className="space-y-2">
          {visibleJobs.map((job) => (
            <article className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-white/10 dark:bg-zinc-900" key={job.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={["rounded-full border px-2 py-0.5 text-[11px] font-semibold", statusClass(job.status)].join(" ")}>
                      {labelForStatus(job.status)}
                    </span>
                    <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500">{relativeTime(job.updatedAt)}</span>
                  </div>
                  <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{job.toolName || job.route || "PDFTools job"}</p>
                  {job.originalFilename ? (
                    <p className="truncate font-mono text-xs text-zinc-500 dark:text-zinc-400">{job.originalFilename}</p>
                  ) : null}
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {[job.fileType?.toUpperCase(), job.approximateFileSize].filter(Boolean).join(" / ") || `Job ${job.id}`}
                  </p>
                  {job.outputMode || job.outputType || typeof job.selectedPageCount === "number" || typeof job.activePageCount === "number" ? (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {[
                        readableOutputMode(job.outputMode),
                        job.outputType?.toUpperCase(),
                        typeof job.selectedPageCount === "number" ? `${job.selectedPageCount} pages` : undefined,
                        typeof job.activePageCount === "number" ? `${job.activePageCount} active` : undefined,
                      ].filter(Boolean).join(" / ")}
                    </p>
                  ) : null}
                  {job.errorMessage ? <p className="text-xs leading-5 text-rose-600 dark:text-rose-300">{job.errorMessage}</p> : null}
                </div>
                <button
                  aria-label="Remove recent job"
                  className="secondary-button h-8 w-8 shrink-0 p-0 text-zinc-400 hover:text-rose-600"
                  onClick={() => remove(job.id)}
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                {job.route ? (
                  <Link className="secondary-button h-9 gap-1 px-2 text-xs" href={job.route}>
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open tool
                  </Link>
                ) : (
                  <span />
                )}
                <button
                  className="secondary-button h-9 gap-1 px-2 text-xs"
                  disabled={!job.downloadUrl || downloadingId === job.id || job.status === "expired"}
                  onClick={async () => {
                    setDownloadingId(job.id);
                    try {
                      await downloadRecentJob(job);
                    } finally {
                      setDownloadingId(null);
                      refresh();
                    }
                  }}
                  type="button"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </button>
                <button
                  className="secondary-button h-9 gap-1 px-2 text-xs"
                  onClick={() => void handleCopy(job.id)}
                  type="button"
                >
                  {copiedId === job.id ? <Check className="h-3.5 w-3.5" /> : <Clipboard className="h-3.5 w-3.5" />}
                  {copiedId === job.id ? "Copied" : "Copy ID"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
