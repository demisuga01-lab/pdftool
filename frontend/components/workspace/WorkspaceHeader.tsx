"use client";

import { useState, type ReactNode } from "react";
import { Info } from "lucide-react";

import { DownloadIcon, RefreshIcon } from "@/components/icons/SiteIcons";

type WorkspaceHeaderProps = {
  countLabel?: string;
  fileInfo?: string;
  fileName?: string;
  infoContent?: ReactNode;
  onDownload?: () => void;
  onReset?: () => void;
  processingLabel?: string | null;
  title: string;
};

export function WorkspaceHeader({
  countLabel,
  fileInfo,
  fileName,
  infoContent,
  onDownload,
  onReset,
  processingLabel,
  title,
}: WorkspaceHeaderProps) {
  const [infoOpen, setInfoOpen] = useState(false);

  return (
    <>
      <div className="border-b border-[#E5E7EB] bg-white px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-[12px] font-medium tracking-[0.16em] text-slate-500">
              PDFTools / {title}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm font-medium text-slate-600">
              {fileName ? <span className="max-w-full truncate font-mono text-[13px] text-slate-700 sm:max-w-none">{fileName}</span> : null}
              {fileInfo ? <span className="text-slate-500">{fileInfo}</span> : null}
              {countLabel ? <span>{countLabel}</span> : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {processingLabel ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-[#DBEAFE] bg-[#EFF6FF] px-3 py-2 text-sm font-semibold text-[#1D4ED8]">
                <span className="h-2 w-2 rounded-full bg-[#2563EB]" />
                <span>{processingLabel}</span>
              </div>
            ) : null}
            {infoContent ? (
              <button
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                onClick={() => setInfoOpen(true)}
                type="button"
              >
                <Info className="h-4 w-4" />
              </button>
            ) : null}
            {onDownload ? (
              <button
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-[14px] text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                onClick={onDownload}
                type="button"
              >
                <DownloadIcon className="h-4 w-4" />
                Download result
              </button>
            ) : null}
            {onReset ? (
              <button
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-[14px] text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                onClick={onReset}
                type="button"
              >
                <RefreshIcon className="h-4 w-4" />
                Process another file
              </button>
            ) : null}
          </div>
        </div>
      </div>
      {infoOpen && infoContent ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[#E5E7EB] bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] px-5 py-4">
              <h2 className="text-lg font-semibold text-slate-900">File details</h2>
              <button className="text-sm font-medium text-slate-500 hover:text-slate-900" onClick={() => setInfoOpen(false)} type="button">
                Close
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-5 text-sm text-slate-700">{infoContent}</div>
          </div>
        </div>
      ) : null}
    </>
  );
}
