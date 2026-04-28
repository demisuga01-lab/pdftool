"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { DocumentIcon } from "@/components/icons/SiteIcons";
import { DownloadPanel } from "@/components/ui/DownloadPanel";
import { UploadProgress } from "@/components/ui/UploadProgress";
import { WorkspaceControls, type ControlSection } from "@/components/workspace/Controls";
import {
  EmptyPdfWorkspaceState,
  PDFThumbnailGrid,
  PDFWorkspace,
  type WorkspaceThumbnailSize,
} from "@/components/workspace/PDFWorkspace";
import { downloadFile, pollJobStatus, toApiPath, type JobStatus } from "@/lib/api";
import { getFileMetadata, getPdfPagePreviewUrl } from "@/lib/files";
import { estimateProcessingTime, formatBytes, slugifyBaseName } from "@/lib/format";
import { uploadWithProgress } from "@/lib/upload";
import { selectedPagesLabel, useObjectState, usePageSelection, useUploadedPdfPageItems } from "@/lib/workspace-data";

type ConvertTab = "word" | "excel" | "images" | "html" | "text" | "office";
type UploadState = "idle" | "uploading" | "ready" | "failure";
type ProcessState = "idle" | "queued" | "processing" | "success" | "failure";

type UploadedFileMeta = {
  fileId: string;
  filename: string;
  pages: number;
  size: number;
};

type ConvertSettings = {
  dpi: number;
  imageFormat: "png" | "jpeg" | "webp";
  imageQuality: number;
  outputFilename: string;
  textFormat: "txt" | "html" | "json";
  textLayout: boolean;
  transparent: boolean;
};

const tabs: Array<{ description: string; id: ConvertTab; label: string }> = [
  { id: "word", label: "PDF to Word", description: "Create a DOCX file from PDF text." },
  { id: "excel", label: "PDF to Excel", description: "Send extracted rows and columns into XLSX." },
  { id: "images", label: "PDF to Images", description: "Render every page as PNG, JPG, or WebP." },
  { id: "html", label: "PDF to HTML", description: "Export PDF content as an HTML file." },
  { id: "text", label: "PDF to Text", description: "Download plain text, HOCR, or JSON." },
  { id: "office", label: "Office to PDF", description: "Convert Word, Excel, or PowerPoint documents into PDF." },
];

const sharedImageFields: Array<ControlSection<ConvertSettings>> = [
  {
    key: "images",
    label: "Image Export",
    fields: [
      {
        key: "imageFormat",
        label: "Image format",
        type: "radioCards",
        options: [
          { label: "PNG", description: "Lossless image output", value: "png" },
          { label: "JPEG", description: "Smaller files for photos", value: "jpeg" },
          { label: "WebP", description: "Modern compressed output", value: "webp" },
        ],
      },
      { key: "dpi", label: "DPI", type: "slider", min: 72, max: 600, valueSuffix: " DPI" },
      { key: "imageQuality", label: "Quality", type: "slider", min: 1, max: 100, show: (state) => state.imageFormat !== "png" },
      { key: "transparent", label: "Transparent background", type: "toggle", show: (state) => state.imageFormat === "png" },
      { key: "outputFilename", label: "Output filename", type: "text", placeholder: "pdf-images" },
    ],
  },
];

const sharedTextFields: Array<ControlSection<ConvertSettings>> = [
  {
    key: "text",
    label: "Text Export",
    fields: [
      {
        key: "textFormat",
        label: "Output format",
        type: "radioCards",
        options: [
          { label: "TXT", description: "Plain text file", value: "txt" },
          { label: "HTML", description: "HTML text output", value: "html" },
          { label: "JSON", description: "Structured JSON output", value: "json" },
        ],
      },
      { key: "textLayout", label: "Preserve layout", type: "toggle" },
      { key: "outputFilename", label: "Output filename", type: "text", placeholder: "pdf-text" },
    ],
  },
];

