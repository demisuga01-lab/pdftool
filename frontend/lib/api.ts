export type JobStatus = {
  job_id: string;
  status: "queued" | "processing" | "success" | "failure";
  stage?: "uploading" | "preparing" | "processing" | "finalizing" | "queued" | string;
  progress?: number;
  output_path?: string;
  output_paths?: string[];
  output_filename?: string;
  media_type?: string;
  extension?: string;
  queue_position?: number;
  estimated_seconds_remaining?: number;
  result?: any;
  error?: string;
  traceback?: string;
};

export type ApiResponse = {
  job_id: string;
  status: string;
  message: string;
};

const API_BASE_URL = "/api";
const NETWORK_ERROR_MESSAGE = "Cannot connect to processing server. Please try again in a moment.";
const JOB_TIMEOUT_MESSAGE = "This job took longer than expected and was stopped in the workspace. You can retry or process another file.";
const MISSING_RESULT_MESSAGE = "Processing finished but no download URL was returned.";
const NOT_FOUND_MESSAGE = "The processing endpoint or result was not found. Please check route registration and job output.";

const JOB_TIMEOUTS_MS = {
  fast: 90 * 1000,
  heavy: 5 * 60 * 1000,
  ocr: 5 * 60 * 1000,
};

export function toApiPath(endpoint: string): string {
  return `${API_BASE_URL}/${endpoint.replace(/^\/+/, "")}`;
}

function normalizeStatus(status: string): JobStatus["status"] {
  const normalized = status.toLowerCase();

  if (["success", "completed", "complete", "done", "ready"].includes(normalized)) {
    return "success";
  }

  if (["failure", "failed", "error"].includes(normalized)) {
    return "failure";
  }

  if (["processing", "started", "running"].includes(normalized)) {
    return "processing";
  }

  return "queued";
}

async function parseResponse<T>(response: Response): Promise<T> {
  const rawText = await response.text().catch(() => "");
  let data: Record<string, unknown> | null = null;
  try {
    data = rawText ? (JSON.parse(rawText) as Record<string, unknown>) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    const detail =
      typeof data?.detail === "string"
        ? data.detail
        : typeof data?.error === "string"
          ? data.error
          : rawText.trim() || "Request failed";
    const normalizedDetail = response.status === 404 ? `${NOT_FOUND_MESSAGE}\n\nTechnical details: ${detail}` : detail;

    if (process.env.NODE_ENV !== "production") {
      console.error("API request failed", {
        status: response.status,
        url: response.url,
        detail: normalizedDetail,
      });
    }

    throw new Error(normalizedDetail);
  }

  return data as T;
}

function normalizeNetworkError(error: unknown, fallbackMessage: string): Error {
  if (error instanceof TypeError) {
    return new Error(fallbackMessage);
  }

  if (error instanceof Error) {
    if (/fetch failed|network|load failed/i.test(error.message)) {
      return new Error(fallbackMessage);
    }

    return error;
  }

  return new Error(fallbackMessage);
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException
    ? error.name === "AbortError"
    : error instanceof Error && error.name === "AbortError";
}

function abortError(): DOMException {
  return new DOMException("The operation was aborted.", "AbortError");
}

async function waitForPollInterval(intervalMs: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) {
    throw abortError();
  }

  await new Promise<void>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      cleanup();
      resolve();
    }, intervalMs);

    const handleAbort = () => {
      window.clearTimeout(timeoutId);
      cleanup();
      reject(abortError());
    };

    const cleanup = () => {
      signal?.removeEventListener("abort", handleAbort);
    };

    signal?.addEventListener("abort", handleAbort, { once: true });
  });
}

export async function getJobStatus(
  prefix: "pdf" | "image" | "convert" | "compress",
  jobId: string,
  signal?: AbortSignal,
): Promise<JobStatus> {
  let response: Response;

  try {
    response = await fetch(toApiPath(`${prefix}/status/${jobId}`), {
      cache: "no-store",
      signal,
    });
  } catch (error: unknown) {
    if (isAbortError(error)) {
      throw error;
    }

    throw normalizeNetworkError(error, NETWORK_ERROR_MESSAGE);
  }

  const data = await parseResponse<Record<string, unknown>>(response);
  const normalizedStatus = normalizeStatus(String(data.status ?? "queued"));
  const outputPath = typeof data.output_path === "string" ? data.output_path : undefined;
  const outputPaths = Array.isArray(data.output_paths) ? data.output_paths.map((path) => String(path)) : undefined;
  const outputFilename = typeof data.output_filename === "string" ? data.output_filename : undefined;
  const error = typeof data.error === "string" ? data.error : undefined;
  const result = data.result;
  const successWithoutDownload =
    normalizedStatus === "success" &&
    !outputPath &&
    (!outputPaths || outputPaths.length === 0);

  return {
    job_id: String(data.job_id ?? jobId),
    status: normalizedStatus,
    stage: typeof data.stage === "string" ? data.stage : undefined,
    progress: typeof data.progress === "number" ? data.progress : undefined,
    output_path: outputPath,
    output_paths: outputPaths,
    output_filename: outputFilename,
    media_type: typeof data.media_type === "string" ? data.media_type : undefined,
    extension: typeof data.extension === "string" ? data.extension : undefined,
    queue_position: typeof data.queue_position === "number" ? data.queue_position : undefined,
    estimated_seconds_remaining:
      typeof data.estimated_seconds_remaining === "number" ? data.estimated_seconds_remaining : undefined,
    result,
    error: successWithoutDownload ? MISSING_RESULT_MESSAGE : error,
    traceback: typeof data.traceback === "string" ? data.traceback : undefined,
  };
}

export async function pollJobStatus(
  prefix: "pdf" | "image" | "convert" | "compress",
  jobId: string,
  signal?: AbortSignal,
  onUpdate?: (status: JobStatus) => void,
  timeoutKind: "fast" | "heavy" | "ocr" = "heavy",
): Promise<JobStatus> {
  const startedAt = Date.now();

  while (true) {
    if (signal?.aborted) {
      throw abortError();
    }

    let status: JobStatus;

    try {
      status = await getJobStatus(prefix, jobId, signal);
    } catch (error: unknown) {
      if (isAbortError(error)) {
        throw error;
      }

      throw normalizeNetworkError(error, NETWORK_ERROR_MESSAGE);
    }

    onUpdate?.(status);

    if (status.status === "success" && status.error) {
      return {
        ...status,
        status: "failure",
      };
    }

    if (status.status === "success" || status.status === "failure") {
      return status;
    }

    if (Date.now() - startedAt >= JOB_TIMEOUTS_MS[timeoutKind]) {
      throw new Error(JOB_TIMEOUT_MESSAGE);
    }

    await waitForPollInterval(Date.now() - startedAt > 30_000 ? 3000 : 1000, signal);
  }
}

export function downloadFile(prefix: "pdf" | "image" | "convert" | "compress", jobId: string, filename: string): void {
  const link = document.createElement("a");
  link.href = toApiPath(`${prefix}/download/${jobId}`);
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
