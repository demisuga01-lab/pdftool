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
  retry_after_seconds?: number;
  bucket?: string;
  notice?: string;
  result?: any;
  error?: string;
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

type RateLimitScope = "job" | "status" | "download" | "request";

type ParseResponseOptions = {
  rateLimitScope?: RateLimitScope;
};

export class ApiRateLimitError extends Error {
  bucket?: string;
  retryAfterSeconds?: number;
  scope: RateLimitScope;

  constructor(
    message: string,
    {
      bucket,
      retryAfterSeconds,
      scope,
    }: {
      bucket?: string;
      retryAfterSeconds?: number;
      scope: RateLimitScope;
    },
  ) {
    super(message);
    this.name = "ApiRateLimitError";
    this.bucket = bucket;
    this.retryAfterSeconds = retryAfterSeconds;
    this.scope = scope;
  }
}

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

function parseRetryAfterSeconds(response: Response, data: Record<string, unknown> | null): number | undefined {
  const jsonRetryAfter = Number(data?.retry_after_seconds);
  if (Number.isFinite(jsonRetryAfter) && jsonRetryAfter > 0) {
    return Math.max(1, Math.ceil(jsonRetryAfter));
  }

  const headerValue = response.headers.get("Retry-After");
  const headerSeconds = Number(headerValue);
  if (Number.isFinite(headerSeconds) && headerSeconds > 0) {
    return Math.max(1, Math.ceil(headerSeconds));
  }

  return undefined;
}

function formatRetryAfterMinutes(retryAfterSeconds?: number): string {
  if (typeof retryAfterSeconds !== "number" || retryAfterSeconds <= 0) {
    return "a few minutes";
  }
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  return `about ${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
}

export function formatRateLimitMessage(scope: RateLimitScope, retryAfterSeconds?: number): string {
  const retryAfterLabel = formatRetryAfterMinutes(retryAfterSeconds);
  if (scope === "status") {
    return "Status checks are being slowed down. Your job is still running.";
  }
  if (scope === "download") {
    return `Download temporarily rate limited. Try again in ${retryAfterLabel}.`;
  }
  return `Rate limit reached. Please try again in ${retryAfterLabel}.`;
}

async function parseResponse<T>(response: Response, options: ParseResponseOptions = {}): Promise<T> {
  const rawText = await response.text().catch(() => "");
  let data: Record<string, unknown> | null = null;
  try {
    data = rawText ? (JSON.parse(rawText) as Record<string, unknown>) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    if (response.status === 429) {
      const retryAfterSeconds = parseRetryAfterSeconds(response, data);
      throw new ApiRateLimitError(
        formatRateLimitMessage(options.rateLimitScope ?? "request", retryAfterSeconds),
        {
          bucket: typeof data?.bucket === "string" ? data.bucket : undefined,
          retryAfterSeconds,
          scope: options.rateLimitScope ?? "request",
        },
      );
    }
    if (response.status === 413) {
      throw new Error(typeof data?.detail === "string" ? data.detail : "File is too large. Maximum size is 25 MB.");
    }
    const detail =
      typeof data?.detail === "string"
        ? data.detail
        : typeof data?.error === "string"
          ? data.error
          : "Request failed. Please try again.";
    const safeDetail = response.status === 404 ? NOT_FOUND_MESSAGE : detail;

    if (process.env.NODE_ENV !== "production") {
      console.error("API request failed", {
        status: response.status,
        url: response.url,
        detail: safeDetail,
      });
    }

    throw new Error(safeDetail);
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

  const data = await parseResponse<Record<string, unknown>>(response, { rateLimitScope: "status" });
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
    retry_after_seconds: typeof data.retry_after_seconds === "number" ? data.retry_after_seconds : undefined,
    bucket: typeof data.bucket === "string" ? data.bucket : undefined,
    result,
    error: successWithoutDownload ? MISSING_RESULT_MESSAGE : error,
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
  let lastKnownStatus: JobStatus | null = null;

  while (true) {
    if (signal?.aborted) {
      throw abortError();
    }

    let status: JobStatus;

    try {
      status = await getJobStatus(prefix, jobId, signal);
      lastKnownStatus = status;
    } catch (error: unknown) {
      if (isAbortError(error)) {
        throw error;
      }

      if (error instanceof ApiRateLimitError && error.scope === "status") {
        const throttledStatus: JobStatus = {
          ...(lastKnownStatus ?? {
            job_id: jobId,
            stage: "processing",
            status: "processing" as const,
          }),
          job_id: jobId,
          notice: error.message,
          retry_after_seconds: error.retryAfterSeconds,
          bucket: error.bucket,
        };
        onUpdate?.(throttledStatus);
        const retryDelayMs = Math.max(
          (error.retryAfterSeconds ?? 5) * 1000,
          Date.now() - startedAt > 30_000 ? 4000 : 1800,
        );
        await waitForPollInterval(retryDelayMs, signal);
        continue;
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

    await waitForPollInterval(Date.now() - startedAt > 30_000 ? 4000 : 1800, signal);
  }
}

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

export async function downloadFile(
  prefix: "pdf" | "image" | "convert" | "compress",
  jobId: string,
  filename: string,
): Promise<void> {
  let response: Response;
  try {
    response = await fetch(toApiPath(`${prefix}/download/${jobId}`), {
      cache: "no-store",
    });
  } catch (error: unknown) {
    throw normalizeNetworkError(error, NETWORK_ERROR_MESSAGE);
  }

  if (!response.ok) {
    await parseResponse<Record<string, unknown>>(response, { rateLimitScope: "download" });
    return;
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const resolvedFilename = parseContentDispositionFilename(response.headers.get("Content-Disposition")) || filename;
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = resolvedFilename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
