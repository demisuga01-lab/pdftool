"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { DownloadPanel } from "@/components/ui/DownloadPanel";
import { UploadProgress } from "@/components/ui/UploadProgress";
import { WorkspaceControls, type ControlSection } from "@/components/workspace/Controls";
import { EmptyWorkspaceState, ImageWorkspace } from "@/components/workspace/ImageWorkspace";
import { UploadedImagePreview, UploadedPdfPreview } from "@/components/workspace/WorkspacePageBuilders";
import { getFileMetadata, type UploadedFileMetadata, type UploadProgressHandler, uploadFileToWorkspace } from "@/lib/files";
import { estimateProcessingTime, slugifyBaseName } from "@/lib/format";
import { useWorkspaceJob } from "@/lib/workspace-job";
import { imageSummary, uploadedFileSummary, useObjectState, useUploadedPdfPageItems } from "@/lib/workspace-data";

type ConvertKind = "pdf" | "office" | "text" | "csv" | "image" | "svg" | "unknown";

type ConvertSettings = {
  dpi: number;
  outputFilename: string;
  preserveMetadata: boolean;
  quality: number;
  toFormat: string;
  transparent: boolean;
};

type ConvertOption = {
  description: string;
  label: string;
  value: string;
};

const pdfFormats = new Set(["pdf"]);
const officeFormats = new Set(["doc", "docx", "xls", "xlsx", "ppt", "pptx", "odt", "ods", "odp", "rtf"]);
const imageFormats = new Set(["jpg", "jpeg", "png", "webp", "avif", "tif", "tiff", "bmp"]);

function normalizeFormat(value: string | null | undefined) {
  const normalized = (value ?? "").toLowerCase().trim().replace(/^\./, "");
  if (normalized === "jpeg") {
    return "jpg";
  }
  if (normalized === "tif") {
    return "tiff";
  }
  if (normalized === "htm") {
    return "html";
  }
  return normalized;
}

function detectKind(format: string): ConvertKind {
  if (pdfFormats.has(format)) {
    return "pdf";
  }
  if (format === "svg") {
    return "svg";
  }
  if (imageFormats.has(format)) {
    return "image";
  }
  if (format === "csv") {
    return "csv";
  }
  if (officeFormats.has(format)) {
    return "office";
  }
  if (["txt", "html"].includes(format)) {
    return "text";
  }
  return "unknown";
}

function optionsForKind(kind: ConvertKind): ConvertOption[] {
  switch (kind) {
    case "pdf":
      return [
        { label: "DOCX", value: "docx", description: "PDF to Word" },
        { label: "XLSX", value: "xlsx", description: "PDF to Excel" },
        { label: "PNG", value: "png", description: "PDF pages to images" },
        { label: "JPG", value: "jpg", description: "PDF pages to JPEG images" },
        { label: "WebP", value: "webp", description: "PDF pages to WebP images" },
        { label: "TXT", value: "txt", description: "PDF to plain text" },
        { label: "HTML", value: "html", description: "PDF to HTML" },
        { label: "Searchable PDF", value: "searchable_pdf", description: "OCR-backed searchable PDF" },
      ];
    case "office":
      return [{ label: "PDF", value: "pdf", description: "Office document to PDF" }];
    case "csv":
      return [
        { label: "PDF", value: "pdf", description: "CSV to PDF" },
        { label: "XLSX", value: "xlsx", description: "CSV to Excel workbook" },
      ];
    case "text":
      return [{ label: "PDF", value: "pdf", description: "Document to PDF" }];
    case "svg":
      return [
        { label: "PNG", value: "png", description: "SVG to raster image" },
        { label: "PDF", value: "pdf", description: "SVG to PDF" },
        { label: "EPS", value: "eps", description: "SVG to EPS" },
      ];
    case "image":
      return [
        { label: "JPG", value: "jpg", description: "Image to JPEG" },
        { label: "PNG", value: "png", description: "Image to PNG" },
        { label: "WebP", value: "webp", description: "Image to WebP" },
        { label: "AVIF", value: "avif", description: "Image to AVIF" },
        { label: "TIFF", value: "tiff", description: "Image to TIFF" },
        { label: "BMP", value: "bmp", description: "Image to BMP" },
        { label: "PDF", value: "pdf", description: "Image to PDF" },
      ];
    default:
      return [];
  }
}

function suggestedOutputName(fileMeta: UploadedFileMetadata | null, settings: ConvertSettings, outputExtension: string) {
  const originalName = fileMeta?.original_name ?? fileMeta?.filename ?? "converted-file";
  const base = settings.outputFilename.trim() || slugifyBaseName(originalName);
  return `${base}.${outputExtension}`;
}

