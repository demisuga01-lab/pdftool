"use client";

import { useState } from "react";

import { ToolLayout } from "@/components/layout/ToolLayout";
import { FileUpload } from "@/components/ui/FileUpload";
import { JobProgress } from "@/components/ui/JobProgress";
import { uploadFile } from "@/lib/api";

const panelClass =
  "rounded-3xl border border-slate-200 bg-white/85 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/85";

export default function ImageBatchResizePage() {
  const [jobId, setJobId] = useState<string | null>(null);
  const [prefix] = useState<"pdf" | "image">("image");
  const [isUploading, setIsUploading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");

  const handleSubmit = async () => {
    if (!files[0] || !width || !height) {
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", files[0]);
      formData.append("width", width);
      formData.append("height", height);

      const response = await uploadFile("image/batch-resize", formData);
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
            Batch Resize
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 dark:text-white">Resize a whole zip of images at once</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
            Upload a zip archive, choose the target dimensions, and download the resized images as a new zip.
          </p>
        </section>

        <section className={`${panelClass} space-y-6`}>
          <FileUpload accept=".zip,application/zip" maxSizeMB={100} onFilesSelected={setFiles} />

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-900 dark:text-white" htmlFor="width">
                Width
              </label>
              <input className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white" id="width" min={1} onChange={(event) => setWidth(event.target.value)} type="number" value={width} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-900 dark:text-white" htmlFor="height">
                Height
              </label>
              <input className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white" id="height" min={1} onChange={(event) => setHeight(event.target.value)} type="number" value={height} />
            </div>
          </div>

          <button className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white" disabled={!files.length || !width || !height || isUploading} onClick={handleSubmit} type="button">
            {isUploading ? "Uploading..." : "Batch resize"}
          </button>
        </section>

        <JobProgress filename="resized-images.zip" jobId={jobId} prefix={prefix} onComplete={() => setIsUploading(false)} />
      </div>
    </ToolLayout>
  );
}
