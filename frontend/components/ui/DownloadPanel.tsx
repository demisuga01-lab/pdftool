"use client";

import { Check, Clipboard, Download, LoaderCircle, Mail, PencilLine, RotateCcw } from "lucide-react";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";

import { trackEvent } from "@/lib/matomo";

type DownloadPanelState = "queued" | "processing" | "success" | "failure";

function cleanReportValue(value?: string | null): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }

  return trimmed
    .replace(/[A-Za-z]:\\[^\s]+/g, "[path]")
    .replace(/\/(?:opt|tmp|var|home)\/[^\s]+/g, "[path]")
    .slice(0, 600);
}

function analyticsToolNameFromPath(pathname: string, fallback?: string) {
  return pathname.replace(/\//g, "_").replace(/^_/, "") || fallback?.toLowerCase().replace(/[^a-z0-9]+/g, "_") || "unknown_tool";
}

export function DownloadPanel({
  approxFileSize,
  downloadLabel,
  error,
  errorDetails: _errorDetails,
  estimatedTime,
  fileName,
  fileType,
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
  readyTitle,
  reportFields,
  routePath,
  state,
  statusText,
  toolName,
}: {
  approxFileSize?: string;
  downloadLabel?: string;
  error?: string | null;
  errorDetails?: string | null;
  estimatedTime?: string;
  fileName?: string;
  fileType?: string;
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
  readyTitle?: string;
  reportFields?: Array<{ label: string; value?: string | number | null }>;
  routePath?: string;
  state: DownloadPanelState;
  statusText?: string;
  toolName?: string;
}) {
  const pathname = usePathname();
  const [copied, setCopied] = useState(false);
  const isReady = state === "success";
  const isFailed = state === "failure";
  const isJobRateLimited = isFailed && rateLimitScope === "job";
  const readyLabel = downloadLabel?.trim() || "Download file";
  const resolvedRoute = routePath || pathname;
  const reportDetails = useMemo(() => {
    const rows = [
      ["Tool", cleanReportValue(toolName)],
      ["Route", cleanReportValue(resolvedRoute)],
      ["Job ID", cleanReportValue(jobId ?? undefined)],
      ["File", cleanReportValue(fileName)],
      ["File type", cleanReportValue(fileType)],
      ["Approx size", cleanReportValue(approxFileSize)],
      ...(reportFields ?? []).map((field) => [field.label, cleanReportValue(field.value == null ? undefined : String(field.value))]),
      ["Time", new Date().toISOString()],
      ["Status", state],
      ["Error", cleanReportValue(error) ?? "Processing failed."],
    ].filter(([, value]) => Boolean(value));

    return [
      "PDFTools failure report",
      ...rows.map(([label, value]) => `${label}: ${value}`),
      "Support: support@wellfriend.online",
    ].join("\n");
  }, [approxFileSize, error, fileName, fileType, jobId, reportFields, resolvedRoute, state, toolName]);
  const supportSubject = encodeURIComponent(`PDFTools job failure: ${toolName || resolvedRoute || "job"}`);
  const supportBody = encodeURIComponent(reportDetails);
  const mailtoHref = `mailto:support@wellfriend.online?subject=${supportSubject}&body=${supportBody}`;
  const analyticsToolName = analyticsToolNameFromPath(pathname, toolName);

  const copyReport = async () => {
    await navigator.clipboard.writeText(reportDetails);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain rounded-2xl border border-zinc-200/70 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.14)] dark:border-white/10 dark:bg-zinc-900 dark:shadow-[0_28px_80px_rgba(0,0,0,0.42)] sm:p-5">
      <div className="space-y-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-[#059669] dark:text-emerald-300">Download status</p>
          <h2 className="text-lg font-bold text-slate-900 dark:text-zinc-100 sm:text-xl">
            {isReady
              ? readyTitle?.trim() || "Your file is ready"
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

        {isReady ? (
          <div className="space-y-3 rounded-xl border border-zinc-200/70 bg-zinc-50 px-4 py-3 text-sm font-medium text-slate-600 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-300">
            {outputFilename ? <p className="truncate text-slate-700 dark:text-zinc-100">{outputFilename}</p> : null}
            {outputSize ? <p>{outputSize}</p> : null}
            {helperText ? <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-zinc-400">{helperText}</p> : null}
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100">
              <p className="font-semibold">Downloads are temporary. Save your result now.</p>
              <p>
                Results may be cleaned up after the retention window.{" "}
                <span title="PDFTools is not permanent file storage.">Why?</span>
              </p>
            </div>
          </div>
        ) : null}

        {isFailed && !isJobRateLimited ? (
          <div className="space-y-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
            <div className="space-y-1">
              <p className="font-semibold">Include these details when reporting a repeated failure.</p>
              <p className="text-rose-700/80 dark:text-rose-100/80">Sensitive internals such as paths, tracebacks, and backend logs are not included.</p>
            </div>
            <pre className="max-h-36 overflow-auto whitespace-pre-wrap rounded-lg border border-rose-200 bg-white/70 p-3 text-xs font-medium leading-5 text-rose-800 dark:border-rose-400/20 dark:bg-zinc-950/60 dark:text-rose-100">
              {reportDetails}
            </pre>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                className="secondary-button h-10 gap-2 border-rose-200 bg-white/70 text-rose-700 hover:bg-white dark:border-rose-400/20 dark:bg-zinc-950/60 dark:text-rose-100"
                onClick={() => void copyReport()}
                type="button"
              >
                {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                {copied ? "Copied" : "Copy report details"}
              </button>
              <a
                className="secondary-button h-10 gap-2 border-rose-200 bg-white/70 text-rose-700 hover:bg-white dark:border-rose-400/20 dark:bg-zinc-950/60 dark:text-rose-100"
                href={mailtoHref}
              >
                <Mail className="h-4 w-4" />
                Email support
              </a>
            </div>
          </div>
        ) : null}

        <div className="grid gap-3">
          {isReady && onDownload ? (
            <button
              className="primary-button h-12 w-full gap-2 text-sm sm:text-base"
              onClick={() => {
                trackEvent("Tool", "file_downloaded", analyticsToolName);
                onDownload();
              }}
              type="button"
            >
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
