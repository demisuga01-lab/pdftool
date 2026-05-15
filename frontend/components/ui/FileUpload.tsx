"use client";

import { type ChangeEvent, type DragEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { FileArchive, FileImage, FileText, Upload, X } from "lucide-react";

type FileUploadProps = {
  accept?: string;
  multiple?: boolean;
  maxSizeMB?: number;
  onFilesSelected?: (files: File[]) => void | Promise<void>;
  onUploadProgress?: (progress: number) => void;
};

const ACCEPT_SEPARATORS = /\s*,\s*/;

function formatBytes(bytes: number): string {
  if (bytes === 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** unitIndex;

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function matchesAccept(file: File, accept?: string): boolean {
  if (!accept) {
    return true;
  }

  return accept.split(ACCEPT_SEPARATORS).some((rule) => {
    if (!rule) {
      return false;
    }

    if (rule.startsWith(".")) {
      return file.name.toLowerCase().endsWith(rule.toLowerCase());
    }

    if (rule.endsWith("/*")) {
      return file.type.startsWith(`${rule.slice(0, -1)}`);
    }

    return file.type === rule;
  });
}

function getFileIcon(file: File) {
  if (file.type.startsWith("image/")) {
    return FileImage;
  }

  if (file.type === "application/pdf") {
    return FileText;
  }

  return FileArchive;
}

export function FileUpload({
  accept,
  multiple = false,
  maxSizeMB = 25,
  onFilesSelected,
  onUploadProgress,
}: FileUploadProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);

  const helperText = useMemo(() => {
    const uploadMode = multiple ? "files" : "a file";
    return `Drop ${uploadMode} here or click to browse`;
  }, [multiple]);

  const resetProgress = () => {
    if (animationRef.current !== null) {
      window.clearInterval(animationRef.current);
      animationRef.current = null;
    }

    setProgress(0);
    onUploadProgress?.(0);
  };

  const animateProgress = () => {
    resetProgress();
    let current = 0;
    animationRef.current = window.setInterval(() => {
      current = Math.min(current + 10, 100);
      setProgress(current);
      onUploadProgress?.(current);

      if (current >= 100 && animationRef.current !== null) {
        window.clearInterval(animationRef.current);
        animationRef.current = null;
      }
    }, 35);
  };

  const updateSelectedFiles = async (nextFiles: File[]) => {
    setFiles(nextFiles);
    await onFilesSelected?.(nextFiles);
  };

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) {
      return;
    }

    const nextFiles = Array.from(fileList);
    const oversizeFile = nextFiles.find((file) => file.size > maxSizeMB * 1024 * 1024);
    const invalidFile = nextFiles.find((file) => !matchesAccept(file, accept));

    if (oversizeFile) {
      setFiles([]);
      setError(`File is too large. Maximum size is ${maxSizeMB} MB.`);
      resetProgress();
      return;
    }

    if (invalidFile) {
      setFiles([]);
      setError(`"${invalidFile.name}" is not an accepted file type.`);
      resetProgress();
      return;
    }

    setError(null);
    animateProgress();

    try {
      await updateSelectedFiles(nextFiles);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to handle selected files.");
    }
  };

  const handleInputChange = async (event: ChangeEvent<HTMLInputElement>) => {
    await handleFiles(event.target.files);
    event.target.value = "";
  };

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    await handleFiles(event.dataTransfer.files);
  };

  const handleRemove = async (fileToRemove: File) => {
    const nextFiles = files.filter((file) => file !== fileToRemove);

    if (nextFiles.length === 0) {
      resetProgress();
    }

    await updateSelectedFiles(nextFiles);
  };

  useEffect(() => {
    return () => {
      if (animationRef.current !== null) {
        window.clearInterval(animationRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-4">
      <div
        aria-describedby={error ? `${inputId}-error` : undefined}
        aria-invalid={Boolean(error)}
        className={[
          "group relative rounded-2xl border-2 border-dashed bg-white p-5 shadow-[0_16px_45px_rgba(15,23,42,0.05)] transition dark:bg-zinc-900 dark:shadow-[0_18px_50px_rgba(0,0,0,0.24)] sm:p-8",
          isDragging
            ? "border-[#059669] bg-[#ECFDF5] dark:bg-emerald-500/10"
            : "border-zinc-300 hover:border-slate-400 dark:border-white/15 dark:hover:border-emerald-400/40",
          error ? "border-rose-400 bg-rose-50 dark:bg-rose-500/10" : "",
        ].join(" ")}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        role="button"
        tabIndex={0}
      >
        <input
          id={inputId}
          ref={inputRef}
          accept={accept}
          className="hidden"
          multiple={multiple}
          onChange={handleInputChange}
          type="file"
        />

        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm shadow-slate-900/5 dark:bg-zinc-950 dark:text-zinc-300">
            <Upload className="h-4 w-4" />
          </div>
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium text-slate-500 dark:text-zinc-300">{helperText}</p>
            <p className="break-words text-xs text-slate-400 dark:text-zinc-500">
              {accept ? `Accepted: ${accept}` : "All file types accepted"} | Max {maxSizeMB} MB
            </p>
            <p className="break-words text-xs text-slate-400 dark:text-zinc-500">
              Need help? Email{" "}
              <a className="font-semibold text-[#059669] hover:text-[#047857]" href="mailto:support@wellfriend.online">
                support@wellfriend.online
              </a>{" "}
              or join{" "}
              <a
                className="font-semibold text-[#059669] hover:text-[#047857]"
                href="https://discord.gg/ZQFmYaQbVu"
                rel="noreferrer"
                target="_blank"
              >
                Discord
              </a>
              .
            </p>
          </div>
        </div>

        {files.length > 0 ? (
          <div className="absolute inset-x-0 bottom-0 h-1 overflow-hidden rounded-b-lg bg-slate-200 dark:bg-zinc-800">
            <div
              className="h-full rounded-b-lg bg-[#059669] transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        ) : null}
      </div>

      {error ? (
        <div
          className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-300"
          id={`${inputId}-error`}
        >
          <X className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {files.length > 0 ? (
        <div className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-white/10 dark:bg-zinc-900">
          <div className="space-y-2">
            {files.map((file) => {
              const Icon = getFileIcon(file);

              return (
                <div
                  className="flex items-center justify-between gap-3 rounded-md border border-zinc-200 px-3 py-2 dark:border-white/10 dark:bg-zinc-950"
                  key={`${file.name}-${file.size}`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-zinc-50 text-slate-500 dark:bg-zinc-950 dark:text-zinc-300">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{file.name}</p>
                      <p className="truncate text-xs text-slate-400 dark:text-zinc-500">
                        {file.type || "Unknown type"} | {formatBytes(file.size)}
                      </p>
                    </div>
                  </div>
                  <button
                    aria-label={`Remove ${file.name}`}
                    className="ghost-button min-h-10 min-w-10 p-0 text-slate-400 hover:bg-transparent hover:text-slate-600 dark:text-zinc-500 dark:hover:text-slate-200"
                    onClick={() => void handleRemove(file)}
                    type="button"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
