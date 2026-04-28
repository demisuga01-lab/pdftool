"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Archive, FileCode2, FileText, Image as ImageIcon, Presentation, Table2 } from "lucide-react";

import { DownloadPanel } from "@/components/ui/DownloadPanel";
import { UploadProgress } from "@/components/ui/UploadProgress";
import { EmptyWorkspaceState, ImageWorkspace } from "@/components/workspace/ImageWorkspace";
import type { ControlSection } from "@/components/workspace/Controls";
import { WorkspaceControls } from "@/components/workspace/Controls";
import { UploadedImagePreview, UploadedPdfPreview } from "@/components/workspace/WorkspacePageBuilders";
import { estimateProcessingTime, formatBytes, formatFileType, slugifyBaseName } from "@/lib/format";
import {
  getFileMetadata,
  uploadFileToWorkspace,
  type UploadedFileMetadata,
  type UploadProgressHandler,
} from "@/lib/files";
import { useWorkspaceJob } from "@/lib/workspace-job";
import { uploadedFileDetails, uploadedFileSummary, useObjectState, useUploadedPdfPageItems } from "@/lib/workspace-data";

type CompressionFileType = "auto" | "pdf" | "image" | "office" | "text" | "archive";

type CompressionSettings = {
  archiveLevel: number;
  brotliOutput: boolean;
  compressEmbeddedImages: boolean;
  convertToGrayscale: boolean;
  convertToPdfAndCompress: boolean;
  fileType: CompressionFileType;
  forceRecompress: boolean;
  gzipOutput: boolean;
  imageDpi: 72 | 96 | 150 | 200 | 300;
  imageLossless: boolean;
  imageOutputFormat: "keep" | "jpg" | "png" | "webp" | "avif" | "tiff" | "bmp";
  imagePreserveMetadata: boolean;
  imagePreserveTransparency: boolean;
  keepOriginalFormat: boolean;
  keepOriginalIfSmaller: boolean;
  linearize: boolean;
  minify: boolean;
  mode: "smart" | "lossless" | "balanced" | "maximum" | "custom";
  ocrOptimize: boolean;
  outputSuffix: string;
  packageAs7z: boolean;
  packageAsZip: boolean;
  pdfaOutput: boolean;
  pdfQuality: "screen" | "ebook" | "printer" | "prepress";
  preserveOriginalExtension: boolean;
  quality: number;
  recompressAs7z: boolean;
  recompressAsZip: boolean;
  stripMetadata: boolean;
  zipOutput: boolean;
};

type CompressionResult = {
  original_size?: number;
  output_size?: number;
  saved_bytes?: number;
  saved_percent?: number;
  optimized?: boolean;
  method?: string;
  message?: string;
};

const initialSettings: CompressionSettings = {
  archiveLevel: 9,
  brotliOutput: false,
  compressEmbeddedImages: true,
  convertToGrayscale: false,
  convertToPdfAndCompress: false,
  fileType: "auto",
  forceRecompress: false,
  gzipOutput: false,
  imageDpi: 150,
  imageLossless: false,
  imageOutputFormat: "keep",
  imagePreserveMetadata: false,
  imagePreserveTransparency: true,
  keepOriginalFormat: true,
  keepOriginalIfSmaller: true,
  linearize: true,
  minify: true,
  mode: "smart",
  ocrOptimize: false,
  outputSuffix: "-compressed",
  packageAs7z: false,
  packageAsZip: false,
  pdfaOutput: false,
  pdfQuality: "ebook",
  preserveOriginalExtension: true,
  quality: 82,
  recompressAs7z: false,
  recompressAsZip: true,
  stripMetadata: true,
  zipOutput: true,
};

