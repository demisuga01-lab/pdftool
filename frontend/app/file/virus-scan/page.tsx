"use client";

import { useState } from "react";
import { Shield, ShieldAlert, ShieldCheck, Upload } from "lucide-react";

import { UploadProgress } from "@/components/ui/UploadProgress";
import { formatBytes } from "@/lib/format";
import { useWorkspaceJob } from "@/lib/workspace-job";

type ScanResult = {
  clean?: boolean;
  filename?: string;
  scanner?: "clamav" | "unavailable";
  size_bytes?: number;
};

function ResultCard({ result }: { result: ScanResult }) {
  const filename = result.filename || "Uploaded file";
  const size = typeof result.size_bytes === "number" ? formatBytes(result.size_bytes) : undefined;

  if (result.scanner === "unavailable") {
    return (
      <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex items-start gap-3">
          <Shield className="mt-0.5 h-5 w-5 shrink-0 text-zinc-500 dark:text-zinc-400" />
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Virus scanning is currently unavailable.</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">The file was not scanned.</p>
            <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">{[filename, size].filter(Boolean).join(" / ")}</p>
          </div>
        </div>
      </section>
    );
  }

  const clean = Boolean(result.clean);

  return (
    <section
      className={[
        "rounded-2xl border p-5",
        clean
          ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/20"
          : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        {clean ? (
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-300" />
        ) : (
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-300" />
        )}
        <div>
          <h2 className={["text-lg font-semibold", clean ? "text-emerald-900 dark:text-emerald-100" : "text-red-900 dark:text-red-100"].join(" ")}>
            {clean ? "No threats detected" : "Threat detected"}
          </h2>
          <p className={["mt-1 text-sm", clean ? "text-emerald-700 dark:text-emerald-200" : "text-red-700 dark:text-red-200"].join(" ")}>
            {clean ? "Scanned with ClamAV" : "This file was flagged by virus scanning. Do not open this file."}
          </p>
          <p className={["mt-3 text-sm", clean ? "text-emerald-700 dark:text-emerald-200" : "text-red-700 dark:text-red-200"].join(" ")}>
            {[filename, size].filter(Boolean).join(" / ")}
          </p>
        </div>
      </div>
    </section>
  );
}

export default function VirusScanPage() {
  const [file, setFile] = useState<File | null>(null);
  const job = useWorkspaceJob({
    approximateFileSize: file ? formatBytes(file.size) : undefined,
    fileType: file?.name.split(".").pop() || "file",
    filename: "virus-scan.json",
    inputFileName: file?.name,
    prefix: "file-tools",
    timeoutKind: "fast",
    toolName: "Virus Scanner",
  });

  const result = job.state === "success" && job.result?.result ? (job.result.result as ScanResult) : null;
  const busy = job.state === "uploading" || job.state === "queued" || job.state === "processing";

  const handleScan = () => {
    if (!file || busy) {
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    void job.process("file-tools/virus-scan", formData, { timeoutKind: "fast" });
  };

  return (
    <main className="min-h-[calc(100dvh-4rem)] bg-zinc-50 px-4 py-8 dark:bg-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">File Tools</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">Virus Scanner</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-600 dark:text-zinc-300">
              Scan any file for known threats using ClamAV signature detection.
            </p>
          </div>

          <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-14 text-center transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-white/15 dark:bg-zinc-900 dark:hover:bg-zinc-900/80">
            <input
              accept="*/*"
              className="hidden"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                job.reset();
              }}
              type="file"
            />
            <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-50 text-zinc-600 dark:bg-zinc-950 dark:text-zinc-300">
              <Upload className="h-6 w-6" />
            </span>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Upload any file</h2>
            <p className="mt-2 max-w-xl text-sm leading-7 text-zinc-500 dark:text-zinc-400">
              Upload any file to scan for known threats. Accepts all file types including executables.
            </p>
            <span className="mt-5 inline-flex min-h-11 items-center rounded-lg border border-zinc-200 px-4 text-sm text-zinc-700 dark:border-white/10 dark:text-zinc-200">
              Browse files
            </span>
          </label>

          {file ? (
            <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{file.name}</p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{formatBytes(file.size)}</p>
            </section>
          ) : null}

          {result ? <ResultCard result={result} /> : null}

          <p className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm leading-6 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
            This scan uses ClamAV signature detection and identifies known threats. It does not detect zero-day exploits or unknown malware. Do not rely on this scan as your only security measure.
          </p>
        </section>

        <aside className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 lg:self-start">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm leading-6 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
            {job.state === "failure" ? job.error ?? "Scan failed." : "Files up to 100 MB are supported."}
          </div>
          <button
            className="primary-button h-11 w-full text-sm"
            disabled={!file || busy}
            onClick={handleScan}
            type="button"
          >
            {busy ? job.processingLabel ?? "Scanning" : "Scan File"}
          </button>
        </aside>
      </div>

      {job.state === "uploading" && file ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4">
          <UploadProgress
            fileLabel="Uploading file"
            fileName={file.name}
            fileSize={file.size}
            onCancel={job.cancelUpload}
            percent={job.uploadPercent}
            remainingSecs={job.uploadRemainingSecs}
            speedKBs={job.uploadSpeedKBs}
          />
        </div>
      ) : null}
    </main>
  );
}
