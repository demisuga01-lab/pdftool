"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { ToolLayout } from "@/components/layout/ToolLayout";
import { FileUpload } from "@/components/ui/FileUpload";
import { JobProgress } from "@/components/ui/JobProgress";
import { uploadFile } from "@/lib/api";

const panelClass =
  "rounded-3xl border border-slate-200 bg-white/85 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/85";

export default function PdfProtectPage() {
  const [jobId, setJobId] = useState<string | null>(null);
  const [prefix] = useState<"pdf" | "image">("pdf");
  const [isUploading, setIsUploading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!files[0] || !password) {
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", files[0]);
      formData.append("user_password", password);
      formData.append("owner_password", "");

      const response = await uploadFile("pdf/encrypt", formData);
      setJobId(response.job_id);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <ToolLayout>
      <div className="space-y-6">
        <section className={panelClass}>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-fuchsia-700 dark:text-fuchsia-300">
            Protect PDF
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 dark:text-white">Add password protection before you share</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
            Encrypt a PDF with a password so only the right people can open it.
          </p>
        </section>

        <section className={`${panelClass} space-y-6`}>
          <FileUpload accept=".pdf,application/pdf" maxSizeMB={100} onFilesSelected={setFiles} />

          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-900 dark:text-white" htmlFor="password">
                Password
              </label>
              <div className="flex rounded-2xl border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950">
                <input
                  className="w-full rounded-l-2xl bg-transparent px-4 py-3 text-sm text-slate-950 outline-none dark:text-white"
                  id="password"
                  onChange={(event) => setPassword(event.target.value)}
                  type={showPassword ? "text" : "password"}
                  value={password}
                />
                <button
                  className="px-4 text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  onClick={() => setShowPassword((current) => !current)}
                  type="button"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-900 dark:text-white" htmlFor="confirm-password">
                Confirm password
              </label>
              <input
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                id="confirm-password"
                onChange={(event) => setConfirmPassword(event.target.value)}
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
              />
            </div>
          </div>

          {error ? <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p> : null}

          <button
            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
            disabled={!files.length || !password || !confirmPassword || isUploading}
            onClick={handleSubmit}
            type="button"
          >
            {isUploading ? "Uploading..." : "Protect PDF"}
          </button>
        </section>

        <JobProgress filename="protected.pdf" jobId={jobId} prefix={prefix} onComplete={() => setIsUploading(false)} />
      </div>
    </ToolLayout>
  );
}