function detectedFileType(file: UploadedFileMetadata | null, fallback: CompressionFileType): CompressionFileType {
  if (!file) {
    return fallback === "auto" ? "auto" : fallback;
  }
  const extension = file.extension.toLowerCase();
  const mimeType = file.mime_type.toLowerCase();
  if (extension === "pdf" || mimeType === "application/pdf") {
    return "pdf";
  }
  if (["jpg", "jpeg", "png", "webp", "avif", "gif", "tif", "tiff", "bmp", "svg"].includes(extension) || mimeType.startsWith("image/")) {
    return "image";
  }
  if (["docx", "xlsx", "pptx", "odt", "ods", "odp"].includes(extension)) {
    return "office";
  }
  if (["txt", "csv", "json", "html", "htm", "css", "js", "xml"].includes(extension) || mimeType.startsWith("text/")) {
    return "text";
  }
  if (extension === "zip" || mimeType === "application/zip") {
    return "archive";
  }
  return "auto";
}

function fileFromMetadata(metadata: UploadedFileMetadata): File {
  return new File([], metadata.original_name || metadata.filename, {
    type: metadata.mime_type || "application/octet-stream",
  });
}

function downloadName(file: File, settings: CompressionSettings) {
  const base = slugifyBaseName(file.name);
  const sourceExtension = file.name.includes(".") ? file.name.split(".").pop() || "bin" : "bin";
  const imageExtension = settings.imageOutputFormat === "keep" ? sourceExtension : settings.imageOutputFormat;
  const extension =
    settings.fileType === "image"
      ? imageExtension
      : settings.fileType === "text" && settings.brotliOutput
        ? "br"
        : settings.fileType === "text" && settings.gzipOutput
          ? "gz"
          : (settings.fileType === "office" && settings.packageAs7z) || (settings.fileType === "archive" && settings.recompressAs7z)
        ? "7z"
        : (settings.fileType === "office" && settings.packageAsZip) ||
            (settings.fileType === "text" && settings.zipOutput) ||
            (settings.fileType === "archive" && settings.recompressAsZip)
          ? "zip"
          : sourceExtension;
  return `${base}${settings.outputSuffix || "-compressed"}.${extension}`;
}

function resultValue(value: number | undefined, formatter: (value: number) => string = String) {
  return typeof value === "number" ? formatter(value) : "--";
}

function ResultStats({ result }: { result?: CompressionResult }) {
  if (!result) {
    return null;
  }
  return (
    <section className="rounded-xl border border-[#E5E7EB] bg-white p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Result stats</p>
      <div className="mt-4 grid gap-3 text-sm">
        {[
          ["Original size", resultValue(result.original_size, formatBytes)],
          ["Output size", resultValue(result.output_size, formatBytes)],
          ["Saved", resultValue(result.saved_bytes, formatBytes)],
          ["Saved percent", typeof result.saved_percent === "number" ? `${result.saved_percent}%` : "--"],
          ["Optimized", typeof result.optimized === "boolean" ? String(result.optimized) : "--"],
          ["Method", result.method ?? "--"],
        ].map(([label, value]) => (
          <div className="flex items-center justify-between gap-4" key={label}>
            <span className="text-slate-500">{label}</span>
            <span className="text-right font-semibold text-slate-800">{value}</span>
          </div>
        ))}
      </div>
      {result.message ? (
        <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] leading-6 text-slate-600">
          {result.message}
        </p>
      ) : null}
    </section>
  );
}

function InfoPreview({ file, type }: { file: UploadedFileMetadata; type: CompressionFileType }) {
  const Icon =
    type === "office"
      ? file.extension === "xlsx" || file.extension === "ods"
        ? Table2
        : Presentation
      : type === "archive"
        ? Archive
        : type === "text"
          ? FileCode2
          : FileText;
  return (
    <div className="mx-auto max-w-3xl rounded-2xl border border-[#E5E7EB] bg-white p-6">
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#2563EB]">
          <Icon className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-sm font-semibold text-slate-900">{file.original_name}</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {formatFileType(file.mime_type, file.extension)} / {formatBytes(file.size_bytes)}
          </p>
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-800">
            Preview is not available for this file type. Compression will use safe repacking, minification, or ZIP/7z packaging where useful.
          </p>
        </div>
      </div>
    </div>
  );
}

