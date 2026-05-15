"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import {
  getFileMetadata,
  uploadFileToWorkspace,
  uploadMultipleFilesToWorkspace,
  type UploadedFileMetadata,
  type UploadProgressHandler,
} from "@/lib/files";

export type WorkspaceFileStatus = "ready" | "uploading" | "error";

export type WorkspaceFileRecord = UploadedFileMetadata & {
  display_name: string;
  error?: string | null;
  height?: number;
  localFile?: File;
  order: number;
  page_count?: number;
  status: WorkspaceFileStatus;
  width?: number;
};

type ReplaceMode = "append" | "replace";

type UseWorkspaceFilesOptions = {
  accept?: string;
  multiple?: boolean;
};

function matchesAccept(file: File, accept: string | undefined) {
  if (!accept?.trim()) {
    return true;
  }

  const extension = `.${(file.name.split(".").pop() || "").toLowerCase()}`;
  const mimeType = file.type.toLowerCase();
  const rules = accept
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  if (rules.length === 0) {
    return true;
  }

  return rules.some((rule) => {
    if (rule.startsWith(".")) {
      return extension === rule;
    }
    if (rule.endsWith("/*")) {
      return mimeType.startsWith(rule.slice(0, -1));
    }
    return mimeType === rule;
  });
}

function normalizeRecord(metadata: UploadedFileMetadata, order: number, localFile?: File): WorkspaceFileRecord {
  return {
    ...metadata,
    display_name: metadata.original_name || metadata.filename,
    height: typeof metadata.metadata?.height === "number" ? metadata.metadata.height : undefined,
    order,
    page_count:
      typeof metadata.metadata?.page_count === "number"
        ? metadata.metadata.page_count
        : typeof metadata.pages === "number"
          ? metadata.pages
          : undefined,
    status: "ready",
    width: typeof metadata.metadata?.width === "number" ? metadata.metadata.width : undefined,
    localFile,
  };
}

function reorderRecords(records: WorkspaceFileRecord[]) {
  return records.map((record, index) => ({ ...record, order: index }));
}

export function useWorkspaceFiles({ accept, multiple = false }: UseWorkspaceFilesOptions) {
  const [files, setFiles] = useState<WorkspaceFileRecord[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "failure">("idle");
  const [uploadPercent, setUploadPercent] = useState(0);
  const [uploadSpeedKBs, setUploadSpeedKBs] = useState(0);
  const [uploadRemainingSecs, setUploadRemainingSecs] = useState(0);
  const [uploadedBytes, setUploadedBytes] = useState(0);
  const [uploadTotalBytes, setUploadTotalBytes] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const applyProgress: UploadProgressHandler = useCallback((progress) => {
    setUploadPercent(progress.percentage);
    setUploadSpeedKBs(progress.uploadSpeedKBs);
    setUploadRemainingSecs(progress.estimatedSecondsRemaining);
    setUploadedBytes(progress.uploadedBytes);
    setUploadTotalBytes(progress.totalBytes);
  }, []);

  const validateFiles = useCallback(
    (inputFiles: File[]) => {
      const nextFiles = multiple ? inputFiles : inputFiles.slice(0, 1);
      const invalid = nextFiles.find((file) => !matchesAccept(file, accept));
      if (invalid) {
        throw new Error(`"${invalid.name}" is not a supported file type for this workspace.`);
      }
      return nextFiles;
    },
    [accept, multiple],
  );

  const addFiles = useCallback(
    async (inputFiles: File[], mode: ReplaceMode = multiple ? "append" : "replace") => {
      const nextFiles = validateFiles(inputFiles);
      if (nextFiles.length === 0) {
        return [];
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setUploadState("uploading");
      setPendingFiles(nextFiles);
      setUploadError(null);
      setUploadPercent(0);
      setUploadSpeedKBs(0);
      setUploadRemainingSecs(0);
      setUploadedBytes(0);
      setUploadTotalBytes(nextFiles.reduce((sum, file) => sum + file.size, 0));

      try {
        const uploaded =
          nextFiles.length === 1
            ? [await uploadFileToWorkspace(nextFiles[0], applyProgress, controller.signal)]
            : await uploadMultipleFilesToWorkspace(nextFiles, applyProgress, controller.signal);

        const normalized = uploaded.map((metadata, index) => normalizeRecord(metadata, index, nextFiles[index]));
        setFiles((current) => reorderRecords(mode === "append" ? [...current, ...normalized] : normalized));
        setUploadState("idle");
        setPendingFiles([]);
        return normalized;
      } catch (caughtError) {
        if (controller.signal.aborted) {
          return [];
        }
        setUploadState("failure");
        setPendingFiles([]);
        setUploadError(caughtError instanceof Error ? caughtError.message : "Upload failed");
        return [];
      }
    },
    [applyProgress, multiple, validateFiles],
  );

  const hydrateFromIds = useCallback(async (fileIds: string[]) => {
    if (fileIds.length === 0) {
      setFiles([]);
      return [];
    }
    const metadata = await Promise.all(fileIds.map((fileId) => getFileMetadata(fileId)));
    const normalized = metadata.map((item, index) => normalizeRecord(item, index));
    setFiles(normalized);
    setUploadState("idle");
    setUploadError(null);
    return normalized;
  }, []);

  const removeFile = useCallback((fileId: string) => {
    setFiles((current) => reorderRecords(current.filter((file) => file.file_id !== fileId)));
  }, []);

  const reorderFiles = useCallback((fileIds: string[]) => {
    setFiles((current) => {
      const lookup = new Map(current.map((file) => [file.file_id, file]));
      return reorderRecords(fileIds.map((fileId) => lookup.get(fileId)).filter(Boolean) as WorkspaceFileRecord[]);
    });
  }, []);

  const moveFile = useCallback((fileId: string, direction: -1 | 1) => {
    setFiles((current) => {
      const index = current.findIndex((file) => file.file_id === fileId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return reorderRecords(next);
    });
  }, []);

  const resetFiles = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setFiles([]);
    setPendingFiles([]);
    setUploadError(null);
    setUploadState("idle");
    setUploadPercent(0);
    setUploadSpeedKBs(0);
    setUploadRemainingSecs(0);
    setUploadedBytes(0);
    setUploadTotalBytes(0);
  }, []);

  const cancelUpload = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setUploadState("idle");
    setPendingFiles([]);
  }, []);

  return {
    addFiles,
    cancelUpload,
    files,
    hydrateFromIds,
    moveFile,
    pendingFiles,
    removeFile,
    reorderFiles,
    resetFiles,
    setFiles,
    uploadError,
    uploadPercent,
    uploadRemainingSecs,
    uploadSpeedKBs,
    uploadState,
    uploadTotalBytes,
    uploadedBytes,
  };
}

export function workspaceFileIds(files: WorkspaceFileRecord[]) {
  return files.map((file) => file.file_id);
}
