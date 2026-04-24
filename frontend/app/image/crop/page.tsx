"use client";

import { useState } from "react";

import { ToolLayout } from "@/components/layout/ToolLayout";
import { FileUpload } from "@/components/ui/FileUpload";
import { JobProgress } from "@/components/ui/JobProgress";
import { uploadFile } from "@/lib/api";

const panelClass =
  "rounded-3xl border border-slate-200 bg-white/85 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/85";

export default function ImageCropPage() {
  const [jobId, setJobId] = useState<string | null>(null);
  const [prefix] = useState<"pdf" | "image">("image");
  const [isUploading, setIsUploading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [x, setX] = useState("0");
  const [y, setY] = useState("0");
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
      formData.append("x", x || "0");
      formData.append("y", y || "0");
      formData.append("width", width);
      formData.append("height", height);

      const response = await uploadFile("image/crop", formData);
      setJobId(response.job_id);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <ToolLayout>
      <div className="space-y-6">
        <section className={panelClass}>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-rose-700 dark:text-rose-300">
            Image Crop
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 dark:text-white">Crop by coordinates when you need exact control</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
            Enter the top-left point and the target crop size to cut to a precise area.
          </p>
        </section>

        <section className={`${panelClass} space-y-6`}>
          <FileUpload accept="image/*" maxSizeMB={100} onFilesSelected={setFiles} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-900 dark:text-white" htmlFor="x">
                X
              </label>
              <input className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white" id="x" min={0} onChange={(event) => setX(event.target.value)} type="number" value={x} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-900 dark:text-white" htmlFor="y">
                Y
              </label>
              <input className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white" id="y" min={0} onChange={(event) => setY(event.target.value)} type="number" value={y} />
            </div>
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
            {isUploading ? "Uploading..." : "Crop image"}
          </button>
        </section>

        <JobProgress filename="cropped-image" jobId={jobId} prefix={prefix} onComplete={() => setIsUploading(false)} />
      </div>
    </ToolLayout>
  );
}
