"use client";

import { useState } from "react";
import { Download, LoaderCircle, PencilLine, RotateCcw } from "lucide-react";

type DownloadPanelState = "queued" | "processing" | "success" | "failure";

export function DownloadPanel({
  error,
  errorDetails,
  estimatedTime,
  jobId,
  onDownload,
  onProcessAgain,
  onProcessAnother,
  onReedit,
  outputFilename,
  outputSize,
  queuePosition,
  state,
  statusText,
}: {
  error?: string | null;
  errorDetails?: string | null;
  estimatedTime?: string;
  jobId?: string | null;
  onDownload?: () => void;
  onProcessAgain?: () => void;
  onProcessAnother?: () => void;
  onReedit?: () => void;
  outputFilename?: string;
  outputSize?: string;
  queuePosition?: number | null;
  state: DownloadPanelState;
  statusText?: string;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const isReady = state === "success";
  const isFailed = state === "failure";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-900/12 dark:border-white/10 dark:bg-zinc-900 dark:shadow-black/35">
      <div className="space-y-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-[#059669] dark:text-emerald-300">Download status</p>
          <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100">
            {isReady
              ? "Your file is ready"
              : isFailed
                ? "Processing failed"
                : "Processing your file..."}
          </h2>
          <p className="text-sm font-medium leading-6 text-slate-500 dark:text-zinc-400">
            {isReady
              ? "Download the finished file or jump back into the workspace."
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

        {isReady && (outputFilename || outputSize) ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-300">
            {outputFilename ? <p className="truncate text-slate-700 dark:text-zinc-100">{outputFilename}</p> : null}
            {outputSize ? <p>{outputSize}</p> : null}
          </div>
        ) : null}

        {isFailed && errorDetails ? (
          <div className="space-y-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
            <button
              className="text-sm font-semibold text-rose-700"
              onClick={() => setShowDetails((current) => !current)}
              type="button"
            >
              {showDetails ? "Hide details" : "View details"}
            </button>
            {showDetails ? (
              <pre className="overflow-x-auto whitespace-pre-wrap break-words text-xs font-medium text-rose-700">
                {errorDetails}
              </pre>
            ) : null}
          </div>
        ) : null}

        <div className="grid gap-3">
          {isReady && onDownload ? (
            <button className="primary-button h-12 w-full gap-2 text-base" onClick={onDownload} type="button">
              <Download className="h-5 w-5" />
              Download File
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
