"use client";

import { useState } from "react";

import { ToolLayout } from "@/components/layout/ToolLayout";
import { FileUpload } from "@/components/ui/FileUpload";
import { JobProgress } from "@/components/ui/JobProgress";
import { uploadFile } from "@/lib/api";

const panelClass =
  "rounded-3xl border border-slate-200 bg-white/85 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/85";

export default function ImageWatermarkPage() {
  const [jobId, setJobId] = useState<string | null>(null);
  const [prefix] = useState<"pdf" | "image">("image");
  const [isUploading, setIsUploading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [text, setText] = useState("");
  const [opacity, setOpacity] = useState(50);
  const [position, setPosition] = useState("bottom-right");

  const handleSubmit = async () => {
    if (!files[0] || !text.trim()) {
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", files[0]);
      formData.append("text", text);
      formData.append("opacity", String(opacity / 100));
      formData.append("position", position);

      const response = await uploadFile("image/watermark", formData);
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
            Image Watermark
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 dark:text-white">Add a simple text watermark before publishing</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
            Great for previews, drafts, client reviews, or branded media assets.
          </p>
        </section>

        <section className={`${panelClass} space-y-6`}>
          <FileUpload accept="image/*" maxSizeMB={100} onFilesSelected={setFiles} />

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-900 dark:text-white" htmlFor="watermark-text">
              Watermark text
            </label>
            <input
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              id="watermark-text"
              onChange={(event) => setText(event.target.value)}
              type="text"
              value={text}
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-900 dark:text-white" htmlFor="opacity">
                Opacity: {opacity}%
              </label>
              <input
                className="w-full accent-sky-500"
                id="opacity"
                max={100}
                min={0}
                onChange={(event) => setOpacity(Number(event.target.value))}
                type="range"
                value={opacity}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-900 dark:text-white" htmlFor="position">
                Position
              </label>
              <select
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                id="position"
                onChange={(event) => setPosition(event.target.value)}
                value={position}
              >
                <option value="top-left">Top left</option>
                <option value="top-right">Top right</option>
                <option value="center">Center</option>
                <option value="bottom-left">Bottom left</option>
                <option value="bottom-right">Bottom right</option>
              </select>
            </div>
          </div>

          <button className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white" disabled={!files.length || !text.trim() || isUploading} onClick={handleSubmit} type="button">
            {isUploading ? "Uploading..." : "Apply watermark"}
          </button>
        </section>

        <JobProgress filename="watermarked-image" jobId={jobId} prefix={prefix} onComplete={() => setIsUploading(false)} />
      </div>
    </ToolLayout>
  );
}
