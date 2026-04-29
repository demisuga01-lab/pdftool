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
import { imageSummary, uploadedFileDetails, uploadedFileSummary, useObjectState, useUploadedPdfPageItems } from "@/lib/workspace-data";

type ConvertKind = "pdf" | "office" | "spreadsheet" | "text" | "csv" | "image" | "svg" | "unknown";

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
  if (format === "image") {
    return "image";
  }
  if (format === "office") {
    return "office";
  }
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
  if (["xls", "xlsx", "ods"].includes(format)) {
    return "spreadsheet";
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
    case "spreadsheet":
      return [
        { label: "PDF", value: "pdf", description: "Spreadsheet to PDF" },
        { label: "CSV", value: "csv", description: "Spreadsheet to CSV" },
      ];
    case "csv":
      return [
        { label: "PDF", value: "pdf", description: "CSV to PDF" },
        { label: "XLSX", value: "xlsx", description: "CSV to Excel workbook" },
      ];
    case "text":
      return [
        { label: "PDF", value: "pdf", description: "Document to PDF" },
        { label: "TXT", value: "txt", description: "Plain text output" },
        { label: "HTML", value: "html", description: "HTML output where meaningful" },
        { label: "ZIP", value: "zip", description: "Package as ZIP fallback" },
      ];
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
    toFormat: "",
    transparent: false,
  });
  const [selectedOutput, setSelectedOutput] = useState<string>(() =>
    typeof window === "undefined" ? "" : normalizeFormat(new URLSearchParams(window.location.search).get("to")),
  );
  const inputFormat = normalizeFormat(fileMeta?.extension || searchParams.get("from"));
  const inputKind = detectKind(inputFormat);
  const outputOptions = useMemo(() => optionsForKind(inputKind), [inputKind]);
  const outputOptionsKey = useMemo(
    () => outputOptions.map((option) => option.value).join("|"),
    [outputOptions],
  );
  const queryTo = normalizeFormat(searchParams.get("to"));
  const outputFormat = selectedOutput;
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
  const infoContent = useMemo(() => {
    const details = uploadedFileDetails(fileMeta);
    if (details.length === 0) {
      return null;
    }
    return (
      <div className="space-y-3">
        {details.map((detail) => (
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0" key={detail.label}>
            <span className="text-slate-500">{detail.label}</span>
            <span className="max-w-[60%] text-right font-medium text-slate-900">{detail.value}</span>
          </div>
        ))}
      </div>
    );
  }, [fileMeta]);

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
    const outputValues = outputOptionsKey ? outputOptionsKey.split("|") : [];
    if (!outputValues.length) {
      return;
    }

    setSelectedOutput((current) => {
      if (current && outputValues.includes(current)) {
        return current;
      }

      if (queryTo && outputValues.includes(queryTo)) {
        return queryTo;
      }

      return outputValues[0];
    });
  }, [outputOptionsKey, queryTo]);

  useEffect(() => {
    if (settings.toFormat !== selectedOutput) {
      update("toFormat", selectedOutput);
    }
  }, [selectedOutput, settings.toFormat, update]);

  const selectOutput = useCallback(
    (value: string) => {
      setSelectedOutput(value);
      update("toFormat", value);
      syncQuery({ file_id: fileMeta?.file_id ?? searchParams.get("file_id"), from: inputFormat || searchParams.get("from"), to: value });
    },
    [fileMeta?.file_id, inputFormat, searchParams, syncQuery, update],
  );

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
        syncQuery({ file_id: metadata.file_id, from: normalizeFormat(metadata.extension), to: selectedOutput || null });
      } catch (caughtError) {
        if (controller.signal.aborted) {
          return;
        }
        setUploadState("failure");
        setUploadError(caughtError instanceof Error ? caughtError.message : "Upload failed");
      }
    },
    [job, selectedOutput, syncQuery],
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
    if (!fileMeta || !selectedOutput) {
      return;
    }

    const formData = new FormData();
    formData.append("file_id", fileMeta.file_id);
    formData.append("from_format", inputFormat);
    formData.append("to_format", selectedOutput);
    formData.append("output_filename", settings.outputFilename.trim());
    formData.append(
      "settings",
      JSON.stringify({
        dpi: settings.dpi,
        output_filename: settings.outputFilename.trim(),
        preserve_metadata: settings.preserveMetadata,
        quality: settings.quality,
        transparent: settings.transparent,
      }),
    );
    syncQuery({ file_id: fileMeta.file_id, from: inputFormat, to: selectedOutput });
    job.process("convert", formData);
  };

  const sections: Array<ControlSection<ConvertSettings>> = useMemo(
    () => [
      {
        key: "output",
        label: "Output",
        render: () => (
          <div className="grid gap-2">
            {outputOptions.map((option) => {
              const active = selectedOutput === option.value;
              return (
                <button
                  aria-pressed={active}
                  className={[
                    "relative rounded-lg border px-3 py-3 text-left transition",
                    active
                      ? "border-[#2563EB] bg-[#2563EB]/[0.06] ring-2 ring-[#2563EB]/15"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                  ].join(" ")}
                  key={option.value}
                  onClick={() => selectOutput(option.value)}
                  type="button"
                >
                  <span className={["block text-[15px] font-semibold", active ? "text-[#2563EB]" : "text-slate-900"].join(" ")}>
                    {option.label}
                  </span>
                  <span className="mt-1 block text-sm font-medium text-slate-500">{option.description}</span>
                  {active ? (
                    <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-[#2563EB] text-[11px] font-bold text-white">
                      ✓
                    </span>
                  ) : null}
                </button>
              );
            })}
            {process.env.NODE_ENV !== "production" ? (
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">
                Selected output: {selectedOutput || "(none)"}
              </p>
            ) : null}
          </div>
        ),
        fields: [
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
            show: () => inputKind === "pdf" && selectedOutput === "png",
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
    [inputKind, outputOptions, selectOutput, selectedOutput],
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
      <div className="mx-auto max-w-3xl rounded-2xl border border-[#E5E7EB] bg-white p-6">
        <div className="flex items-start gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#2563EB] text-sm font-bold">
            {(fileMeta.extension || "?").toUpperCase().slice(0, 4)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-mono text-sm font-semibold text-slate-900">{fileMeta.original_name}</p>
            <p className="mt-1 text-sm text-slate-500">
              Uploaded and ready to convert. No preview for this file type.
            </p>
          </div>
        </div>
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
            : inputFormat
              ? inputFormat.replace(/load$/i, "").replace(/save$/i, "").toUpperCase()
              : undefined
      }
      description="Convert PDF, Office files, spreadsheets, text, HTML, CSV, and images."
      processButtonLabel="Convert"
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
      infoContent={infoContent}
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
          <div
            className={[
              "rounded-xl border px-4 py-3 text-[13px] leading-6",
              uploadState === "failure" || job.state === "failure"
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : job.state === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-[#E5E7EB] bg-[#F9FAFB] text-slate-500",
            ].join(" ")}
          >
            {uploadState === "failure"
              ? uploadError ?? "Upload failed."
              : job.state === "failure"
                ? job.error ?? "Conversion failed."
                : job.state === "success"
                  ? "Result is ready to download."
                  : outputOptions.length > 0
                    ? "Choose an output format below and click Convert."
                    : "Upload a file to see available conversion formats."}
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
