"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { downloadFile, pollJobStatus, type JobStatus } from "@/lib/api";
import { uploadWithProgress } from "@/lib/upload";

type ProcessingState = "idle" | "uploading" | "queued" | "processing" | "success" | "failure";

export function useWorkspaceJob({
  filename,
  prefix,
}: {
  filename: string;
  prefix: "pdf" | "image" | "convert" | "compress";
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [queryString, setQueryString] = useState("");
  const searchParams = useMemo(() => new URLSearchParams(queryString), [queryString]);
  const [state, setState] = useState<ProcessingState>("idle");
  const [jobId, setJobId] = useState<string | null>(null);
  const [result, setResult] = useState<JobStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [panelDismissed, setPanelDismissed] = useState(false);
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

  const startPolling = useCallback(
    async (nextJobId: string, controller: AbortController) => {
      const finalStatus = await pollJobStatus(
        prefix,
        nextJobId,
        controller.signal,
        (nextStatus) => {
          if (nextStatus.status === "queued" || nextStatus.status === "processing") {
            setState(nextStatus.status);
          }
        },
      );
      setResult(finalStatus);
      setState(finalStatus.status);
      setError(finalStatus.error ?? null);
      return finalStatus;
    },
    [prefix],
  );

  const process = useCallback(
    async (endpoint: string, formData: FormData) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setState("uploading");
      setError(null);
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
        setJobId(nextJobId);
        syncJobQuery(nextJobId);
        setState("queued");
        return await startPolling(nextJobId, controller);
      } catch (caughtError) {
        if (controller.signal.aborted) {
          return null;
        }

        setState("failure");
        setError(caughtError instanceof Error ? caughtError.message : "Unable to process file");
        return null;
      }
    },
    [startPolling, syncJobQuery],
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState("idle");
    setJobId(null);
    setResult(null);
    setError(null);
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

    startPolling(queryJobId, controller).catch((caughtError: unknown) => {
      if (controller.signal.aborted) {
        return;
      }

      setState("failure");
      setError(caughtError instanceof Error ? caughtError.message : "Unable to resume job");
    });

    return () => controller.abort();
  }, [jobId, queryJobId, startPolling]);

  const processingLabel = useMemo(() => {
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
  }, [error, state]);

  const download = useCallback(() => {
    if (!jobId) {
      return;
    }
    downloadFile(prefix, jobId, filename);
  }, [filename, jobId, prefix]);

  return {
    download,
    dismissPanel,
    error,
    jobId,
    panelDismissed,
    process,
    processingLabel,
    reset,
    result,
    state,
    cancelUpload,
    uploadPercent,
    uploadRemainingSecs,
    uploadSpeedKBs,
  };
}
