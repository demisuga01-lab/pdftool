"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { ApiRateLimitError, downloadFile, pollJobStatus, toApiPath, type JobStatus } from "@/lib/api";
import { upsertRecentJob, type RecentJobStatus } from "@/lib/recent-jobs";
import { uploadWithProgress } from "@/lib/upload";

type ProcessingState = "idle" | "uploading" | "queued" | "processing" | "success" | "failure";
type TimeoutKind = "fast" | "heavy" | "ocr";

export type WorkspaceJobMetadata = {
  outputMode?: string;
  outputType?: string;
  selectedPageCount?: number;
};

type ProcessOptions = {
  recentMetadata?: WorkspaceJobMetadata;
  timeoutKind?: TimeoutKind;
};

export function useWorkspaceJob({
  approximateFileSize,
  fileType,
  filename,
  inputFileName,
  prefix,
  timeoutKind = "heavy",
  toolName,
}: {
  approximateFileSize?: string;
  fileType?: string;
  filename: string;
  inputFileName?: string;
  prefix: "pdf" | "image" | "convert" | "compress";
  timeoutKind?: TimeoutKind;
  toolName?: string;
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
  const recentMetadataRef = useRef<WorkspaceJobMetadata>({});
  const queryJobId = searchParams.get("job_id");

  const metadataFromStatus = useCallback((status: JobStatus): WorkspaceJobMetadata => {
    const result = status.result && typeof status.result === "object" ? status.result as Record<string, unknown> : {};
    return {
      outputMode: typeof result.mode === "string" ? result.mode : undefined,
      outputType: typeof result.output_type === "string" ? result.output_type : undefined,
      selectedPageCount: typeof result.selected_page_count === "number" ? result.selected_page_count : undefined,
    };
  }, []);

  const writeRecentJob = useCallback(
    (
      nextJobId: string,
      status: RecentJobStatus,
      updates: {
        errorMessage?: string | null;
        outputFilename?: string;
        recentMetadata?: WorkspaceJobMetadata;
      } = {},
    ) => {
      const metadata = {
        ...recentMetadataRef.current,
        ...updates.recentMetadata,
      };
      upsertRecentJob({
        approximateFileSize,
        downloadUrl: toApiPath(`${prefix}/download/${nextJobId}`),
        errorMessage: updates.errorMessage ?? undefined,
        fileType,
        id: nextJobId,
        originalFilename: inputFileName || filename,
        outputFilename: updates.outputFilename || filename,
        outputMode: metadata.outputMode,
        outputType: metadata.outputType,
        prefix,
        route: pathname,
        selectedPageCount: metadata.selectedPageCount,
        status,
        toolName,
      });
    },
    [approximateFileSize, fileType, filename, inputFileName, pathname, prefix, toolName],
  );

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
    const resultMetadata = metadataFromStatus(finalStatus);
    recentMetadataRef.current = {
      ...recentMetadataRef.current,
      ...resultMetadata,
    };
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
    writeRecentJob(
      finalStatus.job_id,
      finalStatus.status === "success" && !finalStatus.error ? "success" : "failed",
      {
        errorMessage: finalStatus.error ?? null,
        outputFilename: finalStatus.output_filename,
        recentMetadata: resultMetadata,
      },
    );
  }, [metadataFromStatus, writeRecentJob]);

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
            writeRecentJob(nextJobId, nextStatus.status, {
              errorMessage: nextStatus.error ?? null,
              outputFilename: nextStatus.output_filename,
            });
          }
        },
        nextTimeoutKind,
      );
      applyFinalStatus(finalStatus);
      return finalStatus;
    },
    [applyFinalStatus, prefix, writeRecentJob],
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
      let startedJobId: string | null = null;

      try {
        recentMetadataRef.current = options?.recentMetadata ?? {};
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
        startedJobId = nextJobId;
        setJobId(nextJobId);
        syncJobQuery(nextJobId);
        setState("queued");
        writeRecentJob(nextJobId, "queued");
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
        const failedJobId = startedJobId ?? jobId;
        if (failedJobId) {
          writeRecentJob(failedJobId, "failed", { errorMessage: nextError });
        }
        return null;
      }
    },
    [jobId, startPolling, state, syncJobQuery, timeoutKind, writeRecentJob],
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
    writeRecentJob(queryJobId, "queued");

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
      const nextError = caughtError instanceof Error ? caughtError.message : "Unable to resume job";
      setError(nextError);
      setErrorDetails(null);
      writeRecentJob(queryJobId, "failed", { errorMessage: nextError });
    });

    return () => controller.abort();
  }, [jobId, queryJobId, startPolling, timeoutKind, writeRecentJob]);

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

  const resultOutputFilename = result?.output_filename;

  const download = useCallback(async () => {
    if (!jobId) {
      return;
    }
    try {
      await downloadFile(prefix, jobId, resultOutputFilename ?? filename);
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
        if (/not found|expired/i.test(caughtError.message)) {
          writeRecentJob(jobId, "expired", {
            errorMessage: "This temporary download is no longer available. Run the tool again.",
            outputFilename: resultOutputFilename,
          });
        }
      }
    }
  }, [filename, jobId, prefix, resultOutputFilename, writeRecentJob]);

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
