"use client";

import { useMemo, useState } from "react";

import { ToolLayout } from "@/components/layout/ToolLayout";
import { FileUpload } from "@/components/ui/FileUpload";
import { JobProgress } from "@/components/ui/JobProgress";
import { uploadFile } from "@/lib/api";

const qualityOptions = [
  { value: "screen", label: "Screen", description: "Strongest compression for quick sharing and previews." },
  { value: "ebook", label: "eBook", description: "Balanced quality for reading on phones, tablets, and web." },
  { value: "printer", label: "Printer", description: "Higher fidelity for local printing and office use." },
  { value: "prepress", label: "Prepress", description: "Best quality for archival copies and press output." },
] as const;

const tipByQuality: Record<(typeof qualityOptions)[number]["value"], string> = {
  screen: "Screen mode often produces the biggest reduction, especially for image-heavy PDFs.",
  ebook: "eBook mode is usually the safest starting point if you want smaller files without obvious degradation.",
  printer: "Printer mode keeps more detail, so size savings tend to be more modest.",
  prepress: "Prepress keeps the most fidelity and is best when print quality matters more than file size.",
};

const panelClass =
  "rounded-3xl border border-slate-200 bg-white/85 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/85";

export default function PdfCompressPage() {
  const [jobId, setJobId] = useState<string | null>(null);
  const [prefix] = useState<"pdf" | "image">("pdf");
  const [isUploading, setIsUploading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [quality, setQuality] = useState<(typeof qualityOptions)[number]["value"]>("ebook");

  const filename = useMemo(() => `compressed-${quality}.pdf`, [quality]);

  const handleSubmit = async () => {
    if (!files[0]) {
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", files[0]);
      formData.append("quality", quality);

      const response = await uploadFile("pdf/compress", formData);
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
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-700 dark:text-sky-300">
              PDF Compress
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-950 dark:text-white">
              Shrink PDF files without the usual friction
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
              Choose the output quality you want, upload a PDF, and let the backend optimize it for delivery,
              storage, or print.
            </p>
          </div>
        </section>

        <section className={`${panelClass} space-y-6`}>
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Compression quality</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {qualityOptions.map((option) => (
                <button
                  className={[
                    "rounded-2xl border p-4 text-left transition",
                    quality === option.value
                      ? "border-sky-500 bg-sky-500/10"
                      : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700",
                  ].join(" ")}
                  key={option.value}
                  onClick={() => setQuality(option.value)}
                  type="button"
                >
                  <p className="font-medium text-slate-950 dark:text-white">{option.label}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">{option.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
            {tipByQuality[quality]}
          </div>

          <FileUpload accept=".pdf,application/pdf" maxSizeMB={100} onFilesSelected={setFiles} />

          <div className="flex flex-wrap items-center gap-3">
            <button
              className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
              disabled={!files.length || isUploading}
              onClick={handleSubmit}
              type="button"
            >
              {isUploading ? "Uploading..." : "Compress PDF"}
            </button>
          </div>
        </section>

        <JobProgress filename={filename} jobId={jobId} prefix={prefix} onComplete={() => setIsUploading(false)} />
      </div>
    </ToolLayout>
  );
}
