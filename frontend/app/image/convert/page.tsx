"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { DownloadPanel } from "@/components/ui/DownloadPanel";
import { UploadProgress } from "@/components/ui/UploadProgress";
import { EmptyWorkspaceState, ImageWorkspace } from "@/components/workspace/ImageWorkspace";
import { WorkspaceControls, type ControlSection } from "@/components/workspace/Controls";
import { getFileMetadata, uploadFileToWorkspace, type UploadedFileMetadata, type UploadProgressHandler } from "@/lib/files";
import { estimateProcessingTime, slugifyBaseName } from "@/lib/format";
import { useWorkspaceJob } from "@/lib/workspace-job";
import { imageSummary, useObjectState, useSingleImagePreview } from "@/lib/workspace-data";

type ConvertTab = "format" | "svg";

type ConvertSettings = {
  addFormatSuffix: boolean;
  format: "auto" | "jpeg" | "png" | "webp" | "avif" | "tiff" | "bmp";
  outputFilename: string;
  pngCompression: number;
  quality: number;
  svgFormat: "png" | "pdf" | "eps";
};

const formatSections: Array<ControlSection<ConvertSettings>> = [
  {
    key: "format",
    label: "Format Convert",
    fields: [
      {
        key: "format",
        label: "Output format",
        type: "radioCards",
        options: [
          { label: "Auto", description: "Keep the original file format", value: "auto" },
          { label: "JPEG", description: "Best for photos", value: "jpeg" },
          { label: "PNG", description: "Lossless with transparency", value: "png" },
          { label: "WebP", description: "Modern compressed format", value: "webp" },
          { label: "AVIF", description: "Efficient next-gen image format", value: "avif" },
          { label: "TIFF", description: "High-quality archival output", value: "tiff" },
          { label: "BMP", description: "Uncompressed bitmap output", value: "bmp" },
        ],
      },
      { key: "quality", label: "Quality", type: "slider", min: 1, max: 100, show: (state) => !["png", "bmp", "tiff", "auto"].includes(state.format) },
      { key: "pngCompression", label: "PNG compression", type: "slider", min: 0, max: 9, show: (state) => state.format === "png" },
      { key: "outputFilename", label: "Output filename", type: "text", placeholder: "converted-image" },
      { key: "addFormatSuffix", label: "Add -converted suffix", type: "toggle" },
    ],
  },
];

const svgSections: Array<ControlSection<ConvertSettings>> = [
  {
    key: "svg",
    label: "SVG Export",
    fields: [
      {
        key: "svgFormat",
        label: "Output format",
        type: "radioCards",
        options: [
          { label: "PNG", description: "Raster image output", value: "png" },
          { label: "PDF", description: "Printable document output", value: "pdf" },
          { label: "EPS", description: "Encapsulated PostScript output", value: "eps" },
        ],
      },
      { key: "outputFilename", label: "Output filename", type: "text", placeholder: "converted-svg" },
      { key: "addFormatSuffix", label: "Add -converted suffix", type: "toggle" },
    ],
  },
];

function extensionForTab(tab: ConvertTab, settings: ConvertSettings, file: File | null) {
  if (tab === "svg") {
    return settings.svgFormat;
  }
  if (settings.format === "auto") {
    return file?.name.split(".").pop()?.toLowerCase() || "png";
  }
  return settings.format === "jpeg" ? "jpg" : settings.format;
}