export default function ConvertPage() {
  const pathname = usePathname();
  const router = useRouter();
  const [queryString, setQueryString] = useState("");
  const searchParams = useMemo(() => new URLSearchParams(queryString), [queryString]);
  const uploadAbortRef = useRef<AbortController | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileMeta, setFileMeta] = useState<UploadedFileMetadata | null>(null);
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "failure">("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [uploadSpeedKBs, setUploadSpeedKBs] = useState(0);
  const [uploadRemainingSecs, setUploadRemainingSecs] = useState(0);
  const [uploadedBytes, setUploadedBytes] = useState(0);
  const [uploadTotalBytes, setUploadTotalBytes] = useState(0);
  const { state: settings, update } = useObjectState<ConvertSettings>({
    dpi: 180,
    outputFilename: "",
    preserveMetadata: false,
    quality: 85,
    toFormat: normalizeFormat(searchParams.get("to")) || "pdf",
    transparent: false,
  });
  const inputFormat = normalizeFormat(fileMeta?.extension || searchParams.get("from"));
  const inputKind = detectKind(inputFormat);
  const outputOptions = useMemo(() => optionsForKind(inputKind), [inputKind]);
  const outputFormat = settings.toFormat;
  const { items, pageCount } = useUploadedPdfPageItems(
    inputKind === "pdf" && fileMeta ? fileMeta.file_id : null,
    Number(fileMeta?.metadata?.page_count ?? fileMeta?.pages ?? 0),
  );
  const outputExtension =
    inputKind === "pdf" && ["png", "jpg", "webp"].includes(outputFormat)
      ? "zip"
      : outputFormat === "searchable_pdf"
        ? "pdf"
        : outputFormat;
  const outputFilename = suggestedOutputName(fileMeta, settings, outputExtension || "pdf");
  const job = useWorkspaceJob({
    filename: outputFilename,
    prefix: "convert",
  });

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
      const nextQuery = params.toString();
      setQueryString(nextQuery);
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
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

  useEffect(() => {
    if (outputOptions.length === 0) {
      return;
    }
    if (!outputOptions.some((option) => option.value === settings.toFormat)) {
      update("toFormat", outputOptions[0].value);
    }
  }, [outputOptions, settings.toFormat]);

  useEffect(() => {
    const requestedOutput = normalizeFormat(searchParams.get("to"));
    if (requestedOutput && requestedOutput !== settings.toFormat) {
      update("toFormat", requestedOutput);
    }
  }, [searchParams, settings.toFormat]);

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
      setUploadPercent(0);
      setUploadSpeedKBs(0);
      setUploadRemainingSecs(0);
      setUploadedBytes(0);
      setUploadTotalBytes(nextFile.size);
      job.reset();

      try {
        const metadata = await uploadFileToWorkspace(nextFile, handleUploadProgress, controller.signal);
        setFileMeta(metadata);
        setUploadState("idle");
        syncQuery({ file_id: metadata.file_id, from: normalizeFormat(metadata.extension), to: settings.toFormat });
      } catch (caughtError) {
        if (controller.signal.aborted) {
          return;
        }
        setUploadState("failure");
        setUploadError(caughtError instanceof Error ? caughtError.message : "Upload failed");
      }
    },
    [job, settings.toFormat, syncQuery],
  );

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

  const handleProcess = () => {
    if (!fileMeta || !settings.toFormat) {
      return;
    }

    const formData = new FormData();
    formData.append("file_id", fileMeta.file_id);
    formData.append("from_format", inputFormat);
    formData.append("to_format", settings.toFormat);
    formData.append(
      "settings",
      JSON.stringify({
        dpi: settings.dpi,
        preserve_metadata: settings.preserveMetadata,
        quality: settings.quality,
        transparent: settings.transparent,
      }),
    );
    syncQuery({ file_id: fileMeta.file_id, from: inputFormat, to: settings.toFormat });
    job.process("convert", formData);
  };

  const sections: Array<ControlSection<ConvertSettings>> = useMemo(
    () => [
      {
        key: "output",
        label: "Output",
        fields: [
          {
            key: "toFormat",
            label: "Convert to",
            type: "radioCards",
            options: outputOptions.map((option) => ({
              description: option.description,
              label: option.label,
              value: option.value,
            })),
          },
          {
            key: "outputFilename",
            label: "Output filename",
            type: "text",
            placeholder: "converted-file",
          },
        ],
      },
      {
        key: "quality",
        label: "Quality",
        fields: [
          {
            key: "dpi",
            label: "PDF/image render DPI",
            type: "slider",
            min: 72,
            max: 400,
            valueSuffix: " DPI",
            show: () => inputKind === "pdf",
          },
          {
            key: "quality",
            label: "Output quality",
            type: "slider",
            min: 1,
            max: 100,
            show: () => ["image", "svg", "pdf"].includes(inputKind),
          },
          {
            key: "transparent",
            label: "Transparent background when possible",
            type: "toggle",
            show: () => inputKind === "pdf" && settings.toFormat === "png",
          },
          {
            key: "preserveMetadata",
            label: "Preserve image metadata",
            type: "toggle",
            show: () => inputKind === "image" || inputKind === "svg",
          },
        ],
      },
    ],
    [inputKind, outputOptions, settings.toFormat],
  );

  const previewContent = useMemo(() => {
    if (!fileMeta) {
      return null;
    }

    if (inputKind === "pdf") {
      return <UploadedPdfPreview fileId={fileMeta.file_id} items={items} pageCount={pageCount} />;
    }

    if (inputKind === "image" || inputKind === "svg") {
      return <UploadedImagePreview alt={fileMeta.original_name} src={fileMeta.preview_url} />;
    }

    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-[#E5E7EB] bg-white p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#2563EB]">Document ready</p>
        <h2 className="mt-3 text-2xl font-bold text-slate-900">{fileMeta.original_name}</h2>
        <p className="mt-3 text-sm font-medium leading-6 text-slate-500">
          This file type does not have a live preview in the browser, but it is uploaded and ready to convert.
        </p>
      </div>
    );
  }, [fileMeta, inputKind, items, pageCount]);

  return (
    <ImageWorkspace
      breadcrumbTitle="Convert"
      centerContent={previewContent}
      countLabel={
        inputKind === "pdf"
          ? pageCount > 0
            ? `${pageCount} pages`
            : undefined
          : inputKind === "image" || inputKind === "svg"
            ? imageSummary(
                fileMeta
                  ? {
                      dataUrl: fileMeta.preview_url,
                      file: new File([], fileMeta.original_name, { type: fileMeta.mime_type }),
                      format: fileMeta.extension,
                      height: Number(fileMeta.metadata?.height ?? 0),
                      size: fileMeta.size_bytes,
                      width: Number(fileMeta.metadata?.width ?? 0),
                    }
                  : null,
              ) ?? undefined
            : inputFormat.toUpperCase()
      }
      description="One conversion workspace for PDF, Office files, spreadsheets, text, HTML, CSV, and images."
      downloadPanel={
        fileMeta && job.state !== "idle" && job.state !== "uploading" && !job.panelDismissed ? (
          <DownloadPanel
            error={job.error}
            estimatedTime={estimateProcessingTime(fileMeta.size_bytes, pageCount || 1)}
            jobId={job.jobId}
            onDownload={job.state === "success" ? job.download : undefined}
            onProcessAnother={() => {
              setFile(null);
              setFileMeta(null);
              job.reset();
              syncQuery({ file_id: null, from: searchParams.get("from"), to: searchParams.get("to") });
            }}
            onReedit={job.dismissPanel}
            state={job.state === "failure" ? "failure" : job.state === "success" ? "success" : job.state}
          />
        ) : null
      }
      emptyState={
        <EmptyWorkspaceState
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp,.rtf,.txt,.html,.csv,.jpg,.jpeg,.png,.webp,.avif,.tif,.tiff,.bmp,.svg"
          description="Upload a PDF, Office file, spreadsheet, text file, CSV, HTML file, or image to convert it from one shared workspace."
          onFilesSelected={(files) => {
            void handleFilesSelected(files);
          }}
        />
      }
      estimatedTime={fileMeta ? estimateProcessingTime(fileMeta.size_bytes, pageCount || 1) : undefined}
      fileInfo={uploadedFileSummary(fileMeta)}
      fileName={fileMeta?.original_name}
      hasContent={Boolean(fileMeta)}
      onDownload={job.state === "success" ? job.download : undefined}
      onProcess={handleProcess}
      onReset={() => {
        setFile(null);
        setFileMeta(null);
        job.reset();
        syncQuery({ file_id: null, from: searchParams.get("from"), to: searchParams.get("to") });
      }}
      processButtonDisabled={!fileMeta || outputOptions.length === 0}
      processingLabel={
        uploadState === "uploading"
          ? "Uploading file"
          : uploadState === "failure"
            ? uploadError ?? "Upload failed"
            : job.processingLabel
      }
      rightPanel={
        <div className="space-y-6">
          <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-[13px] font-medium leading-6 text-slate-500">
            {uploadState === "failure"
              ? uploadError ?? "Upload failed."
              : job.state === "failure"
                ? job.error ?? "Conversion failed."
                : outputOptions.length > 0
                  ? `Detected ${inputFormat.toUpperCase()} input. Choose the output format and process the uploaded file.`
                  : "Upload a supported file to see valid conversion targets."}
          </div>
          <WorkspaceControls sections={sections} state={settings} update={update} />
        </div>
      }
      uploadOverlay={
        file && uploadState === "uploading" ? (
          <UploadProgress
            fileLabel="Uploading file"
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
