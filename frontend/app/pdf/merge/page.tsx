"use client";

import { useState } from "react";
import { GripVertical } from "lucide-react";

import { ToolLayout } from "@/components/layout/ToolLayout";
import { FileUpload } from "@/components/ui/FileUpload";
import { JobProgress } from "@/components/ui/JobProgress";
import { uploadFile } from "@/lib/api";

const panelClass =
  "rounded-3xl border border-slate-200 bg-white/85 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/85";

export default function PdfMergePage() {
  const [jobId, setJobId] = useState<string | null>(null);
  const [prefix] = useState<"pdf" | "image">("pdf");
  const [isUploading, setIsUploading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const reorderFiles = (from: number, to: number) => {
    setFiles((current) => {
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (files.length < 2) {
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("files", file);
      });

      const response = await uploadFile("pdf/merge", formData);
      setJobId(response.job_id);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <ToolLayout>
      <div className="space-y-6">
        <section className={panelClass}>
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-300">
              PDF Merge
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-950 dark:text-white">Combine PDFs in the order you choose</h1>
            <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
              Upload multiple PDFs, drag them into the right sequence, and generate a single merged file.
            </p>
          </div>
        </section>

        <section className={`${panelClass} space-y-6`}>
          <FileUpload accept=".pdf,application/pdf" maxSizeMB={100} multiple onFilesSelected={setFiles} />

          {files.length > 0 ? (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Merge order</h2>
              <div className="space-y-2">
                {files.map((file, index) => (
                  <div
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 transition hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700"
                    draggable
                    key={`${file.name}-${file.size}-${index}`}
                    onDragOver={(event) => event.preventDefault()}
                    onDragStart={() => setDragIndex(index)}
                    onDrop={() => {
                      if (dragIndex !== null && dragIndex !== index) {
                        reorderFiles(dragIndex, index);
                      }
                      setDragIndex(null);
                    }}
                  >
                    <GripVertical className="h-5 w-5 shrink-0 text-slate-400" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-950 dark:text-white">{file.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Position {index + 1}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <button
            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
            disabled={files.length < 2 || isUploading}
            onClick={handleSubmit}
            type="button"
          >
            {isUploading ? "Uploading..." : "Merge PDFs"}
          </button>
        </section>

        <JobProgress filename="merged.pdf" jobId={jobId} prefix={prefix} onComplete={() => setIsUploading(false)} />
      </div>
    </ToolLayout>
  );
}