export default function ImageConvertPage() {
  const pathname = usePathname();
  const router = useRouter();
  const [queryString, setQueryString] = useState("");
  const searchParams = useMemo(() => new URLSearchParams(queryString), [queryString]);
  const uploadAbortRef = useRef<AbortController | null>(null);
  const [activeTab, setActiveTab] = useState<ConvertTab>("format");
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
    addFormatSuffix: true,
    format: "auto",
    outputFilename: "",
    pngCompression: 6,
    quality: 85,
    svgFormat: "png",
  });
  const localPreview = useSingleImagePreview(file);
  const currentFile = file ?? (fileMeta ? new File([], fileMeta.original_name, { type: fileMeta.mime_type }) : null);
  const preview = localPreview ?? (
    fileMeta && currentFile
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
  const extension = extensionForTab(activeTab, settings, currentFile);
  const job = useWorkspaceJob({
    filename: currentFile ? `${settings.outputFilename.trim() || slugifyBaseName(currentFile.name)}${settings.addFormatSuffix ? "-converted" : ""}.${extension}` : `converted.${extension}`,
    prefix: "image",
  });

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
      setUploadPercent(0);
      setUploadSpeedKBs(0);
      setUploadRemainingSecs(0);
      setUploadedBytes(0);
      setUploadTotalBytes(nextFile.size);
      job.reset();

      try {
        const metadata = await uploadFileToWorkspace(nextFile, handleUploadProgress, controller.signal);
        setFileMeta(metadata);
        setActiveTab(metadata.extension.toLowerCase() === "svg" ? "svg" : "format");
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

  const handleProcess = () => {
    if (!fileMeta || !currentFile) {
      return;
    }

    const outputBase = settings.outputFilename.trim() || slugifyBaseName(currentFile.name);
    const outputFilename = `${outputBase}${settings.addFormatSuffix ? "-converted" : ""}.${extension}`;
    const formData = new FormData();
    formData.append("file_id", fileMeta.file_id);
    formData.append("format", activeTab === "svg" ? settings.svgFormat : settings.format);
    formData.append("quality", String(settings.quality));
    formData.append("png_compression", String(settings.pngCompression));
    formData.append("output_filename", outputFilename);
    job.process("image/convert", formData);
  };

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
          setActiveTab(metadata.extension.toLowerCase() === "svg" ? "svg" : "format");
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

  return (
    <ImageWorkspace
      breadcrumbTitle="Image Converter"
      centerContent={
        fileMeta ? (
          <div className="space-y-5">
            <div className="rounded-2xl border border-[#E5E7EB] bg-white p-2">
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  { id: "format" as const, label: "Format Convert", description: "JPG, PNG, WebP, AVIF, TIFF, BMP" },
                  { id: "svg" as const, label: "SVG to Image", description: "Export SVG as PNG, PDF, or EPS" },
                ].map((tab) => (
                  <button
                    className={[
                      "rounded-xl px-4 py-3 text-left transition",
                      activeTab === tab.id ? "bg-[#EFF6FF] text-[#2563EB]" : "bg-white text-slate-600 hover:bg-slate-50",
                    ].join(" ")}
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                    }}
                    type="button"
                  >
                    <p className="text-sm font-bold">{tab.label}</p>
                    <p className="mt-1 text-sm font-medium text-slate-500">{tab.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="mx-auto max-w-5xl rounded-2xl border border-[#E5E7EB] bg-white p-4 sm:p-6">
              <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4 sm:min-h-[520px] sm:p-8">
                {preview ? (
                  <img
                    alt={fileMeta.original_name}
                    className="max-h-[460px] max-w-full rounded-xl border border-[#E5E7EB] bg-white object-contain"
                    src={preview.dataUrl}
                  />
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-8 py-10 text-center">
                    <p className="text-sm font-semibold text-[#2563EB]">SVG conversion</p>
                    <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                      Upload an SVG file to export PNG, PDF, or EPS output.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null
      }
      countLabel={preview && preview.width > 0 && preview.height > 0 ? `${preview.width} x ${preview.height} px` : activeTab === "svg" ? "SVG document" : undefined}
      description="Convert raster images between common formats or export SVG artwork to PNG, PDF, or EPS."
      downloadPanel={
        job.state !== "idle" && job.state !== "uploading" && !job.panelDismissed ? (
          <DownloadPanel
            error={job.error}
            estimatedTime={fileMeta ? estimateProcessingTime(fileMeta.size_bytes, 1) : undefined}
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
          accept="image/*,.jpg,.jpeg,.png,.webp,.avif,.tiff,.tif,.bmp,.svg"
          description={activeTab === "svg" ? "Upload an SVG to export PNG, PDF, or EPS files." : "Upload an image to convert it into another format."}
          onFilesSelected={(files) => {
            void handleFilesSelected(files);
          }}
        />
      }
      estimatedTime={fileMeta ? estimateProcessingTime(fileMeta.size_bytes, 1) : undefined}
      fileInfo={imageSummary(preview)}
      fileName={fileMeta?.original_name ?? file?.name}
      hasContent={Boolean(fileMeta)}
      onDownload={job.state === "success" ? job.download : undefined}
      onProcess={handleProcess}
      onReset={() => {
        setFile(null);
        setFileMeta(null);
        job.reset();
        syncFileQuery(null);
      }}
      processButtonDisabled={!fileMeta}
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
                ? job.error ?? "Image conversion failed."
              : activeTab === "svg"
                ? "SVG exports are generated through the same converter endpoint with document-ready output formats."
                : "Choose the output format and filename before exporting."}
          </div>
          <WorkspaceControls
            sections={activeTab === "svg" ? svgSections : formatSections}
            state={settings}
            update={update}
          />
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
