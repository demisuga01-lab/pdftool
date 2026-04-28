"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { DownloadPanel } from "@/components/ui/DownloadPanel";
import { UploadProgress } from "@/components/ui/UploadProgress";
import { EmptyWorkspaceState, ImageWorkspace } from "@/components/workspace/ImageWorkspace";
import { WorkspaceControls, type ControlSection } from "@/components/workspace/Controls";
import { PDFThumbnailGrid, type WorkspaceThumbnailSize } from "@/components/workspace/PDFWorkspace";
import { downloadFile, pollJobStatus, toApiPath, type JobStatus } from "@/lib/api";
import {
  getFileMetadata,
  uploadFileToWorkspace,
  type UploadedFileMetadata,
  type UploadProgressHandler,
} from "@/lib/files";
import { estimateProcessingTime, formatBytes, slugifyBaseName } from "@/lib/format";
import {
  imageSummary,
  uploadedFileSummary,
  useObjectState,
  useSingleImagePreview,
  useUploadedPdfPageItems,
} from "@/lib/workspace-data";

type OcrSettings = {
  dpi: 200 | 300 | 400;
  language: "eng";
  outputFilename: string;
  outputFormat: "txt" | "json" | "searchable_pdf" | "docx" | "hocr";
};

type ProcessState = "idle" | "queued" | "processing" | "success" | "failure";

const sections: Array<ControlSection<OcrSettings>> = [
  {
    key: "language",
    label: "Language",
    fields: [
      {
        key: "language",
        label: "OCR language",
        type: "select",
        options: [{ label: "English", value: "eng" }],
      },
      {
        key: "dpi",
        label: "PDF rasterization DPI",
        type: "select",
        options: [
          { label: "200 DPI", value: 200 },
          { label: "300 DPI", value: 300 },
          { label: "400 DPI", value: 400 },
        ],
      },
    ],
  },
  {
    key: "output",
    label: "Output",
    fields: [
      {
        key: "outputFormat",
        label: "Output format",
        type: "radioCards",
        options: [
          { label: "TXT", description: "Plain extracted text", value: "txt" },
          { label: "JSON", description: "Text and word boxes", value: "json" },
          { label: "Searchable PDF", description: "PDF with invisible text layer", value: "searchable_pdf" },
          { label: "DOCX", description: "Word document with page headings", value: "docx" },
          { label: "HOCR", description: "HTML OCR output", value: "hocr" },
        ],
      },
      { key: "outputFilename", label: "Output filename", type: "text", placeholder: "ocr-output" },
    ],
  },
];

function outputExtension(format: OcrSettings["outputFormat"]) {
  if (format === "searchable_pdf") {
    return "pdf";
  }
  if (format === "hocr") {
    return "hocr";
  }
  return format;
}

function fileFromMetadata(metadata: UploadedFileMetadata): File {
  return new File([], metadata.original_name, { type: metadata.mime_type });
}

