import { ApiRateLimitError, formatRateLimitMessage, toApiPath } from "@/lib/api";

type UploadResponse = {
  [key: string]: unknown;
  job_id?: string;
};

export type UploadProgressInfo = {
  percentage: number;
  uploadedBytes: number;
  totalBytes: number;
  uploadSpeedBytesPerSecond: number;
  uploadSpeedKBs: number;
  estimatedSecondsRemaining: number;
};

function abortError(): DOMException {
  return new DOMException("The operation was aborted.", "AbortError");
}

function parseJsonSafe(value: string): Record<string, unknown> | null {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function uploadWithProgress(
  endpoint: string,
  formData: FormData,
  onProgress?: (
    percent: number,
    speedKBs: number,
    remainingSecs: number,
    info: UploadProgressInfo,
  ) => void,
  signal?: AbortSignal,
): Promise<UploadResponse> {
  return new Promise<UploadResponse>((resolve, reject) => {
    const request = new XMLHttpRequest();
    const startedAt = performance.now();
    let lastProgress: UploadProgressInfo | null = null;

    const cleanup = () => {
      signal?.removeEventListener("abort", handleAbort);
    };

    const handleAbort = () => {
      request.abort();
      cleanup();
      reject(abortError());
    };

    request.open("POST", toApiPath(endpoint), true);

    request.upload.onprogress = (event) => {
      if (!event.lengthComputable) {
        return;
      }

      const elapsedSeconds = Math.max((performance.now() - startedAt) / 1000, 0.001);
      const percent = Math.min(100, Math.round((event.loaded / event.total) * 100));
      const speedKBs = event.loaded / 1024 / elapsedSeconds;
      const bytesPerSecond = event.loaded / elapsedSeconds;
      const remainingBytes = Math.max(event.total - event.loaded, 0);
      const remainingSecs = bytesPerSecond > 0 ? remainingBytes / bytesPerSecond : 0;
      lastProgress = {
        percentage: percent,
        uploadedBytes: event.loaded,
        totalBytes: event.total,
        uploadSpeedBytesPerSecond: bytesPerSecond,
        uploadSpeedKBs: speedKBs,
        estimatedSecondsRemaining: remainingSecs,
      };
      onProgress?.(percent, speedKBs, remainingSecs, lastProgress);
    };

    request.onerror = () => {
      cleanup();
      reject(new Error("Cannot connect to processing server. Please try again in a moment."));
    };

    request.onabort = () => {
      cleanup();
      reject(abortError());
    };

    request.onload = () => {
      cleanup();
      const data = parseJsonSafe(request.responseText);

      if (request.status < 200 || request.status >= 300) {
        if (request.status === 429) {
          const retryAfterSeconds = Number(data?.retry_after_seconds);
          reject(
            new ApiRateLimitError(
              formatRateLimitMessage("job", Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0 ? retryAfterSeconds : undefined),
              {
                bucket: typeof data?.bucket === "string" ? data.bucket : undefined,
                retryAfterSeconds:
                  Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0 ? Math.ceil(retryAfterSeconds) : undefined,
                scope: "job",
              },
            ),
          );
          return;
        }
        const detail =
          typeof data?.detail === "string"
            ? data.detail
            : typeof data?.error === "string"
              ? data.error
              : "Request failed";
        reject(new Error(detail));
        return;
      }

      const completedProgress = {
        ...(lastProgress ?? {
          uploadedBytes: 0,
          totalBytes: 0,
          uploadSpeedBytesPerSecond: 0,
          uploadSpeedKBs: 0,
        }),
        percentage: 100,
        estimatedSecondsRemaining: 0,
      };
      onProgress?.(100, completedProgress.uploadSpeedKBs, 0, completedProgress);
      resolve(data ?? {});
    };

    signal?.addEventListener("abort", handleAbort, { once: true });
    request.send(formData);
  });
}
