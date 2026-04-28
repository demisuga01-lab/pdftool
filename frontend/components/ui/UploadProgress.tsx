"use client";

import { formatBytes } from "@/lib/format";

function formatSpeed(speedKBs: number): string {
  if (speedKBs >= 1024) {
    return `${(speedKBs / 1024).toFixed(speedKBs >= 10 * 1024 ? 0 : 1)} MB/s`;
  }

  return `${Math.max(speedKBs, 0.1).toFixed(speedKBs >= 100 ? 0 : 1)} KB/s`;
}

function formatRemaining(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0.5) {
    return "Almost done";
  }
  if (seconds < 60) {
    return `About ${Math.max(1, Math.round(seconds))} seconds remaining`;
  }
  return `About ${Math.ceil(seconds / 60)} minutes remaining`;
}

export function UploadProgress({
  fileLabel,
  fileName,
  fileSize,
  onCancel,
  percent,
  remainingSecs,
  speedKBs,
  totalBytes,
  uploadedBytes,
}: {
  fileLabel?: string;
  fileName: string;
  fileSize: number;
  onCancel?: () => void;
  percent: number;
  remainingSecs?: number;
  speedKBs: number;
  totalBytes?: number;
  uploadedBytes?: number;
}) {
  const uploaded = uploadedBytes ?? Math.round(fileSize * (percent / 100));
  const total = totalBytes && totalBytes > 0 ? totalBytes : fileSize;

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/10">
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-[#2563EB]">{fileLabel ?? "Uploading file"}</p>
            <h2 className="text-4xl font-bold text-slate-900">{percent}%</h2>
          </div>
          {onCancel ? (
            <button className="secondary-button h-10 shrink-0 px-3" onClick={onCancel} type="button">
              Cancel
            </button>
          ) : null}
        </div>

        <div className="space-y-1">
          <p className="truncate text-sm font-semibold text-slate-700">{fileName}</p>
          <p className="text-sm font-medium text-slate-500">
            {formatBytes(uploaded)} of {formatBytes(total)}
          </p>
        </div>

        <div className="space-y-2">
          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[#2563EB] transition-all duration-200"
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="flex items-center justify-between gap-3 text-sm font-medium text-slate-500">
            <p>{formatSpeed(speedKBs)}</p>
            <p>{formatRemaining(remainingSecs ?? 0)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
