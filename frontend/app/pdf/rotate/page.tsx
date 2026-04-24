"use client";

import { useState } from "react";

import { ToolLayout } from "@/components/layout/ToolLayout";
import { FileUpload } from "@/components/ui/FileUpload";
import { JobProgress } from "@/components/ui/JobProgress";
import { uploadFile } from "@/lib/api";

const angles = [90, 180, 270] as const;
const panelClass =
  "rounded-3xl border border-slate-200 bg-white/85 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/85";

export default function PdfRotatePage() {
  const [jobId, setJobId] = useState<string | null>(null);
  const [prefix] = useState<"pdf" | "image">("pdf");
  const [isUploading, setIsUploading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [angle, setAngle] = useState<(typeof angles)[number]>(90);
  const [pages, setPages] = useState("all");

  const handleSubmit = async () => {
    if (!files[0]) {
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", files[0]);
      formData.append("angle", String(angle));
      formData.append("pages", pages || "all");

      const response = await uploadFile("pdf/rotate", formData);
      setJobId(response.job_id);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <ToolLayout>
      <div className="space-y-6">
        <section className={panelClass}>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-violet-700 dark:text-violet-300">
            PDF Rotate
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 dark:text-white">Rotate every page or only the pages that need it</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
            Fix scanned documents, sideways exports, and mixed-orientation PDFs in one pass.
          </p>
        </section>

        <section className={`${panelClass} space-y-6`}>
          <FileUpload accept=".pdf,application/pdf" maxSizeMB={100} onFilesSelected={setFiles} />

          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Angle</h2>
            <div className="flex flex-wrap gap-3">
              {angles.map((value) => (
                <button
                  className={[
                    "rounded-2xl border px-5 py-3 text-sm font-medium transition",
                    angle === value
                      ? "border-sky-500 bg-sky-500/10 text-sky-700 dark:text-sky-300"
                      : "border-slate-300 text-slate-700 hover:border-slate-400 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600",
                  ].join(" ")}
                  key={value}
                  onClick={() => setAngle(value)}
                  type="button"
                >
                  {value}°
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-900 dark:text-white" htmlFor="pages">
              Pages
            </label>
            <input
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              id="pages"
              onChange={(event) => setPages(event.target.value)}
              placeholder="all or 1,3,5"
              type="text"
              value={pages}
            />
          </div>

          <button
            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
            disabled={!files.length || isUploading}
            onClick={handleSubmit}
            type="button"
          >
            {isUploading ? "Uploading..." : "Rotate PDF"}
          </button>
        </section>

        <JobProgress filename="rotated.pdf" jobId={jobId} prefix={prefix} onComplete={() => setIsUploading(false)} />
      </div>
    </ToolLayout>
  );
}
