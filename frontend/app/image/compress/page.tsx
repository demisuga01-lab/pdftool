"use client";

import { useState } from "react";

import { ToolLayout } from "@/components/layout/ToolLayout";
import { FileUpload } from "@/components/ui/FileUpload";
import { JobProgress } from "@/components/ui/JobProgress";
import { uploadFile } from "@/lib/api";

const panelClass =
  "rounded-3xl border border-slate-200 bg-white/85 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/85";

export default function ImageCompressPage() {
  const [jobId, setJobId] = useState<string | null>(null);
  const [prefix] = useState<"pdf" | "image">("image");
  const [isUploading, setIsUploading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [quality, setQuality] = useState(85);

  const handleSubmit = async () => {
    if (!files[0]) {
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", files[0]);
      formData.append("quality", String(quality));

      const response = await uploadFile("image/compress", formData);
      setJobId(response.job_id);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <ToolLayout>
      <div className="space-y-6">
        <section className={panelClass}>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-300">
            Image Compress
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 dark:text-white">Reduce image size while keeping useful detail</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
            Tune the quality level and get a smaller file that is easier to publish, upload, or share.
          </p>
        </section>

        <section className={`${panelClass} space-y-6`}>
          <FileUpload accept="image/*" maxSizeMB={100} onFilesSelected={setFiles} />

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

          <button
            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
            disabled={!files.length || isUploading}
            onClick={handleSubmit}
            type="button"
          >
            {isUploading ? "Uploading..." : "Compress image"}
          </button>
        </section>

        <JobProgress filename="compressed-image" jobId={jobId} prefix={prefix} onComplete={() => setIsUploading(false)} />
      </div>
    </ToolLayout>
  );
}
