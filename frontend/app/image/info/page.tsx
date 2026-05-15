"use client";

import Link from "next/link";
import { useState } from "react";

import { EmptyWorkspaceState } from "@/components/workspace/ImageWorkspace";
import { CompactWorkspaceShell, PreviewCard } from "@/components/workspace/WorkspaceShells";
import { formatBytes, formatDimensions, joinMeta } from "@/lib/format";
import { useSingleImagePreview } from "@/lib/workspace-data";

type ImageInfoResult = {
  bands?: number;
  format?: string;
  height?: number;
  interpretation?: string;
  size_bytes?: number;
  width?: number;
};

export default function ImageInfoPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImageInfoResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const preview = useSingleImagePreview(file);

  const handleProcess = async () => {
    if (!file) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/image/info", {
        body: formData,
        method: "POST",
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail ?? data.error ?? "Failed to inspect image");
      }

      setResult(data.result ?? null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Failed to inspect image");
    } finally {
      setLoading(false);
    }
  };

  const jsonValue = result ? JSON.stringify(result, null, 2) : "";

  return (
    <CompactWorkspaceShell
      title="Image Info"
      preview={
        preview ? (
          <PreviewCard
            badges={[formatDimensions(preview.width, preview.height), formatBytes(preview.size), preview.format]}
            description="Compact preview for metadata inspection."
            title={file?.name ?? "Image"}
          >
            <img
              alt={file?.name ?? "Preview"}
              className="max-h-[320px] w-auto max-w-full rounded-lg border border-zinc-200 bg-white object-contain shadow-sm dark:border-white/10"
              src={preview.dataUrl}
            />
          </PreviewCard>
        ) : null
      }
      countLabel={preview ? formatDimensions(preview.width, preview.height) : undefined}
      description="Inspect the uploaded image, then export the discovered metadata as JSON or text."
      emptyState={
        <EmptyWorkspaceState
          accept="image/*"
          description="Upload an image to inspect its basic metadata and file characteristics."
          onFilesSelected={(files) => {
            setFile(files[0] ?? null);
            setResult(null);
            setError(null);
          }}
        />
      }
      fileInfo={preview ? joinMeta([formatBytes(preview.size), preview.format]) : undefined}
      fileName={file?.name}
      hasContent={Boolean(file)}
      onFilesDropped={(files) => {
        setFile(files[0] ?? null);
        setResult(null);
        setError(null);
      }}
      onProcess={handleProcess}
      processButtonDisabled={!file || loading}
      processButtonLabel="Inspect image"
      processingLabel={loading ? "Inspecting image" : null}
      settingsPanel={
        <div className="space-y-6">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-[13px] leading-6 text-slate-500 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
            {error ?? "Process the image to populate the metadata panel."}
          </div>

          {result ? (
            <>
              <div className="space-y-3">
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400 dark:text-zinc-500">
                  Basic Info
                </p>
                <div className="rounded-xl border border-zinc-200 bg-white dark:border-white/10 dark:bg-zinc-900">
                  {[
                    ["Filename", file?.name ?? "--"],
                    ["File size", result.size_bytes ? `${formatBytes(result.size_bytes)} (${result.size_bytes} bytes)` : "--"],
                    ["Format", result.format ?? "--"],
                    ["Dimensions", result.width && result.height ? `${result.width} x ${result.height}` : "--"],
                    [
                      "Aspect ratio",
                      result.width && result.height ? (result.width / result.height).toFixed(2) : "--",
                    ],
                    ["Color mode", result.interpretation ?? "--"],
                    ["Bit depth", result.bands ? `${result.bands * 8}-bit` : "--"],
                    ["Estimated print size at 300 DPI", result.width && result.height ? `${(result.width / 300).toFixed(2)} x ${(result.height / 300).toFixed(2)} in` : "--"],
                  ].map(([label, value]) => (
                    <div className="flex items-center justify-between gap-4 border-b border-zinc-200 px-4 py-3 text-[13px] last:border-b-0 dark:border-white/10" key={label}>
                      <span className="text-slate-500 dark:text-zinc-400">{label}</span>
                      <span className="text-right text-slate-700 dark:text-zinc-200">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400 dark:text-zinc-500">
                  Actions
                </p>
                <div className="grid gap-2">
                  <button
                    className="h-9 rounded-md border border-slate-200 bg-white px-3 text-[14px] text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-white/5"
                    onClick={() => navigator.clipboard.writeText(jsonValue)}
                    type="button"
                  >
                    Copy all info as JSON
                  </button>
                  <button
                    className="h-9 rounded-md border border-slate-200 bg-white px-3 text-[14px] text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-white/5"
                    onClick={() => {
                      const blob = new Blob([jsonValue], { type: "text/plain;charset=utf-8" });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement("a");
                      link.href = url;
                      link.download = `${file?.name ?? "image"}-info.txt`;
                      link.click();
                      URL.revokeObjectURL(url);
                    }}
                    type="button"
                  >
                    Download info as TXT
                  </button>
                  <Link
                    className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-[14px] text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-white/5"
                    href="/image/compress"
                  >
                    Strip all metadata
                  </Link>
                </div>
              </div>
            </>
          ) : null}
        </div>
      }
    />
  );
}