function sectionsFor(type: CompressionFileType): Array<ControlSection<CompressionSettings>> {
  return [
    {
      key: "mode",
      label: "Compression mode",
      fields: [
        {
          key: "mode",
          label: "Mode",
          type: "radioCards",
          options: [
            { label: "Smart Auto", value: "smart", description: "Let PDFTools choose a conservative strategy." },
            { label: "Lossless", value: "lossless", description: "Preserve quality and focus on safe container optimization." },
            { label: "Balanced", value: "balanced", description: "Good size reduction with practical visual quality." },
            { label: "Maximum Compression", value: "maximum", description: "Prioritize smallest output." },
            { label: "Custom", value: "custom", description: "Use the format-specific settings below." },
          ],
        },
      ],
    },
    {
      key: "universal",
      label: "Universal settings",
      fields: [
        { key: "stripMetadata", label: "Strip metadata", type: "toggle" },
        { key: "forceRecompress", label: "Force recompress", type: "toggle" },
        { key: "keepOriginalIfSmaller", label: "Keep original if smaller", type: "toggle" },
        { key: "outputSuffix", label: "Output suffix", type: "text", placeholder: "-compressed" },
      ],
    },
    {
      key: "pdf",
      label: "PDF settings",
      fields: [
        {
          key: "pdfQuality",
          label: "Quality preset",
          type: "select",
          options: [
            { label: "Screen", value: "screen" },
            { label: "Ebook", value: "ebook" },
            { label: "Printer", value: "printer" },
            { label: "Prepress", value: "prepress" },
          ],
          show: () => type === "pdf",
        },
        {
          key: "imageDpi",
          label: "Image downsample DPI",
          type: "select",
          options: [72, 96, 150, 200, 300].map((value) => ({ label: `${value} DPI`, value })),
          show: () => type === "pdf",
        },
        { key: "convertToGrayscale", label: "Convert to grayscale", type: "toggle", show: () => type === "pdf" },
        { key: "ocrOptimize", label: "OCR optimize", type: "toggle", show: () => type === "pdf" },
        { key: "linearize", label: "Linearize / web optimize", type: "toggle", show: () => type === "pdf" },
        { key: "pdfaOutput", label: "PDF/A output", type: "toggle", show: () => type === "pdf" },
      ],
    },
    {
      key: "image",
      label: "Image settings",
      fields: [
        { key: "quality", label: "Quality", type: "slider", min: 1, max: 100, show: () => type === "image" },
        { key: "imageLossless", label: "Lossless where supported", type: "toggle", show: () => type === "image" },
        { key: "imagePreserveTransparency", label: "Preserve transparency", type: "toggle", show: () => type === "image" },
        { key: "imagePreserveMetadata", label: "Preserve metadata", type: "toggle", show: () => type === "image" },
        {
          key: "imageOutputFormat",
          label: "Output format",
          type: "select",
          options: [
            { label: "Keep original", value: "keep" },
            { label: "JPG", value: "jpg" },
            { label: "PNG", value: "png" },
            { label: "WebP", value: "webp" },
            { label: "AVIF", value: "avif" },
            { label: "TIFF", value: "tiff" },
            { label: "BMP", value: "bmp" },
          ],
          show: () => type === "image",
        },
      ],
    },
    {
      key: "office",
      label: "Office settings",
      fields: [
        { key: "compressEmbeddedImages", label: "Compress embedded images", type: "toggle", show: () => type === "office" },
        { key: "convertToPdfAndCompress", label: "Convert to PDF and compress", type: "toggle", show: () => type === "office" },
        { key: "packageAsZip", label: "Package as ZIP", type: "toggle", show: () => type === "office" },
        { key: "packageAs7z", label: "Package as 7z", type: "toggle", show: () => type === "office" },
        { key: "keepOriginalFormat", label: "Keep original format when possible", type: "toggle", show: () => type === "office" },
      ],
    },
    {
      key: "text",
      label: "Text / code / data settings",
      fields: [
        { key: "minify", label: "Minify where possible", type: "toggle", show: () => type === "text" },
        { key: "gzipOutput", label: "Gzip output", type: "toggle", show: () => type === "text" },
        { key: "brotliOutput", label: "Brotli output if available", type: "toggle", show: () => type === "text" },
        { key: "zipOutput", label: "ZIP / 7z output", type: "toggle", show: () => type === "text" },
        { key: "preserveOriginalExtension", label: "Preserve original extension", type: "toggle", show: () => type === "text" },
      ],
    },
    {
      key: "archive",
      label: "Archive settings",
      fields: [
        { key: "recompressAsZip", label: "Recompress as ZIP", type: "toggle", show: () => type === "archive" },
        { key: "recompressAs7z", label: "Recompress as 7z", type: "toggle", show: () => type === "archive" },
        { key: "archiveLevel", label: "Compression level", type: "slider", min: 1, max: 9, show: () => type === "archive" },
      ],
    },
  ];
}

