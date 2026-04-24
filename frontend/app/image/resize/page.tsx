"use client";

import { useEffect, useState } from "react";

import { ToolLayout } from "@/components/layout/ToolLayout";
import { FileUpload } from "@/components/ui/FileUpload";
import { JobProgress } from "@/components/ui/JobProgress";
import { uploadFile } from "@/lib/api";

const panelClass =
  "rounded-3xl border border-slate-200 bg-white/85 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/85";

export default function ImageResizePage() {
  const [jobId, setJobId] = useState<string | null>(null);
  const [prefix] = useState<"pdf" | "image">("image");
  const [isUploading, setIsUploading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [lockRatio, setLockRatio] = useState(true);
  const [fit, setFit] = useState<"cover" | "contain" | "fill">("cover");
  const [originalSize, setOriginalSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    const file = files[0];
    if (!file || !file.type.startsWith("image/")) {
      setOriginalSize(null);
      return;
    }

    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      setOriginalSize({ width: image.naturalWidth, height: image.naturalHeight });
      URL.revokeObjectURL(url);
    };
    image.src = url;

    return () => URL.revokeObjectURL(url);
  }, [files]);

  const handleWidthChange = (value: string) => {
    setWidth(value);

    if (lockRatio && originalSize && value) {
      const nextWidth = Number(value);
      if (Number.isFinite(nextWidth) && nextWidth > 0) {
        setHeight(String(Math.round((nextWidth / originalSize.width) * originalSize.height)));
      }
    }
  };

  const handleHeightChange = (value: string) => {
    setHeight(value);

    if (lockRatio && originalSize && value) {
      const nextHeight = Number(value);
      if (Number.isFinite(nextHeight) && nextHeight > 0) {
        setWidth(String(Math.round((nextHeight / originalSize.height) * originalSize.width)));
      }
    }
  };

  const handleSubmit = async () => {
    if (!files[0] || (!width && !height)) {
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", files[0]);
      if (width) {
        formData.append("width", width);
      }
      if (height) {
        formData.append("height", height);
      }
      formData.append("fit", fit);

      const response = await uploadFile("image/resize", formData);
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
            Image Resize
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 dark:text-white">Resize with control over fit and proportions</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
            Set exact dimensions, keep the original aspect ratio when needed, and choose how the image should fill the frame.
          </p>
        </section>

        <section className={`${panelClass} space-y-6`}>
          <FileUpload accept="image/*" maxSizeMB={100} onFilesSelected={setFiles} />

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-900 dark:text-white" htmlFor="width">
                Width
              </label>
              <input
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                id="width"
                min={1}
                onChange={(event) => handleWidthChange(event.target.value)}
                type="number"
                value={width}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-900 dark:text-white" htmlFor="height">
                Height
              </label>
              <input
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                id="height"
                min={1}
                onChange={(event) => handleHeightChange(event.target.value)}
                type="number"
                value={height}
              />
            </div>
          </div>

          <label className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
            <input
              checked={lockRatio}
              className="h-4 w-4 rounded border-slate-300 text-sky-500 focus:ring-sky-500"
              onChange={(event) => setLockRatio(event.target.checked)}
              type="checkbox"
            />
            Lock aspect ratio
          </label>

          {originalSize ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Original size: {originalSize.width} x {originalSize.height}
            </p>
          ) : null}

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-900 dark:text-white" htmlFor="fit">
              Fit mode
            </label>
            <select
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              id="fit"
              onChange={(event) => setFit(event.target.value as "cover" | "contain" | "fill")}
              value={fit}
            >
              <option value="cover">Cover</option>
              <option value="contain">Contain</option>
              <option value="fill">Fill</option>
            </select>
          </div>

          <button
            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
            disabled={!files.length || (!width && !height) || isUploading}
            onClick={handleSubmit}
            type="button"
          >
            {isUploading ? "Uploading..." : "Resize image"}
          </button>
        </section>

        <JobProgress filename="resized-image" jobId={jobId} prefix={prefix} onComplete={() => setIsUploading(false)} />
      </div>
    </ToolLayout>
  );
}
