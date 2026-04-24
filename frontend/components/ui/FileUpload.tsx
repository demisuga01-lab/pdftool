"use client";

import { type ChangeEvent, type DragEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { FileArchive, FileImage, FileText, UploadCloud, XCircle } from "lucide-react";

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
  maxSizeMB = 100,
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

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) {
      return;
    }

    const nextFiles = Array.from(fileList);
    const oversizeFile = nextFiles.find((file) => file.size > maxSizeMB * 1024 * 1024);
    const invalidFile = nextFiles.find((file) => !matchesAccept(file, accept));

    if (oversizeFile) {
      setFiles([]);
      setError(`"${oversizeFile.name}" exceeds the ${maxSizeMB} MB limit.`);
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
    setFiles(nextFiles);
    animateProgress();

    try {
      await onFilesSelected?.(nextFiles);
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
          "group relative rounded-2xl border border-dashed p-8 transition",
          isDragging
            ? "border-sky-500 bg-sky-500/10"
            : "border-slate-300 bg-white/80 hover:border-sky-400 hover:bg-sky-50/80 dark:border-slate-700 dark:bg-slate-900/80 dark:hover:border-sky-500 dark:hover:bg-slate-900",
          error ? "border-rose-500 bg-rose-500/10" : "",
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
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
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
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-300">
            <UploadCloud className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <p className="text-base font-semibold text-slate-900 dark:text-slate-50">{helperText}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {accept ? `Accepted: ${accept}` : "All file types accepted"} | Max {maxSizeMB} MB
            </p>
          </div>
        </div>
      </div>

      {error ? (
        <div
          className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300"
          id={`${inputId}-error`}
        >
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {files.length > 0 ? (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-900/80">
          <div className="space-y-2">
            {files.map((file) => {
              const Icon = getFileIcon(file);

              return (
                <div
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 px-3 py-2 dark:border-slate-800"
                  key={`${file.name}-${file.size}`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-50">{file.name}</p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {file.type || "Unknown type"} | {formatBytes(file.size)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
              <span>Upload progress</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-sky-500 transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