function toBackendSettings(settings: CompressionSettings, fileType: CompressionFileType) {
  return {
    archive_level: settings.archiveLevel,
    brotli_output: settings.brotliOutput,
    compress_embedded_images: settings.compressEmbeddedImages,
    convert_to_grayscale: settings.convertToGrayscale,
    convert_to_pdf_and_compress: settings.convertToPdfAndCompress,
    force_recompress: settings.forceRecompress,
    gzip_output: settings.gzipOutput,
    image_dpi: settings.imageDpi,
    keep_original_format: settings.keepOriginalFormat,
    keep_original_if_smaller: settings.keepOriginalIfSmaller,
    linearize: settings.linearize,
    lossless: settings.imageLossless,
    minify: settings.minify,
    ocr_optimize: settings.ocrOptimize,
    output_format: settings.imageOutputFormat,
    output_suffix: settings.outputSuffix || "-compressed",
    package_as_7z: settings.packageAs7z,
    package_as_zip: settings.packageAsZip,
    pdf_quality: settings.pdfQuality,
    pdfa_output: settings.pdfaOutput,
    preserve_metadata: settings.imagePreserveMetadata,
    preserve_original_extension: settings.preserveOriginalExtension,
    preserve_transparency: settings.imagePreserveTransparency,
    quality: settings.quality,
    recompress_as_7z: settings.recompressAs7z,
    recompress_as_zip: settings.recompressAsZip,
    seven_zip_output: settings.zipOutput,
    strip_metadata: settings.stripMetadata && !settings.imagePreserveMetadata,
    type: fileType === "auto" ? undefined : fileType,
    zip_output: settings.zipOutput,
  };
}

