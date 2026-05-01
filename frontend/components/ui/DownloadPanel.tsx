"use client";

import { Download, LoaderCircle, PencilLine, RotateCcw } from "lucide-react";

type DownloadPanelState = "queued" | "processing" | "success" | "failure";

export function DownloadPanel({
  downloadLabel,
  error,
  errorDetails: _errorDetails,
  estimatedTime,
  helperText,
  jobId,
  notice,
  onDownload,
  onProcessAgain,
  onProcessAnother,
  onReedit,
  outputFilename,
  outputSize,
  queuePosition,
  rateLimitScope,
  state,
  statusText,
}: {
  downloadLabel?: string;
  error?: string | null;
  errorDetails?: string | null;
  estimatedTime?: string;
  helperText?: string;
  jobId?: string | null;
  notice?: string | null;
  onDownload?: () => void;
  onProcessAgain?: () => void;
  onProcessAnother?: () => void;
  onReedit?: () => void;
  outputFilename?: string;
  outputSize?: string;
  queuePosition?: number | null;
  rateLimitScope?: "job" | "status" | "download" | null;
  state: DownloadPanelState;
  statusText?: string;
}) {
  const isReady = state === "success";
  const isFailed = state === "failure";
  const isJobRateLimited = isFailed && rateLimitScope === "job";
  const supportSubject = jobId
    ? `Processing%20issue%20-%20Job%20${encodeURIComponent(jobId)}`
    : "Processing%20issue";
  const readyLabel = downloadLabel?.trim() || "Download file";

  return (
    <div className="max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain rounded-2xl border border-zinc-200/70 bg-white/88 p-4 shadow-[0_24px_70px_rgba(15,23,42,0.14)] backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/82 dark:shadow-[0_28px_80px_rgba(0,0,0,0.42)] sm:p-5">
      <div className="space-y-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-[#059669] dark:text-emerald-300">Download status</p>
          <h2 className="text-lg font-bold text-slate-900 dark:text-zinc-100 sm:text-xl">
            {isReady
              ? "Your file is ready"
              : isJobRateLimited
                ? "Rate limit reached"
                : isFailed
                ? "Processing failed"
                : "Processing your file..."}
          </h2>
          <p className="text-sm font-medium leading-6 text-slate-500 dark:text-zinc-400">
            {isReady
              ? "Download the finished file or jump back into the workspace."
              : isJobRateLimited
                ? error ?? "Too many requests were sent in a short period."
              : isFailed
                ? error ?? "Something went wrong while preparing your file."
                : "Keep this panel open while we finish preparing your download."}
          </p>
        </div>

        {!isReady && !isFailed ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600 dark:bg-zinc-950 dark:text-zinc-300">
              <LoaderCircle className="h-4 w-4 animate-spin text-[#059669]" />
              <span>{statusText ?? (state === "queued" ? "Queued" : "Processing")}</span>
            </div>
            {queuePosition ? <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">Position {queuePosition} in queue</p> : null}
            {estimatedTime ? <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">{estimatedTime}</p> : null}
          </div>
        ) : null}

        {notice && !isFailed ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium leading-6 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            {notice}
          </div>
        ) : null}

        {isReady && (outputFilename || outputSize) ? (
          <div className="rounded-xl border border-zinc-200/70 bg-zinc-50/90 px-4 py-3 text-sm font-medium text-slate-600 dark:border-white/10 dark:bg-zinc-950/80 dark:text-zinc-300">
            {outputFilename ? <p className="truncate text-slate-700 dark:text-zinc-100">{outputFilename}</p> : null}
            {outputSize ? <p>{outputSize}</p> : null}
            {helperText ? <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-zinc-400">{helperText}</p> : null}
          </div>
        ) : null}

        {isFailed && !isJobRateLimited ? (
          <div className="space-y-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
            <p>
              If this keeps happening, contact{" "}
              <a
                className="font-semibold underline decoration-rose-300 underline-offset-2 hover:decoration-rose-500"
                href={`mailto:support@wellfriend.online?subject=${supportSubject}`}
              >
                support@wellfriend.online
              </a>
              {jobId ? ` with job ID ${jobId}` : ""}.
            </p>
            <p>
              You can also join the{" "}
              <a
                className="font-semibold underline decoration-rose-300 underline-offset-2 hover:decoration-rose-500"
                href="https://discord.gg/ZQFmYaQbVu"
                rel="noreferrer"
                target="_blank"
              >
                WellFriend Corp Discord
              </a>{" "}
              for community help and updates.
            </p>
          </div>
        ) : null}

        <div className="grid gap-3">
          {isReady && onDownload ? (
            <button className="primary-button h-12 w-full gap-2 text-sm sm:text-base" onClick={onDownload} type="button">
              <Download className="h-5 w-5" />
              {readyLabel}
            </button>
          ) : null}
          {onReedit ? (
            <button className="secondary-button w-full gap-2" onClick={onReedit} type="button">
              <PencilLine className="h-4 w-4" />
              Re-edit
            </button>
          ) : null}
          {onProcessAgain ? (
            <button className="secondary-button w-full gap-2" onClick={onProcessAgain} type="button">
              <RotateCcw className="h-4 w-4" />
              Try again
            </button>
          ) : null}
          {onProcessAnother ? (
            <button className="secondary-button w-full gap-2" onClick={onProcessAnother} type="button">
              <RotateCcw className="h-4 w-4" />
              Process another file
            </button>
          ) : null}
        </div>

        {jobId ? <p className="text-center text-xs font-medium text-slate-400 dark:text-zinc-500">Job ID: {jobId}</p> : null}
      </div>
    </div>
  );
}