const officeFormats = [".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".odt", ".ods", ".odp", ".rtf", ".txt"];

function outputExtension(tab: ConvertTab, settings: ConvertSettings) {
  if (tab === "word") {
    return "docx";
  }
  if (tab === "excel") {
    return "xlsx";
  }
  if (tab === "images") {
    return "zip";
  }
  if (tab === "html") {
    return "html";
  }
  if (tab === "office") {
    return "pdf";
  }
  return settings.textFormat;
}

function storageKey(fileId: string) {
  return `pdf-convert:${fileId}`;
}

export default function PdfConvertPage() {
  const pathname = usePathname();
  const router = useRouter();
  const [queryString, setQueryString] = useState("");
  const searchParams = useMemo(() => new URLSearchParams(queryString), [queryString]);
  const abortRef = useRef<AbortController | null>(null);
  const [activeTab, setActiveTab] = useState<ConvertTab>((searchParams.get("tab") as ConvertTab) || "word");
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [fileMeta, setFileMeta] = useState<UploadedFileMeta | null>(null);
  const [size, setSize] = useState<WorkspaceThumbnailSize>("medium");
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [uploadPercent, setUploadPercent] = useState(0);
  const [uploadSpeedKBs, setUploadSpeedKBs] = useState(0);
  const [uploadRemainingSecs, setUploadRemainingSecs] = useState(0);
  const [jobState, setJobState] = useState<ProcessState>("idle");
  const [jobId, setJobId] = useState<string | null>(searchParams.get("job_id"));
  const [jobResult, setJobResult] = useState<JobStatus | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);
  const [panelDismissed, setPanelDismissed] = useState(false);
  const [previewPage, setPreviewPage] = useState(1);
  const [previewZoom, setPreviewZoom] = useState(100);
  const { state: settings, update } = useObjectState<ConvertSettings>({
    dpi: 150,
    imageFormat: "png",
    imageQuality: 85,
    outputFilename: "",
    textFormat: "txt",
    textLayout: true,
    transparent: false,
  });

  const { items, pageCount, setItems } = useUploadedPdfPageItems(
    fileMeta && activeTab !== "office" ? fileMeta.fileId : null,
    fileMeta?.pages ?? 0,
  );
  const { allSelected, deselectAll, selectAll, toggleItem } = usePageSelection(items, setItems);
  const currentTab = tabs.find((tab) => tab.id === activeTab)!;
  const downloadName = useMemo(() => {
    const extension = outputExtension(activeTab, settings);
    const base = settings.outputFilename.trim() || slugifyBaseName(fileMeta?.filename || "converted-file");
    return `${base}.${extension}`;
  }, [activeTab, fileMeta?.filename, settings]);

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

  const startPolling = useCallback(async (nextJobId: string, controller: AbortController) => {
    const finalStatus = await pollJobStatus("pdf", nextJobId, controller.signal, (status) => {
      if (status.status === "queued" || status.status === "processing") {
        setJobState(status.status);
      }
    });
    setJobResult(finalStatus);
    setJobState(finalStatus.status);
    setJobError(finalStatus.error ?? null);
    return finalStatus;
  }, []);

  useEffect(() => {
    setQueryString(window.location.search.replace(/^\?/, ""));
  }, [pathname]);

  const handleFileSelected = useCallback(
    async (file: File | null) => {
      if (!file) {
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLocalFile(file);
      setFileMeta(null);
      setUploadState("uploading");
      setUploadPercent(0);
      setUploadSpeedKBs(0);
      setUploadRemainingSecs(0);
      setJobId(null);
      setJobState("idle");
      setJobResult(null);
      setJobError(null);
      setPanelDismissed(false);

      const formData = new FormData();
      formData.append("file", file);

      try {
        const response = await uploadWithProgress(
          "files/upload",
          formData,
          (percent, speedKBs, remainingSecs) => {
            setUploadPercent(percent);
            setUploadSpeedKBs(speedKBs);
            setUploadRemainingSecs(remainingSecs);
          },
          controller.signal,
        ) as {
          detail?: string;
          file_id?: string;
          filename?: string;
          original_name?: string;
          pages?: number;
          size?: number;
          size_bytes?: number;
          metadata?: Record<string, unknown>;
        };
        if (!response.file_id) {
          throw new Error(response.detail || "Upload failed");
        }
        const nextMeta: UploadedFileMeta = {
          fileId: response.file_id,
          filename: response.original_name || response.filename || file.name,
          pages: Number(response.metadata?.page_count ?? response.pages ?? 0),
          size: response.size_bytes || response.size || file.size,
        };
        setFileMeta(nextMeta);
        setUploadState("ready");
        window.sessionStorage.setItem(storageKey(nextMeta.fileId), JSON.stringify(nextMeta));
        syncQuery({ file_id: nextMeta.fileId, job_id: null, tab: activeTab });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        setUploadState("failure");
        setJobError(error instanceof Error ? error.message : "Upload failed");
      }
    },
    [activeTab, syncQuery],
  );

  const cancelUpload = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setUploadState("idle");
    setUploadPercent(0);
    setUploadSpeedKBs(0);
    setUploadRemainingSecs(0);
  }, []);

  const handleProcess = useCallback(async () => {
    if (!fileMeta) {
      return;
    }

    setPanelDismissed(false);
    setJobError(null);
    setJobResult(null);
    setJobState("queued");

    const payload =
      activeTab === "images"
        ? {
            conversion_type: "to-images",
            dpi: settings.dpi,
            file_id: fileMeta.fileId,
            format: settings.imageFormat,
            jpeg_quality: settings.imageQuality,
            transparent: settings.transparent,
          }
        : activeTab === "word"
          ? { conversion_type: "to-word", file_id: fileMeta.fileId }
          : activeTab === "excel"
            ? { conversion_type: "to-excel", file_id: fileMeta.fileId }
            : activeTab === "html"
              ? { conversion_type: "to-html", file_id: fileMeta.fileId }
              : activeTab === "office"
                ? { conversion_type: "office-to-pdf", file_id: fileMeta.fileId }
                : {
                    conversion_type: "to-text",
                    file_id: fileMeta.fileId,
                    layout: settings.textLayout,
                    output_format: settings.textFormat,
                  };

    try {
      const response = await fetch(toApiPath("pdf/convert-from-id"), {
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const data = (await response.json()) as { detail?: string; error?: string; job_id?: string };
      if (!response.ok || !data.job_id) {
        throw new Error(data.detail || data.error || "Unable to start conversion");
      }

      const nextJobId = data.job_id;
      setJobId(nextJobId);
      syncQuery({ file_id: fileMeta.fileId, job_id: nextJobId, tab: activeTab });
      const controller = new AbortController();
      abortRef.current = controller;
      await startPolling(nextJobId, controller);
    } catch (error) {
      setJobState("failure");
      setJobError(error instanceof Error ? error.message : "Unable to start conversion");
    }
  }, [activeTab, fileMeta, settings, startPolling, syncQuery]);

  useEffect(() => {
    const nextTab = (searchParams.get("tab") as ConvertTab) || "word";
    if (nextTab !== activeTab) {
      setActiveTab(nextTab);
    }
  }, [activeTab, searchParams]);

  useEffect(() => {
    const queryJobId = searchParams.get("job_id");
    if (queryJobId && !jobId) {
      setJobId(queryJobId);
    }
  }, [jobId, searchParams]);

  useEffect(() => {
    const fileId = searchParams.get("file_id");
    if (!fileId || fileMeta) {
      return;
    }

    const stored = window.sessionStorage.getItem(storageKey(fileId));
    if (stored) {
      const metadata = JSON.parse(stored) as UploadedFileMeta;
      setFileMeta(metadata);
      setUploadState("ready");
      return;
    }

    let cancelled = false;
    getFileMetadata(fileId)
      .then((metadata) => {
        if (cancelled) {
          return;
        }
        setFileMeta({
          fileId: metadata.file_id,
          filename: metadata.original_name,
          pages: Number(metadata.metadata?.page_count ?? metadata.pages ?? 0),
          size: metadata.size_bytes,
        });
        setUploadState("ready");
      })
      .catch((caughtError: unknown) => {
        if (!cancelled) {
          setUploadState("failure");
          setJobError(caughtError instanceof Error ? caughtError.message : "Uploaded file could not be loaded.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [fileMeta, searchParams]);

  useEffect(() => {
    if (!jobId || jobResult) {
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setJobState("queued");
    startPolling(jobId, controller).catch((error) => {
      if (controller.signal.aborted) {
        return;
      }
      setJobState("failure");
      setJobError(error instanceof Error ? error.message : "Unable to resume job");
    });

    return () => controller.abort();
  }, [jobId, jobResult, startPolling]);

  const rightPanelSections: Array<ControlSection<ConvertSettings>> =
    activeTab === "images"
      ? sharedImageFields
      : activeTab === "text"
        ? sharedTextFields
        : [
            {
              key: "output",
              label: "Output",
              fields: [{ key: "outputFilename", label: "Output filename", type: "text", placeholder: "converted-file" }],
            },
          ];

  return (
    <PDFWorkspace
      breadcrumbTitle="PDF Converter"
      countLabel={activeTab === "office" ? undefined : pageCount > 0 ? `${pageCount} pages` : undefined}
      description="Upload once, switch conversion tabs without re-uploading, and process the same file into different formats."
      downloadPanel={
        jobState !== "idle" && !panelDismissed ? (
          <DownloadPanel
            error={jobError}
            errorDetails={jobResult?.traceback}
            estimatedTime={fileMeta ? estimateProcessingTime(fileMeta.size, activeTab === "office" ? 1 : pageCount || 1) : undefined}
            jobId={jobId}
            onDownload={jobState === "success" && jobId ? () => downloadFile("pdf", jobId, downloadName) : undefined}
            onProcessAgain={fileMeta ? handleProcess : undefined}
            onProcessAnother={() => {
              setLocalFile(null);
              setFileMeta(null);
              setItems([]);
              setUploadState("idle");
              setJobId(null);
              setJobState("idle");
              setJobResult(null);
              setJobError(null);
              syncQuery({ file_id: null, job_id: null, tab: activeTab });
            }}
            onReedit={() => setPanelDismissed(true)}
            outputFilename={jobState === "success" ? downloadName : undefined}
            queuePosition={jobResult?.queue_position}
            state={jobState === "success" ? "success" : jobState === "failure" ? "failure" : jobState}
            statusText={
              jobState === "queued"
                ? "Queued"
                : jobState === "processing"
                  ? "Processing"
                  : jobState === "success"
                    ? "Ready"
                    : undefined
            }
          />
        ) : null
      }
      emptyState={
        activeTab === "office" ? (
          <label className="flex w-full max-w-2xl cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <input
              accept={officeFormats.join(",")}
              className="hidden"
              onChange={(event) => {
                void handleFileSelected(event.target.files?.[0] ?? null);
              }}
              type="file"
            />
            <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB]">
              <DocumentIcon className="h-7 w-7" />
            </span>
            <h2 className="text-[18px] font-bold text-slate-900">Upload an office document</h2>
            <p className="mt-2 max-w-xl text-[14px] font-medium leading-7 text-slate-500">
              DOCX, XLSX, PPTX, ODT, ODS, ODP, RTF, and TXT are supported in this tab.
            </p>
            <span className="mt-5 inline-flex h-9 items-center rounded-lg border border-slate-200 px-3 text-[14px] font-medium text-slate-700">
              Browse files
            </span>
          </label>
        ) : (
          <EmptyPdfWorkspaceState
            description="Upload a PDF to convert it into Word, Excel, images, HTML, or text."
            onFilesSelected={(files) => {
              void handleFileSelected(files[0] ?? null);
            }}
          />
        )
      }
      estimatedTime={fileMeta ? estimateProcessingTime(fileMeta.size, activeTab === "office" ? 1 : pageCount || 1) : undefined}
      fileInfo={fileMeta ? formatBytes(fileMeta.size) : undefined}
      fileName={fileMeta?.filename}
      hasContent={Boolean(fileMeta)}
      onDeselectAll={deselectAll}
      onDownload={jobState === "success" && jobId ? () => downloadFile("pdf", jobId, downloadName) : undefined}
      onProcess={handleProcess}
      onReset={() => {
        setLocalFile(null);
        setFileMeta(null);
        setItems([]);
        setUploadState("idle");
        setJobId(null);
        setJobState("idle");
        setJobResult(null);
        setJobError(null);
        syncQuery({ file_id: null, job_id: null, tab: activeTab });
      }}
      onSelectAll={selectAll}
      processButtonDisabled={!fileMeta}
      processingLabel={
        uploadState === "uploading"
          ? "Uploading file"
          : jobState === "queued"
            ? "Waiting in queue"
            : jobState === "processing"
              ? "Processing"
              : jobState === "success"
                ? "Ready"
                : jobState === "failure"
                  ? jobError ?? "Failed"
                  : null
      }
      renderCenter={
        <div className="space-y-5">
          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-2">
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {tabs.map((tab) => (
                <button
                  className={[
                    "rounded-xl px-4 py-3 text-left transition",
                    activeTab === tab.id ? "bg-[#EFF6FF] text-[#2563EB]" : "bg-white text-slate-600 hover:bg-slate-50",
                  ].join(" ")}
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    syncQuery({ file_id: fileMeta?.fileId ?? null, job_id: jobId, tab: tab.id });
                  }}
                  type="button"
                >
                  <p className="text-sm font-bold">{tab.label}</p>
                  <p className="mt-1 text-sm font-medium text-slate-500">{tab.description}</p>
                </button>
              ))}
            </div>
          </div>

          {activeTab === "office" ? (
            fileMeta ? (
              <div className="mx-auto max-w-3xl rounded-2xl border border-[#E5E7EB] bg-white p-8">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#2563EB]">
                  <DocumentIcon className="h-6 w-6" />
                </div>
                <h2 className="mt-4 text-2xl font-bold text-slate-900">{fileMeta.filename}</h2>
                <p className="mt-2 text-sm font-medium text-slate-500">{formatBytes(fileMeta.size)}</p>
              </div>
            ) : null
          ) : (
            <div className="space-y-4">
              {fileMeta ? (
                <div className="rounded-2xl border border-[#E5E7EB] bg-white">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E7EB] px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button className="secondary-button h-9 px-3" disabled={previewPage <= 1} onClick={() => setPreviewPage((page) => Math.max(1, page - 1))} type="button">
                        Prev
                      </button>
                      <span className="min-w-[92px] text-center text-sm font-semibold text-slate-600">
                        {previewPage} / {Math.max(pageCount, 1)}
                      </span>
                      <button className="secondary-button h-9 px-3" disabled={previewPage >= pageCount} onClick={() => setPreviewPage((page) => Math.min(pageCount, page + 1))} type="button">
                        Next
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="secondary-button h-9 px-3" onClick={() => setPreviewZoom((zoom) => Math.max(50, zoom - 25))} type="button">-</button>
                      <span className="min-w-[64px] text-center text-sm font-semibold text-slate-600">{previewZoom}%</span>
                      <button className="secondary-button h-9 px-3" onClick={() => setPreviewZoom((zoom) => Math.min(300, zoom + 25))} type="button">+</button>
                    </div>
                  </div>
                  <div className="flex min-h-[520px] items-center justify-center bg-[#F3F4F6] p-6">
                    <img
                      alt={`Page ${previewPage}`}
                      className="max-h-[72vh] max-w-full rounded-lg bg-white object-contain shadow-sm"
                      src={getPdfPagePreviewUrl(fileMeta.fileId, previewPage, previewZoom)}
                    />
                  </div>
                </div>
              ) : null}
              <PDFThumbnailGrid items={items} onReorder={setItems} onToggleSelect={toggleItem} size={size} />
            </div>
          )}
        </div>
      }
      rightPanel={
        <div className="space-y-6">
          <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-[13px] font-medium leading-6 text-slate-500">
            {jobState === "failure" ? jobError ?? "Conversion failed." : currentTab.description}
          </div>
          <WorkspaceControls sections={rightPanelSections} state={settings} update={update} />
        </div>
      }
      selectAllChecked={activeTab === "office" ? undefined : allSelected}
      setSize={activeTab === "office" ? undefined : setSize}
      showSelectionBar={activeTab === "images"}
      showSizeToggle={activeTab !== "office"}
      size={size}
      uploadOverlay={
        fileMeta || uploadState !== "uploading" || !localFile ? null : (
          <UploadProgress
            fileLabel="Uploading file"
            fileName={localFile.name}
            fileSize={localFile.size}
            onCancel={cancelUpload}
            percent={uploadPercent}
            remainingSecs={uploadRemainingSecs}
            speedKBs={uploadSpeedKBs}
          />
        )
      }
    />
  );
}
