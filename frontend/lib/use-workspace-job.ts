"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { ApiRateLimitError, downloadFile, pollJobStatus, type JobStatus } from "@/lib/api";
import { uploadWithProgress } from "@/lib/upload";

type ProcessingState = "idle" | "uploading" | "queued" | "processing" | "success" | "failure";
type TimeoutKind = "fast" | "heavy" | "ocr";

type ProcessOptions = {
  timeoutKind?: TimeoutKind;
};

export function useWorkspaceJob({
  filename,
  prefix,
  timeoutKind = "heavy",
}: {
  filename: string;
  prefix: "pdf" | "image" | "convert" | "compress";
  timeoutKind?: TimeoutKind;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [queryString, setQueryString] = useState("");
  const searchParams = useMemo(() => new URLSearchParams(queryString), [queryString]);
  const [state, setState] = useState<ProcessingState>("idle");
  const [jobId, setJobId] = useState<string | null>(null);
  const [result, setResult] = useState<JobStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [panelDismissed, setPanelDismissed] = useState(false);
  const [rateLimitScope, setRateLimitScope] = useState<"job" | "status" | "download" | null>(null);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [uploadSpeedKBs, setUploadSpeedKBs] = useState(0);
  const [uploadRemainingSecs, setUploadRemainingSecs] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const queryJobId = searchParams.get("job_id");

  const syncJobQuery = useCallback(
    (nextJobId: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextJobId) {
        params.set("job_id", nextJobId);
      } else {
        params.delete("job_id");
      }

      const nextQuery = params.toString();
      setQueryString(nextQuery);
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const applyFinalStatus = useCallback((finalStatus: JobStatus) => {
    const failed = finalStatus.status === "failure";
    setResult(finalStatus);
    setState(finalStatus.status);
    setError(finalStatus.error ?? null);
    setErrorDetails(null);
    setNotice(null);
    setRateLimitScope(null);
    if (finalStatus.status === "success" && !failed && !finalStatus.output_path && !finalStatus.output_paths?.length) {
      setState("failure");
      setError(finalStatus.error ?? "Processing finished but no download URL was returned.");
    }
  }, []);

  const startPolling = useCallback(
    async (nextJobId: string, controller: AbortController, nextTimeoutKind: TimeoutKind) => {
      const finalStatus = await pollJobStatus(
        prefix,
        nextJobId,
        controller.signal,
        (nextStatus) => {
          setResult(nextStatus);
          setNotice(nextStatus.notice ?? null);
          setRateLimitScope(nextStatus.notice ? "status" : null);
          if (nextStatus.status === "queued" || nextStatus.status === "processing") {
            setState(nextStatus.status);
            setError(nextStatus.notice ? null : (nextStatus.error ?? null));
            setErrorDetails(null);
          }
        },
        nextTimeoutKind,
      );
      applyFinalStatus(finalStatus);
      return finalStatus;
    },
    [applyFinalStatus, prefix],
  );

  const process = useCallback(
    async (endpoint: string, formData: FormData, options?: ProcessOptions) => {
      if (state === "uploading" || state === "queued" || state === "processing") {
        return null;
      }
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setState("uploading");
      setError(null);
      setErrorDetails(null);
      setNotice(null);
      setRateLimitScope(null);
      setResult(null);
      setPanelDismissed(false);
      setUploadPercent(0);
      setUploadSpeedKBs(0);
      setUploadRemainingSecs(0);

      try {
        const response = await uploadWithProgress(
          endpoint,
          formData,
          (percent, speedKBs, remainingSecs) => {
            setUploadPercent(percent);
            setUploadSpeedKBs(speedKBs);
            setUploadRemainingSecs(remainingSecs);
          },
          controller.signal,
        );
        const nextJobId = String(response.job_id ?? "");
        if (!nextJobId) {
          throw new Error("Processing did not return a job ID.");
        }
        setJobId(nextJobId);
        syncJobQuery(nextJobId);
        setState("queued");
        return await startPolling(nextJobId, controller, options?.timeoutKind ?? timeoutKind);
      } catch (caughtError) {
        if (controller.signal.aborted) {
          return null;
        }

        if (caughtError instanceof ApiRateLimitError && caughtError.scope === "job") {
          setState("failure");
          setError(caughtError.message);
          setNotice(null);
          setRateLimitScope("job");
          setErrorDetails(null);
          return null;
        }

        const nextError = caughtError instanceof Error ? caughtError.message : "Unable to process file";
        setState("failure");
        setRateLimitScope(null);
        setNotice(null);
        setError(nextError);
        setErrorDetails(null);
        return null;
      }
    },
    [startPolling, state, syncJobQuery, timeoutKind],
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState("idle");
    setJobId(null);
    setResult(null);
    setError(null);
    setErrorDetails(null);
    setNotice(null);
    setRateLimitScope(null);
    setPanelDismissed(false);
    setUploadPercent(0);
    setUploadSpeedKBs(0);
    setUploadRemainingSecs(0);
    syncJobQuery(null);
  }, [syncJobQuery]);

  const dismissPanel = useCallback(() => {
    setPanelDismissed(true);
  }, []);

  const cancelUpload = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState("idle");
    setUploadPercent(0);
    setUploadSpeedKBs(0);
    setUploadRemainingSecs(0);
    setNotice(null);
    setRateLimitScope(null);
  }, []);

  useEffect(() => {
    setQueryString(window.location.search.replace(/^\?/, ""));
  }, [pathname]);

  useEffect(() => {
    if (!queryJobId || jobId) {
      return;
    }

    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;
    setJobId(queryJobId);
    setState("queued");
    setPanelDismissed(false);

    startPolling(queryJobId, controller, timeoutKind).catch((caughtError: unknown) => {
      if (controller.signal.aborted) {
        return;
      }

      if (caughtError instanceof ApiRateLimitError && caughtError.scope === "job") {
        setState("failure");
        setError(caughtError.message);
        setRateLimitScope("job");
        setNotice(null);
        setErrorDetails(null);
        return;
      }

      setState("failure");
      setRateLimitScope(null);
      setNotice(null);
      setError(caughtError instanceof Error ? caughtError.message : "Unable to resume job");
      setErrorDetails(null);
    });

    return () => controller.abort();
  }, [jobId, queryJobId, startPolling, timeoutKind]);

  const processingLabel = useMemo(() => {
    if (notice && rateLimitScope === "status" && (state === "queued" || state === "processing")) {
      return notice;
    }
    switch (state) {
      case "uploading":
        return "Uploading file";
      case "queued":
        return "Waiting in queue";
      case "processing":
        return "Processing";
      case "success":
        return "Ready";
      case "failure":
        return error ?? "Failed";
      default:
        return null;
    }
  }, [error, notice, rateLimitScope, state]);

  const download = useCallback(async () => {
    if (!jobId) {
      return;
    }
    try {
      await downloadFile(prefix, jobId, result?.output_filename ?? filename);
      setNotice(null);
      setRateLimitScope(null);
    } catch (caughtError) {
      if (caughtError instanceof ApiRateLimitError && caughtError.scope === "download") {
        setNotice(caughtError.message);
        setRateLimitScope("download");
        return;
      }
      if (caughtError instanceof Error) {
        setNotice(caughtError.message);
        setRateLimitScope(null);
      }
    }
  }, [filename, jobId, prefix, result?.output_filename]);

  return {
    cancelUpload,
    dismissPanel,
    download,
    error,
    errorDetails,
    jobId,
    panelDismissed,
    process,
    processingLabel,
    notice,
    rateLimitScope,
    reset,
    result,
    state,
    uploadPercent,
    uploadRemainingSecs,
    uploadSpeedKBs,
  };
}
