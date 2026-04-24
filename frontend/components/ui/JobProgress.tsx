"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Download, LoaderCircle } from "lucide-react";

import { downloadFile, type JobStatus, pollJobStatus } from "@/lib/api";

type JobProgressProps = {
  jobId?: string | null;
  prefix: "pdf" | "image";
  filename: string;
  onComplete?: (status: JobStatus) => void;
};

type ProgressState = "idle" | "uploading" | "queued" | "processing" | "success" | "failure";

const stateCopy: Record<Exclude<ProgressState, "idle">, string> = {
  uploading: "Uploading files",
  queued: "Queued for processing",
  processing: "Processing your file",
  success: "Completed successfully",
  failure: "Something went wrong",
};

export function JobProgress({ jobId, prefix, filename, onComplete }: JobProgressProps) {
  const [state, setState] = useState<ProgressState>("idle");
  const [result, setResult] = useState<JobStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) {
      setState("idle");
      setResult(null);
      setError(null);
      return;
    }

    let cancelled = false;
    const queuedTimer = window.setTimeout(() => {
      if (!cancelled) {
        setState("queued");
      }
    }, 150);
    const processingTimer = window.setTimeout(() => {
      if (!cancelled) {
        setState("processing");
      }
    }, 2200);

    setState("uploading");
    setResult(null);
    setError(null);

    pollJobStatus(prefix, jobId)
      .then((finalStatus) => {
        if (cancelled) {
          return;
        }

        setResult(finalStatus);
        setState(finalStatus.status);
        setError(finalStatus.error ?? null);
        onComplete?.(finalStatus);
      })
      .catch((caughtError: unknown) => {
        if (cancelled) {
          return;
        }

        const nextError =
          caughtError instanceof Error ? caughtError.message : "Unable to fetch job status.";

        setState("failure");
        setError(nextError);
      });

    return () => {
      cancelled = true;
      window.clearTimeout(queuedTimer);
      window.clearTimeout(processingTimer);
    };
  }, [jobId, onComplete, prefix]);

  const statusText = useMemo(() => {
    if (state === "idle") {
      return "Waiting for a job";
    }

    return stateCopy[state];
  }, [state]);

  if (state === "idle") {
    return null;
  }

  const isActive = state === "uploading" || state === "queued" || state === "processing";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/85">
      <div className="flex items-start gap-3">
        <div
          className={[
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
            state === "success"
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
              : state === "failure"
                ? "bg-rose-500/10 text-rose-600 dark:text-rose-300"
                : "bg-sky-500/10 text-sky-600 dark:text-sky-300",
          ].join(" ")}
        >
          {state === "success" ? (
            <CheckCircle2 className="h-6 w-6" />
          ) : state === "failure" ? (
            <AlertCircle className="h-6 w-6" />
          ) : (
            <LoaderCircle className="h-6 w-6 animate-spin" />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{statusText}</p>
            {jobId ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Job ID: <span className="font-mono">{jobId}</span>
              </p>
            ) : null}
          </div>

          {isActive ? (
            <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div className="h-full w-2/3 animate-pulse rounded-full bg-sky-500" />
            </div>
          ) : null}

          {state === "failure" ? (
            <p className="text-sm text-rose-700 dark:text-rose-300">{error ?? "The job failed."}</p>
          ) : null}

          {state === "success" ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                {result?.result ? "Result is ready." : "Your file is ready to download."}
              </p>
              {result?.output_path ? (
                <button
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
                  onClick={() => downloadFile(prefix, jobId ?? "", filename)}
                  type="button"
                >
                  <Download className="h-4 w-4" />
                  Download
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
