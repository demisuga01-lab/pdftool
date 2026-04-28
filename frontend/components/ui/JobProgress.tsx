"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Download, X } from "lucide-react";

import { downloadFile, type JobStatus, pollJobStatus } from "@/lib/api";
import { useGlobalSettings } from "@/lib/settings";

type JobProgressProps = {
  jobId?: string | null;
  prefix: "pdf" | "image";
  filename: string;
  onComplete?: (status: JobStatus) => void;
  onReset?: () => void;
};

type ProgressState = "idle" | "uploading" | "queued" | "processing" | "success" | "failure";

const stateCopy: Record<Exclude<ProgressState, "idle">, string> = {
  uploading: "Uploading your file...",
  queued: "Waiting in queue...",
  processing: "Processing your file...",
  success: "Done!",
  failure: "Something went wrong",
};

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException
    ? error.name === "AbortError"
    : error instanceof Error && error.name === "AbortError";
}

export function JobProgress({ jobId, prefix, filename, onComplete, onReset }: JobProgressProps) {
  const [state, setState] = useState<ProgressState>("idle");
  const [result, setResult] = useState<JobStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { globalSettings } = useGlobalSettings();
  const mountedRef = useRef(false);
  const timeoutRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeJobIdRef = useRef<string | null>(null);
  const terminalStateRef = useRef<Extract<ProgressState, "success" | "failure"> | null>(null);
  const autoDownloadedRef = useRef<string | null>(null);
  const onCompleteRef = useRef(onComplete);
  const onResetRef = useRef(onReset);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    onResetRef.current = onReset;
  }, [onReset]);

  const clearPollingTimeout = () => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  useEffect(() => {
    mountedRef.current = true;

    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    clearPollingTimeout();

    if (!jobId) {
      activeJobIdRef.current = null;
      terminalStateRef.current = null;
      setState("idle");
      setResult(null);
      setError(null);
      return () => {
        mountedRef.current = false;
        clearPollingTimeout();
      };
    }

    activeJobIdRef.current = jobId;
    terminalStateRef.current = null;
    autoDownloadedRef.current = null;
    setState("uploading");
    setResult(null);
    setError(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    timeoutRef.current = window.setTimeout(() => {
      if (
        !mountedRef.current ||
        controller.signal.aborted ||
        activeJobIdRef.current !== jobId ||
        terminalStateRef.current
      ) {
        return;
      }

      setState("queued");

      timeoutRef.current = window.setTimeout(() => {
        if (
          !mountedRef.current ||
          controller.signal.aborted ||
          activeJobIdRef.current !== jobId ||
          terminalStateRef.current
        ) {
          return;
        }

        setState("processing");
        timeoutRef.current = null;
      }, 2050);
    }, 150);

    pollJobStatus(prefix, jobId, controller.signal)
      .then((finalStatus) => {
        if (
          !mountedRef.current ||
          controller.signal.aborted ||
          activeJobIdRef.current !== jobId
        ) {
          return;
        }

        const terminalStatus = finalStatus.status === "failure" ? "failure" : "success";

        terminalStateRef.current = terminalStatus;
        clearPollingTimeout();
        setResult(finalStatus);
        setState(terminalStatus);
        setError(finalStatus.error ?? null);
        onCompleteRef.current?.(finalStatus);
      })
      .catch((caughtError: unknown) => {
        if (
          isAbortError(caughtError) ||
          !mountedRef.current ||
          controller.signal.aborted ||
          activeJobIdRef.current !== jobId
        ) {
          return;
        }

        const nextError =
          caughtError instanceof Error ? caughtError.message : "Unable to fetch job status.";

        terminalStateRef.current = "failure";
        clearPollingTimeout();
        setResult(null);
        setState("failure");
        setError(nextError);
      });

    return () => {
      mountedRef.current = false;
      controller.abort();
      clearPollingTimeout();
    };
  }, [jobId, prefix]);

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

  useEffect(() => {
    if (
      !globalSettings.autoDownload ||
      state !== "success" ||
      !jobId ||
      !result?.output_path ||
      autoDownloadedRef.current === jobId
    ) {
      return;
    }

    autoDownloadedRef.current = jobId;
    downloadFile(prefix, jobId, filename);
  }, [filename, globalSettings.autoDownload, jobId, prefix, result?.output_path, state]);

  const handleReset = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    clearPollingTimeout();
    activeJobIdRef.current = null;
    terminalStateRef.current = null;

    if (mountedRef.current) {
      setState("idle");
      setResult(null);
      setError(null);
    }

    onResetRef.current?.();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-sm">
        <span
          className={[
            "h-2.5 w-2.5 rounded-full",
            state === "success"
              ? "bg-emerald-500"
              : state === "failure"
                ? "bg-rose-500"
                : state === "processing"
                  ? "animate-pulse bg-[#2563EB]"
                  : "bg-slate-300",
          ].join(" ")}
        />
        <span className="font-medium text-[#111827]">{statusText}</span>
        {jobId ? <span className="font-mono text-xs text-slate-400">{jobId}</span> : null}
      </div>

      {isActive && state === "processing" ? (
        <div className="h-1 w-full overflow-hidden rounded-full bg-slate-200">
          <div className="h-full w-2/3 animate-pulse rounded-full bg-[#2563EB]" />
        </div>
      ) : null}

      {state === "failure" ? (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-600">
          <X className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error ?? "The job failed."}</span>
        </div>
      ) : null}

      {state === "success" ? (
        <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4">
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
            <Check className="h-4 w-4" />
            <span>{result?.result ? "Result is ready." : "Done!"}</span>
          </div>
          {result?.output_path ? (
            <button
              className="primary-button w-full gap-2"
              onClick={() => downloadFile(prefix, jobId ?? "", filename)}
              type="button"
            >
              <Download className="h-4 w-4" />
              Download file
            </button>
          ) : null}
          {onReset ? (
            <button className="secondary-button w-full" onClick={handleReset} type="button">
              Process Another File
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
