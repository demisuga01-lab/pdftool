"use client";

import { useState } from "react";

import { ToolLayout } from "@/components/layout/ToolLayout";
import { FileUpload } from "@/components/ui/FileUpload";
import { JobProgress } from "@/components/ui/JobProgress";
import { uploadFile } from "@/lib/api";

const panelClass =
  "rounded-3xl border border-slate-200 bg-white/85 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/85";

export default function PdfSplitPage() {
  const [jobId, setJobId] = useState<string | null>(null);
  const [prefix] = useState<"pdf" | "image">("pdf");
  const [isUploading, setIsUploading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [pages, setPages] = useState("1-3, 5, 7-9");

  const handleSubmit = async () => {
    if (!files[0] || !pages.trim()) {
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", files[0]);
      formData.append("pages", pages);

      const response = await uploadFile("pdf/split", formData);
      setJobId(response.job_id);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <ToolLayout>
      <div className="space-y-6">
        <section className={panelClass}>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-indigo-700 dark:text-indigo-300">
            PDF Split
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 dark:text-white">Split out only the pages you need</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
            Enter page ranges like a print dialog and download the result as a zip archive.
          </p>
        </section>

        <section className={`${panelClass} space-y-6`}>
          <FileUpload accept=".pdf,application/pdf" maxSizeMB={100} onFilesSelected={setFiles} />

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-900 dark:text-white" htmlFor="page-ranges">
              Page ranges
            </label>
            <input
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              id="page-ranges"
              onChange={(event) => setPages(event.target.value)}
              placeholder="1-3, 5, 7-9"
              type="text"
              value={pages}
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">Example: 1-3, 5, 7-9</p>
          </div>

          <button
            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
            disabled={!files.length || !pages.trim() || isUploading}
            onClick={handleSubmit}
            type="button"
          >
            {isUploading ? "Uploading..." : "Split PDF"}
          </button>
        </section>

        <JobProgress filename="split-pages.zip" jobId={jobId} prefix={prefix} onComplete={() => setIsUploading(false)} />
      </div>
    </ToolLayout>
  );
}
