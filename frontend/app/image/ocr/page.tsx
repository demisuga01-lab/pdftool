"use client";

import { useState } from "react";
import { Copy } from "lucide-react";

import { ToolLayout } from "@/components/layout/ToolLayout";
import { FileUpload } from "@/components/ui/FileUpload";
import { JobProgress } from "@/components/ui/JobProgress";

const panelClass =
  "rounded-3xl border border-slate-200 bg-white/85 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/85";

export default function ImageOcrPage() {
  const [jobId] = useState<string | null>(null);
  const [prefix] = useState<"pdf" | "image">("image");
  const [isUploading, setIsUploading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [language, setLanguage] = useState("eng");
  const [resultText, setResultText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!files[0]) {
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", files[0]);
      formData.append("language", language);

      const response = await fetch("/api/image/ocr", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as { result?: string; detail?: string };

      if (!response.ok) {
        throw new Error(data.detail ?? "OCR failed");
      }

      setResultText(data.result ?? "");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "OCR failed");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <ToolLayout>
      <div className="space-y-6">
        <section className={panelClass}>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700 dark:text-teal-300">
            OCR Image
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 dark:text-white">Extract text and keep it right on the page</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
            Upload an image or scanned document and copy the detected text directly from the result panel.
          </p>
        </section>

        <section className={`${panelClass} space-y-6`}>
          <FileUpload accept=".jpg,.jpeg,.png,.tiff,.pdf,image/jpeg,image/png,image/tiff,application/pdf" maxSizeMB={100} onFilesSelected={setFiles} />

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-900 dark:text-white" htmlFor="language">
              Language
            </label>
            <select
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              id="language"
              onChange={(event) => setLanguage(event.target.value)}
              value={language}
            >
              <option value="eng">English</option>
              <option value="eng+osd">Auto-detect</option>
            </select>
          </div>

          <button className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white" disabled={!files.length || isUploading} onClick={handleSubmit} type="button">
            {isUploading ? "Uploading..." : "Run OCR"}
          </button>

          {error ? <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p> : null}

          {resultText ? (
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Recognized text</h2>
                <button
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 transition hover:border-slate-400 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600"
                  onClick={() => navigator.clipboard.writeText(resultText)}
                  type="button"
                >
                  <Copy className="h-4 w-4" />
                  Copy
                </button>
              </div>
              <textarea
                className="min-h-72 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                readOnly
                value={resultText}
              />
            </div>
          ) : null}
        </section>

        <JobProgress filename="ocr.txt" jobId={jobId} prefix={prefix} />
      </div>
    </ToolLayout>
  );
}