export default function CompressPage() {
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
  const { merge, state: settings, update } = useObjectState(initialSettings);
  const rawQueryType = searchParams.get("type");
  const queryType: CompressionFileType =
    rawQueryType && ["pdf", "image", "office", "text", "archive"].includes(rawQueryType)
      ? (rawQueryType as CompressionFileType)
      : "auto";
  const activeType = detectedFileType(fileMeta, settings.fileType === "auto" ? queryType : settings.fileType);
  const initialPageCount = Number(fileMeta?.metadata?.page_count ?? fileMeta?.pages ?? 0);
  const pdfPreview = useUploadedPdfPageItems(activeType === "pdf" ? fileMeta?.file_id ?? null : null, initialPageCount);
  const currentFile = file ?? (fileMeta ? fileFromMetadata(fileMeta) : null);
  const job = useWorkspaceJob({
    filename: currentFile ? downloadName(currentFile, { ...settings, fileType: activeType }) : "compressed-output",
    prefix: "compress",
  });
  const result = job.result?.result as CompressionResult | undefined;
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

  useEffect(() => {
    setQueryString(window.location.search.replace(/^\?/, ""));
  }, [pathname]);

  useEffect(() => {
    const type = searchParams.get("type");
    if (type && ["pdf", "image", "office", "text", "archive"].includes(type)) {
      merge({ fileType: type as CompressionFileType });
    }
  }, [searchParams]);

  const syncFileQuery = useCallback(
    (fileId: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (fileId) {
        params.set("file_id", fileId);
      } else {
        params.delete("file_id");
      }
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
        syncFileQuery(metadata.file_id);
      } catch (caughtError) {
        if (controller.signal.aborted) {
          return;
        }
        setUploadState("failure");
        setUploadError(caughtError instanceof Error ? caughtError.message : "Upload failed");
      }
    },
    [job, syncFileQuery],
  );

  useEffect(() => {
    const queryFileId = searchParams.get("file_id");
    if (!queryFileId || fileMeta?.file_id === queryFileId) {
      return;
    }
    let cancelled = false;
    getFileMetadata(queryFileId)
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

  const handleCompress = () => {
    if (!fileMeta || !currentFile) {
      return;
    }
    const formData = new FormData();
    formData.append("file_id", fileMeta.file_id);
    formData.append("mode", settings.mode);
    formData.append("type", activeType === "auto" ? "" : activeType);
    formData.append("settings", JSON.stringify(toBackendSettings(settings, activeType)));
    job.process("compress", formData);
  };

  const centerContent = fileMeta ? (
    <div className="space-y-5">
      {activeType === "pdf" ? (
        <UploadedPdfPreview fileId={fileMeta.file_id} items={pdfPreview.items} pageCount={pdfPreview.pageCount || 1} />
      ) : activeType === "image" ? (
        <UploadedImagePreview alt={fileMeta.original_name} src={fileMeta.preview_url} />
      ) : (
        <InfoPreview file={fileMeta} type={activeType} />
      )}
      <ResultStats result={result} />
    </div>
  ) : null;

  return (
    <ImageWorkspace
      breadcrumbTitle="Compress"
      centerContent={centerContent}
      countLabel={activeType === "pdf" && pdfPreview.pageCount > 0 ? `${pdfPreview.pageCount} pages` : activeType === "auto" ? "File" : formatFileType(activeType, activeType)}
      description="Compress PDFs, images, Office files, text files, and archives from one workspace."
      downloadPanel={
        fileMeta && job.state !== "idle" && job.state !== "uploading" && !job.panelDismissed ? (
          <DownloadPanel
            error={job.error}
            estimatedTime={estimateProcessingTime(fileMeta.size_bytes, 1)}
            jobId={job.jobId}
            onDownload={job.state === "success" ? job.download : undefined}
            onProcessAnother={() => {
              setFile(null);
              setFileMeta(null);
              job.reset();
              syncFileQuery(null);
            }}
            onReedit={job.dismissPanel}
            state={job.state === "failure" ? "failure" : job.state === "success" ? "success" : job.state}
          />
        ) : null
      }
      emptyState={
        <EmptyWorkspaceState
          accept=".pdf,image/*,.docx,.xlsx,.pptx,.odt,.ods,.odp,.txt,.csv,.json,.html,.htm,.css,.js,.xml,.svg,.zip"
          description="Upload a PDF, image, Office document, text/code/data file, or ZIP archive."
          onFilesSelected={(files) => {
            void handleFilesSelected(files);
          }}
        />
      }
      estimatedTime={fileMeta ? estimateProcessingTime(fileMeta.size_bytes, 1) : undefined}
      fileInfo={uploadedFileSummary(fileMeta, pdfPreview.error ?? undefined)}
      fileName={fileMeta?.original_name ?? file?.name}
      hasContent={Boolean(fileMeta)}
      infoContent={infoContent}
      onDownload={job.state === "success" ? job.download : undefined}
      onProcess={handleCompress}
      onReset={() => {
        setFile(null);
        setFileMeta(null);
        job.reset();
        syncFileQuery(null);
      }}
      processButtonDisabled={!fileMeta}
      processButtonLabel="Compress"
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
                ? job.error ?? "Compression failed."
                : job.state === "success"
                  ? "Result is ready to download."
                  : fileMeta
                    ? `Detected: ${activeType === "auto" ? "file" : activeType}`
                    : "Upload a file to start configuring compression."}
          </div>
          <WorkspaceControls sections={sectionsFor(activeType)} state={{ ...settings, fileType: activeType }} update={update} />
          <ResultStats result={result} />
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
