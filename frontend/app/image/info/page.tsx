"use client";

import { useState } from "react";

import { ToolLayout } from "@/components/layout/ToolLayout";
import { FileUpload } from "@/components/ui/FileUpload";
import { JobProgress } from "@/components/ui/JobProgress";

const panelClass =
  "rounded-3xl border border-slate-200 bg-white/85 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/85";

type InfoResult = {
  width?: number;
  height?: number;
  format?: string;
  size_bytes?: number;
  interpretation?: string;
};

function formatBytes(bytes?: number): string {
  if (!bytes) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** unitIndex;

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export default function ImageInfoPage() {
  const [jobId] = useState<string | null>(null);
  const [prefix] = useState<"pdf" | "image">("image");
  const [isUploading, setIsUploading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [result, setResult] = useState<InfoResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!files[0]) {
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", files[0]);

      const response = await fetch("/api/image/info", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as { result?: InfoResult; detail?: string };

      if (!response.ok) {
        throw new Error(data.detail ?? "Unable to read image info");
      }

      setResult(data.result ?? null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to read image info");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <ToolLayout>
      <div className="space-y-6">
        <section className={panelClass}>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-700 dark:text-slate-300">
            Image Info
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 dark:text-white">Inspect dimensions, format, and color metadata</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
            Handy for checking assets before upload, export, or handoff to another workflow.
          </p>
        </section>

        <section className={`${panelClass} space-y-6`}>
          <FileUpload accept="image/*" maxSizeMB={100} onFilesSelected={setFiles} />

          <button className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white" disabled={!files.length || isUploading} onClick={handleSubmit} type="button">
            {isUploading ? "Uploading..." : "Read image info"}
          </button>

          {error ? <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p> : null}

          {result ? (
            <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 dark:border-slate-800 dark:bg-slate-950">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Width</p>
                <p className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">{result.width ?? "-"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Height</p>
                <p className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">{result.height ?? "-"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Format</p>
                <p className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">{result.format ?? "-"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Size</p>
                <p className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">{formatBytes(result.size_bytes)}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Color space</p>
                <p className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">{result.interpretation ?? "-"}</p>
              </div>
            </div>
          ) : null}
        </section>

        <JobProgress filename="image-info.json" jobId={jobId} prefix={prefix} />
      </div>
    </ToolLayout>
  );
}
