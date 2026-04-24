"use client";

import { useMemo, useState } from "react";

import { ToolLayout } from "@/components/layout/ToolLayout";
import { FileUpload } from "@/components/ui/FileUpload";
import { JobProgress } from "@/components/ui/JobProgress";
import { uploadFile } from "@/lib/api";

const lossyFormats = new Set(["jpg", "webp", "avif"]);
const panelClass =
  "rounded-3xl border border-slate-200 bg-white/85 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/85";

export default function ImageConvertPage() {
  const [jobId, setJobId] = useState<string | null>(null);
  const [prefix] = useState<"pdf" | "image">("image");
  const [isUploading, setIsUploading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [format, setFormat] = useState<"jpg" | "png" | "webp" | "avif" | "tiff">("jpg");
  const [quality, setQuality] = useState(85);

  const filename = useMemo(() => `converted-image.${format}`, [format]);

  const handleSubmit = async () => {
    if (!files[0]) {
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", files[0]);
      formData.append("format", format);
      formData.append("quality", String(quality));

      const response = await uploadFile("image/convert", formData);
      setJobId(response.job_id);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <ToolLayout>
      <div className="space-y-6">
        <section className={panelClass}>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-700 dark:text-sky-300">
            Image Convert
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 dark:text-white">Switch image formats without the busywork</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
            Convert to the format that fits your workflow, from lightweight web delivery to archival output.
          </p>
        </section>

        <section className={`${panelClass} space-y-6`}>
          <FileUpload
            accept=".jpg,.jpeg,.png,.webp,.tiff,.avif,image/jpeg,image/png,image/webp,image/tiff,image/avif"
            maxSizeMB={100}
            onFilesSelected={setFiles}
          />

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-900 dark:text-white" htmlFor="format">
                Output format
              </label>
              <select
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                id="format"
                onChange={(event) => setFormat(event.target.value as "jpg" | "png" | "webp" | "avif" | "tiff")}
                value={format}
              >
                <option value="jpg">JPG</option>
                <option value="png">PNG</option>
                <option value="webp">WEBP</option>
                <option value="avif">AVIF</option>
                <option value="tiff">TIFF</option>
              </select>
            </div>

            {lossyFormats.has(format) ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-900 dark:text-white" htmlFor="quality">
                  Quality: {quality}
                </label>
                <input
                  className="w-full accent-sky-500"
                  id="quality"
                  max={100}
                  min={1}
                  onChange={(event) => setQuality(Number(event.target.value))}
                  type="range"
                  value={quality}
                />
              </div>
            ) : null}
          </div>

          <button
            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
            disabled={!files.length || isUploading}
            onClick={handleSubmit}
            type="button"
          >
            {isUploading ? "Uploading..." : "Convert image"}
          </button>
        </section>

        <JobProgress filename={filename} jobId={jobId} prefix={prefix} onComplete={() => setIsUploading(false)} />
      </div>
    </ToolLayout>
  );
}
