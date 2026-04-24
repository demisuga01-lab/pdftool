"use client";

import { useState } from "react";

import { ToolLayout } from "@/components/layout/ToolLayout";
import { FileUpload } from "@/components/ui/FileUpload";
import { JobProgress } from "@/components/ui/JobProgress";
import { uploadFile } from "@/lib/api";

const panelClass =
  "rounded-3xl border border-slate-200 bg-white/85 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/85";

export default function OfficeToPdfPage() {
  const [jobId, setJobId] = useState<string | null>(null);
  const [prefix] = useState<"pdf" | "image">("pdf");
  const [isUploading, setIsUploading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  const handleSubmit = async () => {
    if (!files[0]) {
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", files[0]);

      const response = await uploadFile("pdf/office-to-pdf", formData);
      setJobId(response.job_id);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <ToolLayout>
      <div className="space-y-6">
        <section className={panelClass}>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">
            Office to PDF
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 dark:text-white">Convert office documents with one click</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
            Upload Word, Excel, PowerPoint, or OpenDocument files and get a PDF back.
          </p>
        </section>

        <section className={`${panelClass} space-y-6`}>
          <FileUpload
            accept=".docx,.xlsx,.pptx,.odt,.odp,.ods"
            maxSizeMB={100}
            onFilesSelected={setFiles}
          />

          <button
            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
            disabled={!files.length || isUploading}
            onClick={handleSubmit}
            type="button"
          >
            {isUploading ? "Uploading..." : "Convert to PDF"}
          </button>
        </section>

        <JobProgress filename="document.pdf" jobId={jobId} prefix={prefix} onComplete={() => setIsUploading(false)} />
      </div>
    </ToolLayout>
  );
}
