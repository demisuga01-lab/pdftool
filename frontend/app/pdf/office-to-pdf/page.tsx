"use client";

import { useState } from "react";

import { DocumentIcon } from "@/components/icons/SiteIcons";
import { DownloadPanel } from "@/components/ui/DownloadPanel";
import { UploadProgress } from "@/components/ui/UploadProgress";
import { WorkspaceControls, type ControlSection } from "@/components/workspace/Controls";
import { PDFWorkspace } from "@/components/workspace/PDFWorkspace";
import { estimateProcessingTime, formatBytes, slugifyBaseName } from "@/lib/format";
import { useWorkspaceJob } from "@/lib/workspace-job";
import { useObjectState } from "@/lib/workspace-data";

type OfficeSettings = {
  exportBookmarks: boolean;
  exportComments: boolean;
  exportFormFields: boolean;
  exportHiddenSlides: boolean;
  firstSheetOnly: boolean;
  imageCompression: "lossless" | "jpeg";
  jpegQuality: number;
  pdfA: boolean;
  pdfVersion: "1.4" | "1.5" | "1.7";
};

const sections: Array<ControlSection<OfficeSettings>> = [
  {
    key: "conversion-options",
    label: "Conversion Options",
    fields: [
      { key: "pdfA", label: "PDF/A compliance", type: "toggle" },
      {
        key: "pdfVersion",
        label: "PDF version",
        type: "select",
        options: [
          { label: "PDF 1.4", value: "1.4" },
          { label: "PDF 1.5", value: "1.5" },
          { label: "PDF 1.7", value: "1.7" },
        ],
      },
    ],
  },
  {
    key: "document-settings",
    label: "Document Settings",
    fields: [
      { key: "exportBookmarks", label: "Export bookmarks", type: "toggle" },
      { key: "exportComments", label: "Export comments", type: "toggle" },
      { key: "exportFormFields", label: "Export form fields", type: "toggle" },
      { key: "exportHiddenSlides", label: "Export hidden slides", type: "toggle" },
      { key: "firstSheetOnly", label: "First sheet only", type: "toggle" },
    ],
  },
  {
    key: "image-settings",
    label: "Image Settings",
    fields: [
      {
        key: "imageCompression",
        label: "Image compression",
        type: "select",
        options: [
          { label: "Lossless", value: "lossless" },
          { label: "JPEG", value: "jpeg" },
        ],
      },
      { key: "jpegQuality", label: "JPEG quality", type: "slider", min: 1, max: 100 },
    ],
  },
];

const supportedFormats = ["DOCX", "XLSX", "PPTX", "ODT", "ODS", "ODP", "RTF", "TXT"];

export default function PdfOfficeToPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const { state: settings, update } = useObjectState<OfficeSettings>({
    exportBookmarks: true,
    exportComments: false,
    exportFormFields: true,
    exportHiddenSlides: false,
    firstSheetOnly: false,
    imageCompression: "lossless",
    jpegQuality: 90,
    pdfA: false,
    pdfVersion: "1.4",
  });
  const job = useWorkspaceJob({
    filename: file ? `${slugifyBaseName(file.name)}.pdf` : "document.pdf",
    prefix: "pdf",
  });

  const handleProcess = () => {
    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("pdf_a", String(settings.pdfA));
    formData.append("pdf_version", settings.pdfVersion);
    formData.append("export_bookmarks", String(settings.exportBookmarks));
    formData.append("export_comments", String(settings.exportComments));
    formData.append("export_form_fields", String(settings.exportFormFields));
    formData.append("export_hidden_slides", String(settings.exportHiddenSlides));
    formData.append("first_sheet_only", String(settings.firstSheetOnly));
    formData.append("image_compression", settings.imageCompression);
    formData.append("jpeg_quality", String(settings.jpegQuality));
    job.process("pdf/office-to-pdf", formData);
  };

  return (
    <PDFWorkspace
      breadcrumbTitle="Office to PDF"
      description="Convert Office documents to PDF with document and image export options from a single workspace."
      downloadPanel={
        file && job.state !== "idle" && job.state !== "uploading" && !job.panelDismissed ? (
          <DownloadPanel
            error={job.error}
            estimatedTime={estimateProcessingTime(file.size, 1)}
            jobId={job.jobId}
            onDownload={job.state === "success" ? job.download : undefined}
            onProcessAnother={() => {
              setFile(null);
              job.reset();
            }}
            onReedit={job.dismissPanel}
            state={job.state === "failure" ? "failure" : job.state === "success" ? "success" : job.state}
          />
        ) : null
      }
      emptyState={
        <label className="flex w-full max-w-2xl cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center transition hover:border-slate-400 hover:bg-slate-50 dark:border-white/15 dark:bg-zinc-900 dark:hover:border-emerald-400/50 dark:hover:bg-slate-900/80">
          <input
            accept=".doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp,.rtf,.txt"
            className="hidden"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              job.reset();
            }}
            type="file"
          />
          <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ECFDF5] text-[#059669]">
            <DocumentIcon className="h-7 w-7" />
          </span>
          <h2 className="text-[18px] text-slate-900 dark:text-zinc-100">Upload a document</h2>
          <p className="mt-2 max-w-xl text-[14px] leading-7 text-slate-500 dark:text-zinc-400">
            DOCX, XLSX, PPTX, ODT, ODS, ODP, RTF, and TXT are supported.
          </p>
          <span className="mt-5 inline-flex h-9 items-center rounded-lg border border-slate-200 px-3 text-[14px] text-slate-700 dark:border-white/10 dark:text-zinc-200">
            Browse files
          </span>
        </label>
      }
      estimatedTime={file ? estimateProcessingTime(file.size, 1) : undefined}
      fileInfo={file ? formatBytes(file.size) : undefined}
      fileName={file?.name}
      hasContent={Boolean(file)}
      onDownload={job.state === "success" ? job.download : undefined}
      onProcess={handleProcess}
      onReset={() => {
        setFile(null);
        job.reset();
      }}
      processButtonDisabled={!file}
      processingLabel={job.processingLabel}
      renderCenter={
        file ? (
          <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-[1fr_240px]">
            <div className="rounded-2xl border border-zinc-200 bg-white p-8 dark:border-white/10 dark:bg-zinc-900">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#ECFDF5] text-[#059669]">
                <DocumentIcon className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-[24px] text-slate-900 dark:text-zinc-100">{file.name}</h2>
              <p className="mt-2 text-[14px] leading-6 text-slate-500 dark:text-zinc-400">{formatBytes(file.size)}</p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-white/10 dark:bg-zinc-900">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400 dark:text-zinc-500">
                Supported Formats
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {supportedFormats.map((format) => (
                  <span
                    className="rounded-md border border-slate-200 bg-zinc-50 px-2.5 py-1 text-[13px] text-slate-600 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-300"
                    key={format}
                  >
                    {format}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : null
      }
      rightPanel={
        <div className="space-y-6">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-[13px] leading-6 text-slate-500 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-300">
            {job.state === "failure"
              ? job.error ?? "Conversion failed."
              : "Choose archival and export options before converting the document."}
          </div>
          <WorkspaceControls sections={sections} state={settings} update={update} />
        </div>
      }
      showSelectionBar={false}
      showSizeToggle={false}
      uploadOverlay={
        file && job.state === "uploading" ? (
          <UploadProgress
            fileName={file.name}
            fileSize={file.size}
            percent={job.uploadPercent}
            speedKBs={job.uploadSpeedKBs}
          />
        ) : null
      }
    />
  );
}
