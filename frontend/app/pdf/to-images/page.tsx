"use client";

import { useMemo, useState } from "react";

import { ToolLayout } from "@/components/layout/ToolLayout";
import { FileUpload } from "@/components/ui/FileUpload";
import { JobProgress } from "@/components/ui/JobProgress";
import { uploadFile } from "@/lib/api";

const panelClass =
  "rounded-3xl border border-slate-200 bg-white/85 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/85";

export default function PdfToImagesPage() {
  const [jobId, setJobId] = useState<string | null>(null);
  const [prefix] = useState<"pdf" | "image">("pdf");
  const [isUploading, setIsUploading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [dpi, setDpi] = useState<72 | 150 | 300>(150);
  const [format, setFormat] = useState<"png" | "jpeg" | "webp">("png");

  const filename = useMemo(() => `pdf-pages-${format}.zip`, [format]);

  const handleSubmit = async () => {
    if (!files[0]) {
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", files[0]);
      formData.append("dpi", String(dpi));
      formData.append("format", format);

      const response = await uploadFile("pdf/to-images", formData);
      setJobId(response.job_id);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <ToolLayout>
      <div className="space-y-6">
        <section className={panelClass}>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
            PDF to Images
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 dark:text-white">Render each page as an image</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
            Great for previews, thumbnails, slides, or workflows that need one image per page.
          </p>
        </section>

        <section className={`${panelClass} space-y-6`}>
          <FileUpload accept=".pdf,application/pdf" maxSizeMB={100} onFilesSelected={setFiles} />

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-900 dark:text-white" htmlFor="dpi">
                DPI
              </label>
              <select
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                id="dpi"
                onChange={(event) => setDpi(Number(event.target.value) as 72 | 150 | 300)}
                value={dpi}
              >
                <option value={72}>72 DPI</option>
                <option value={150}>150 DPI</option>
                <option value={300}>300 DPI</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-900 dark:text-white" htmlFor="format">
                Output format
              </label>
              <select
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                id="format"
                onChange={(event) => setFormat(event.target.value as "png" | "jpeg" | "webp")}
                value={format}
              >
                <option value="png">PNG</option>
                <option value="jpeg">JPEG</option>
                <option value="webp">WEBP</option>
              </select>
            </div>
          </div>

          <button
            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
            disabled={!files.length || isUploading}
            onClick={handleSubmit}
            type="button"
          >
            {isUploading ? "Uploading..." : "Convert to images"}
          </button>
        </section>

        <JobProgress filename={filename} jobId={jobId} prefix={prefix} onComplete={() => setIsUploading(false)} />
      </div>
    </ToolLayout>
  );
}
