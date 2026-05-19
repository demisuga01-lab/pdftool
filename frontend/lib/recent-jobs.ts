"use client";

import { useCallback, useEffect, useState } from "react";

export type RecentJobStatus = "queued" | "processing" | "success" | "failed" | "expired" | "unknown";

export type RecentJob = {
  id: string;
  toolName?: string;
  route?: string;
  originalFilename?: string;
  fileType?: string;
  approximateFileSize?: string;
  status: RecentJobStatus;
  createdAt: string;
  updatedAt: string;
  downloadUrl?: string;
  outputFilename?: string;
  activePageCount?: number;
  outputMode?: string;
  outputType?: string;
  prefix?: "pdf" | "image" | "convert" | "compress" | "file-tools";
  selectedPageCount?: number;
  errorMessage?: string;
};

export const RECENT_JOBS_STORAGE_KEY = "pdftools-recent-jobs";
export const RECENT_JOBS_MAX = 10;
const RECENT_JOBS_EVENT = "pdftools:recent-jobs-changed";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function cleanString(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function normalizeJob(job: RecentJob): RecentJob {
  return {
    ...job,
    toolName: cleanString(job.toolName),
    route: cleanString(job.route),
    originalFilename: cleanString(job.originalFilename),
    fileType: cleanString(job.fileType),
    approximateFileSize: cleanString(job.approximateFileSize),
    downloadUrl: cleanString(job.downloadUrl),
    outputFilename: cleanString(job.outputFilename),
    activePageCount: typeof job.activePageCount === "number" && Number.isFinite(job.activePageCount)
      ? job.activePageCount
      : undefined,
    outputMode: cleanString(job.outputMode),
    outputType: cleanString(job.outputType),
    errorMessage: cleanString(job.errorMessage),
    selectedPageCount: typeof job.selectedPageCount === "number" && Number.isFinite(job.selectedPageCount)
      ? job.selectedPageCount
      : undefined,
  };
}

function emitChange(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new Event(RECENT_JOBS_EVENT));
}

export function readRecentJobs(): RecentJob[] {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(RECENT_JOBS_STORAGE_KEY) || "[]") as RecentJob[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter((job) => job && typeof job.id === "string")
      .map((job) => normalizeJob(job))
      .slice(0, RECENT_JOBS_MAX);
  } catch {
    return [];
  }
}

function writeRecentJobs(jobs: RecentJob[]): void {
  if (!canUseStorage()) {
    return;
  }

  const next = jobs
    .map((job) => normalizeJob(job))
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, RECENT_JOBS_MAX);
  window.localStorage.setItem(RECENT_JOBS_STORAGE_KEY, JSON.stringify(next));
  emitChange();
}

export function upsertRecentJob(job: {
  id: string;
  toolName?: string;
  route?: string;
  originalFilename?: string;
  fileType?: string;
  approximateFileSize?: string;
  status: RecentJobStatus;
  downloadUrl?: string;
  outputFilename?: string;
  activePageCount?: number;
  outputMode?: string;
  outputType?: string;
  prefix?: RecentJob["prefix"];
  selectedPageCount?: number;
  errorMessage?: string | null;
}): void {
  if (!job.id || !canUseStorage()) {
    return;
  }

  const now = new Date().toISOString();
  const current = readRecentJobs();
  const existing = current.find((item) => item.id === job.id);
  const nextJob: RecentJob = normalizeJob({
    ...existing,
    ...job,
    errorMessage: job.errorMessage ?? existing?.errorMessage,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  });
  writeRecentJobs([nextJob, ...current.filter((item) => item.id !== job.id)]);
}

export function removeRecentJob(id: string): void {
  writeRecentJobs(readRecentJobs().filter((job) => job.id !== id));
}

export function clearRecentJobs(): void {
  writeRecentJobs([]);
}

export function useRecentJobs() {
  const [jobs, setJobs] = useState<RecentJob[]>([]);

  const refresh = useCallback(() => {
    setJobs(readRecentJobs());
  }, []);

  useEffect(() => {
    const refreshId = window.setTimeout(refresh, 0);
    window.addEventListener(RECENT_JOBS_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.clearTimeout(refreshId);
      window.removeEventListener(RECENT_JOBS_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [refresh]);

  return {
    jobs,
    clear: clearRecentJobs,
    refresh,
    remove: removeRecentJob,
  };
}
