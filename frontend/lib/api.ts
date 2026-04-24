export type JobStatus = {
  job_id: string;
  status: "queued" | "processing" | "success" | "failure";
  output_path?: string;
  result?: any;
  error?: string;
};

export type ApiResponse = {
  job_id: string;
  status: string;
  message: string;
};

const API_BASE_URL = "/api";
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 30000;
const NETWORK_ERROR_MESSAGE = "Cannot connect to server. Make sure the backend is running.";
const JOB_TIMEOUT_MESSAGE = "Job is taking too long. Make sure Redis and Celery worker are running.";

function toApiPath(endpoint: string): string {
  return `${API_BASE_URL}/${endpoint.replace(/^\/+/, "")}`;
}

function normalizeStatus(status: string): JobStatus["status"] {
  const normalized = status.toLowerCase();

  if (["success", "completed"].includes(normalized)) {
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
  const data = (await response.json().catch(() => null)) as Record<string, unknown> | null;

  if (!response.ok) {
    const detail =
      typeof data?.detail === "string"
        ? data.detail
        : typeof data?.error === "string"
          ? data.error
          : "Request failed";

    throw new Error(detail);
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

export async function uploadFile(endpoint: string, formData: FormData): Promise<{ job_id: string }> {
  let response: Response;

  try {
    response = await fetch(toApiPath(endpoint), {
      method: "POST",
      body: formData,
    });
  } catch (error: unknown) {
    throw normalizeNetworkError(error, NETWORK_ERROR_MESSAGE);
  }

  const data = await parseResponse<ApiResponse>(response);
  return { job_id: data.job_id };
}

export async function getJobStatus(prefix: "pdf" | "image", jobId: string): Promise<JobStatus> {
  let response: Response;

  try {
    response = await fetch(toApiPath(`${prefix}/status/${jobId}`), {
      cache: "no-store",
    });
  } catch (error: unknown) {
    throw normalizeNetworkError(error, NETWORK_ERROR_MESSAGE);
  }

  const data = await parseResponse<Record<string, unknown>>(response);

  return {
    job_id: String(data.job_id ?? jobId),
    status: normalizeStatus(String(data.status ?? "queued")),
    output_path: typeof data.output_path === "string" ? data.output_path : undefined,
    result: data.result,
    error: typeof data.error === "string" ? data.error : undefined,
  };
}

export async function pollJobStatus(prefix: "pdf" | "image", jobId: string): Promise<JobStatus> {
  const startedAt = Date.now();

  while (true) {
    let status: JobStatus;

    try {
      status = await getJobStatus(prefix, jobId);
    } catch (error: unknown) {
      throw normalizeNetworkError(error, NETWORK_ERROR_MESSAGE);
    }

    if (status.status === "success" || status.status === "failure") {
      return status;
    }

    if (Date.now() - startedAt >= POLL_TIMEOUT_MS) {
      throw new Error(JOB_TIMEOUT_MESSAGE);
    }

    await new Promise((resolve) => window.setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

export function downloadFile(prefix: "pdf" | "image", jobId: string, filename: string): void {
  const link = document.createElement("a");
  link.href = toApiPath(`${prefix}/download/${jobId}`);
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