export default function OcrPage() {
  const pathname = usePathname();
  const router = useRouter();
  const [queryString, setQueryString] = useState("");
  const searchParams = useMemo(() => new URLSearchParams(queryString), [queryString]);
  const uploadAbortRef = useRef<AbortController | null>(null);
  const processAbortRef = useRef<AbortController | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileMeta, setFileMeta] = useState<UploadedFileMetadata | null>(null);
  const [pdfSize, setPdfSize] = useState<WorkspaceThumbnailSize>("medium");
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "failure">("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [uploadSpeedKBs, setUploadSpeedKBs] = useState(0);
  const [uploadRemainingSecs, setUploadRemainingSecs] = useState(0);
  const [uploadedBytes, setUploadedBytes] = useState(0);
  const [uploadTotalBytes, setUploadTotalBytes] = useState(0);
  const [jobState, setJobState] = useState<ProcessState>("idle");
  const [jobId, setJobId] = useState<string | null>(searchParams.get("job_id"));
  const [jobResult, setJobResult] = useState<JobStatus | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);
  const [panelDismissed, setPanelDismissed] = useState(false);
  const { state: settings, update } = useObjectState<OcrSettings>({
    dpi: 300,
    language: "eng",
    outputFilename: "",
    outputFormat: "txt",
  });

  const currentFile = file ?? (fileMeta ? fileFromMetadata(fileMeta) : null);
  const isPdf = fileMeta?.extension.toLowerCase() === "pdf";
  const imagePreview = useSingleImagePreview(file && !isPdf ? file : null);
  const preview = imagePreview ?? (
    fileMeta && currentFile && !isPdf
      ? {
          dataUrl: fileMeta.preview_url,
          file: currentFile,
          format: fileMeta.extension,
          height: Number(fileMeta.metadata?.height ?? 0),
          size: fileMeta.size_bytes,
          width: Number(fileMeta.metadata?.width ?? 0),
        }
      : null
  );
  const { items, pageCount, setItems } = useUploadedPdfPageItems(
    isPdf && fileMeta ? fileMeta.file_id : null,
    Number(fileMeta?.metadata?.page_count ?? fileMeta?.pages ?? 0),
  );
  const outputName = currentFile
    ? `${settings.outputFilename.trim() || slugifyBaseName(currentFile.name)}.${outputExtension(settings.outputFormat)}`
    : `ocr-output.${outputExtension(settings.outputFormat)}`;

  const syncQuery = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });
      const query = params.toString();
      setQueryString(query);
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const handleUploadProgress: UploadProgressHandler = (progress) => {
    setUploadPercent(progress.percentage);
    setUploadSpeedKBs(progress.uploadSpeedKBs);
    setUploadRemainingSecs(progress.estimatedSecondsRemaining);
    setUploadedBytes(progress.uploadedBytes);
    setUploadTotalBytes(progress.totalBytes);
  };

  useEffect(() => {
    setQueryString(window.location.search.replace(/^\?/, ""));
  }, [pathname]);

  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      const nextFile = files[0];
      if (!nextFile) {
        return;
      }

      uploadAbortRef.current?.abort();
      const controller = new AbortController();
      uploadAbortRef.current = controller;
      setFile(nextFile);
      setFileMeta(null);
      setUploadState("uploading");
      setUploadError(null);
      setJobState("idle");
      setJobId(null);
      setJobResult(null);
      setJobError(null);
      setPanelDismissed(false);
      setUploadPercent(0);
      setUploadSpeedKBs(0);
      setUploadRemainingSecs(0);
      setUploadedBytes(0);
      setUploadTotalBytes(nextFile.size);

      try {
        const metadata = await uploadFileToWorkspace(nextFile, handleUploadProgress, controller.signal);
        setFileMeta(metadata);
        setUploadState("idle");
        syncQuery({ file_id: metadata.file_id, job_id: null });
      } catch (caughtError) {
        if (controller.signal.aborted) {
          return;
        }
        setUploadState("failure");
        setUploadError(caughtError instanceof Error ? caughtError.message : "Upload failed");
      }
    },
    [syncQuery],
  );

  const handleProcess = useCallback(async () => {
    if (!fileMeta) {
      return;
    }

    const formData = new FormData();
    formData.append("file_id", fileMeta.file_id);
    formData.append("language", settings.language);
    formData.append("output_format", settings.outputFormat);
    formData.append("dpi", String(settings.dpi));
    formData.append("output_filename", settings.outputFilename.trim());
    const controller = new AbortController();
    processAbortRef.current?.abort();
    processAbortRef.current = controller;
    setJobState("queued");
    setJobError(null);
    setJobResult(null);
    setPanelDismissed(false);

    try {
      const response = await fetch(toApiPath("ocr"), {
        body: formData,
        method: "POST",
        signal: controller.signal,
      });
      const data = (await response.json()) as { detail?: string; error?: string; job_id?: string };
      if (!response.ok || !data.job_id) {
        throw new Error(data.detail || data.error || "Unable to start OCR");
      }
      setJobId(data.job_id);
      syncQuery({ file_id: fileMeta.file_id, job_id: data.job_id });
      const finalStatus = await pollJobStatus("image", data.job_id, controller.signal, (status) => {
        if (status.status === "queued" || status.status === "processing") {
          setJobState(status.status);
        }
      }, "ocr");
      setJobResult(finalStatus);
      setJobState(finalStatus.status);
      setJobError(finalStatus.error ?? null);
    } catch (caughtError) {
      if (controller.signal.aborted) {
        return;
      }
      setJobState("failure");
      setJobError(caughtError instanceof Error ? caughtError.message : "Unable to run OCR");
    }
  }, [fileMeta, settings, syncQuery]);

  useEffect(() => {
    const fileId = searchParams.get("file_id");
    if (!fileId || fileMeta?.file_id === fileId) {
      return;
    }
    let cancelled = false;
    getFileMetadata(fileId)
      .then((metadata) => {
        if (!cancelled) {
          setFile(null);
          setFileMeta(metadata);
          setUploadState("idle");
        }
      })
      .catch((caughtError: unknown) => {
        if (!cancelled) {
          setUploadState("failure");
          setUploadError(caughtError instanceof Error ? caughtError.message : "Uploaded file could not be loaded.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [fileMeta?.file_id, searchParams]);

  useEffect(() => {
    const queryJobId = searchParams.get("job_id");
    if (queryJobId && !jobId) {
      setJobId(queryJobId);
    }
  }, [jobId, searchParams]);

  const processingLabel = useMemo(() => {
    if (uploadState === "uploading") {
      return "Uploading";
    }
    if (uploadState === "failure") {
      return uploadError ?? "Upload failed";
    }
    if (jobState === "queued") {
      return "Preparing pages";
    }
    if (jobState === "processing") {
      return "Running OCR";
    }
    if (jobState === "success") {
      return "Ready";
    }
    if (jobState === "failure") {
      return jobError ?? "OCR failed";
    }
    return null;
  }, [jobError, jobState, uploadError, uploadState]);

  return (
    <ImageWorkspace
      breadcrumbTitle="OCR"
      centerContent={
        fileMeta ? (
          <div className="mx-auto max-w-5xl rounded-2xl border border-[#E5E7EB] bg-white p-4 sm:p-6">
            <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4 sm:min-h-[520px] sm:p-6">
              {isPdf ? (
                <div className="w-full space-y-4">
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-center">
                    <p className="text-sm font-semibold text-[#2563EB]">PDF OCR preview</p>
                    <h2 className="mt-2 text-xl font-bold text-slate-900">{fileMeta.original_name}</h2>
                    <p className="mt-2 text-sm font-medium leading-6 text-slate-500">Preparing pages with MuPDF before Tesseract.</p>
                  </div>
                  <PDFThumbnailGrid items={items} onReorder={setItems} onToggleSelect={() => {}} size={pdfSize} />
                </div>
              ) : preview ? (
                <img
                  alt={fileMeta.original_name}
                  className="max-h-[460px] max-w-full rounded-xl border border-[#E5E7EB] bg-white object-contain"
                  src={preview.dataUrl}
                />
              ) : null}
            </div>
          </div>
        ) : null
      }
      countLabel={isPdf ? `${pageCount} pages` : preview && preview.width > 0 ? `${preview.width} x ${preview.height} px` : undefined}
      description="Extract text from PDFs and images, including searchable PDF output."
      downloadPanel={
        jobState !== "idle" && !panelDismissed ? (
          <DownloadPanel
            error={jobError}
            errorDetails={jobResult?.traceback}
            estimatedTime={fileMeta ? estimateProcessingTime(fileMeta.size_bytes, isPdf ? pageCount || 3 : 1) : undefined}
            jobId={jobId}
            onDownload={jobState === "success" && jobId ? () => downloadFile("image", jobId, outputName) : undefined}
            onProcessAnother={() => {
              setFile(null);
              setFileMeta(null);
              setJobState("idle");
              setJobId(null);
              setJobResult(null);
              setJobError(null);
              syncQuery({ file_id: null, job_id: null });
            }}
            onReedit={() => setPanelDismissed(true)}
            outputFilename={jobState === "success" ? outputName : undefined}
            state={jobState === "success" ? "success" : jobState === "failure" ? "failure" : jobState}
            statusText={processingLabel ?? undefined}
          />
        ) : null
      }
      emptyState={
        <EmptyWorkspaceState
          accept=".pdf,.jpg,.jpeg,.png,.tif,.tiff,.webp,image/*,application/pdf"
          description="Upload a PDF or image to extract text."
          onFilesSelected={(files) => {
            void handleFilesSelected(files);
          }}
        />
      }
      estimatedTime={fileMeta ? estimateProcessingTime(fileMeta.size_bytes, isPdf ? pageCount || 3 : 1) : undefined}
      fileInfo={isPdf ? uploadedFileSummary(fileMeta) : uploadedFileSummary(fileMeta) ?? imageSummary(preview)}
      fileName={fileMeta?.original_name}
      hasContent={Boolean(fileMeta)}
      onDownload={jobState === "success" && jobId ? () => downloadFile("image", jobId, outputName) : undefined}
      onProcess={handleProcess}
      onReset={() => {
        setFile(null);
        setFileMeta(null);
        setJobState("idle");
        setJobId(null);
        setJobResult(null);
        setJobError(null);
        syncQuery({ file_id: null, job_id: null });
      }}
      processButtonDisabled={!fileMeta}
      processingLabel={processingLabel}
      rightPanel={
        <div className="space-y-6">
          <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-[13px] font-medium leading-6 text-slate-500">
            {uploadState === "failure"
              ? uploadError ?? "Upload failed."
              : jobState === "failure"
                ? jobError ?? "OCR failed."
                : "Stages: Uploading, Preparing pages, Running OCR, Building output, Ready."}
          </div>
          <WorkspaceControls sections={sections} state={settings} update={update} />
        </div>
      }
      setSize={setPdfSize}
      showSizeToggle={Boolean(isPdf)}
      size={pdfSize}
      uploadOverlay={
        file && uploadState === "uploading" ? (
          <UploadProgress
            fileLabel="Uploading"
            fileName={file.name}
            fileSize={file.size}
            onCancel={() => uploadAbortRef.current?.abort()}
            percent={uploadPercent}
            remainingSecs={uploadRemainingSecs}
            speedKBs={uploadSpeedKBs}
            totalBytes={uploadTotalBytes}
            uploadedBytes={uploadedBytes}
          />
        ) : null
      }
    />
  );
}
