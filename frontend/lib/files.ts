import { toApiPath } from "@/lib/api";
import { uploadWithProgress, type UploadProgressInfo } from "@/lib/upload";

export type UploadedFileMetadata = {
  file_id: string;
  filename: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  extension: string;
  preview_url: string;
  thumbnail_url: string;
  metadata: Record<string, unknown>;
  pages?: number;
  size?: number;
};

export type PdfInfo = {
  file_id: string;
  page_count: number;
  pages: number;
  size_bytes: number;
  original_name?: string;
  extension: "pdf";
};

export type UploadProgressHandler = (progress: UploadProgressInfo) => void;

async function parseJsonResponse<T>(response: Response): Promise<T> {
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

export async function uploadFileToWorkspace(
  file: File,
  onProgress?: UploadProgressHandler,
  signal?: AbortSignal,
): Promise<UploadedFileMetadata> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await uploadWithProgress(
    "files/upload",
    formData,
    (_percent, _speed, _remaining, progress) => onProgress?.(progress),
    signal,
  );
  return response as UploadedFileMetadata;
}

export async function uploadMultipleFilesToWorkspace(
  files: File[],
  onProgress?: UploadProgressHandler,
  signal?: AbortSignal,
): Promise<UploadedFileMetadata[]> {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  const response = await uploadWithProgress(
    "files/upload-multiple",
    formData,
    (_percent, _speed, _remaining, progress) => onProgress?.(progress),
    signal,
  );
  const payload = response as { files?: UploadedFileMetadata[] };
  return payload.files ?? [];
}

export async function getFileMetadata(fileId: string, signal?: AbortSignal): Promise<UploadedFileMetadata> {
  const response = await fetch(toApiPath(`files/${encodeURIComponent(fileId)}`), {
    cache: "no-store",
    signal,
  });
  return parseJsonResponse<UploadedFileMetadata>(response);
}

export async function getPdfInfo(fileId: string, signal?: AbortSignal): Promise<PdfInfo> {
  const response = await fetch(toApiPath(`files/pdf-info/${encodeURIComponent(fileId)}`), {
    cache: "no-store",
    signal,
  });
  return parseJsonResponse<PdfInfo>(response);
}

export function getPdfPagePreviewUrl(fileId: string, page = 1, zoom = 100): string {
  return toApiPath(`files/pdf-page/${encodeURIComponent(fileId)}/${page}?zoom=${zoom}`);
}

export function getThumbnailUrl(fileId: string): string {
  return toApiPath(`files/thumbnail/${encodeURIComponent(fileId)}`);
}

export function getPreviewUrl(fileId: string): string {
  return toApiPath(`files/preview/${encodeURIComponent(fileId)}`);
}
