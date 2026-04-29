"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { FileText, Upload } from "lucide-react";

import { DownloadPanel } from "@/components/ui/DownloadPanel";
import { UploadProgress } from "@/components/ui/UploadProgress";
import { EmptyPdfWorkspaceState } from "@/components/workspace/PDFWorkspace";
import {
  WatermarkEditor,
  WatermarkPresetControls,
  type UploadedWatermarkAsset,
  type WatermarkApplyMode,
  type WatermarkEditorState,
} from "@/components/workspace/WatermarkEditor";
import { VisualEditorWorkspaceShell } from "@/components/workspace/WorkspaceShells";
import { estimateProcessingTime, formatBytes, slugifyBaseName } from "@/lib/format";
import {
  getPdfPagePreviewUrl,
  uploadFileToWorkspace,
  type UploadedFileMetadata,
  type UploadProgressHandler,
} from "@/lib/files";
import { useWorkspaceJob } from "@/lib/workspace-job";
import { uploadedFileDetails, uploadedFileSummary, useObjectState, useUploadedPdfPageItems } from "@/lib/workspace-data";

type PdfWatermarkSettings = WatermarkEditorState & {
  outputFilename: string;
};

const initialSettings: PdfWatermarkSettings = {
  applyMode: "all",
  bold: true,
  color: "#64748b",
  fontFamily: "Helvetica",
  fontSize: 54,
  italic: false,
  opacity: 35,
  outputFilename: "",
  pageRange: "",
  positionPreset: "diagonal-center",
  rotation: -35,
  selectedPages: "",
  text: "Confidential",
  type: "text",
  widthPercent: 26,
  xPercent: 50,
  yPercent: 50,
};

function ApplyModeButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={[
        "min-h-10 rounded-lg border px-3 text-sm font-semibold",
        active ? "border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]" : "border-slate-200 bg-white text-slate-600",
      ].join(" ")}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

export default function PdfWatermarkPage() {
  const uploadAbortRef = useRef<AbortController | null>(null);
  const assetAbortRef = useRef<AbortController | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileMeta, setFileMeta] = useState<UploadedFileMetadata | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "failure">("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [uploadSpeedKBs, setUploadSpeedKBs] = useState(0);
  const [uploadRemainingSecs, setUploadRemainingSecs] = useState(0);
  const [uploadedBytes, setUploadedBytes] = useState(0);
  const [uploadTotalBytes, setUploadTotalBytes] = useState(0);
  const [asset, setAsset] = useState<UploadedWatermarkAsset | null>(null);
  const [assetError, setAssetError] = useState<string | null>(null);
  const { state: settings, setState } = useObjectState<PdfWatermarkSettings>(initialSettings);
  const { pageCount } = useUploadedPdfPageItems(fileMeta?.file_id ?? null, Number(fileMeta?.metadata?.page_count ?? fileMeta?.pages ?? 0));

  const outputName = file ? `${settings.outputFilename.trim() || `${slugifyBaseName(file.name)}-watermarked`}.pdf` : "watermarked.pdf";
  const job = useWorkspaceJob({
    filename: outputName,
    prefix: "pdf",
  });

  const updateSettings = useCallback(
    (patch: Partial<WatermarkEditorState> | Partial<PdfWatermarkSettings>) => {
      setState((current) => ({ ...current, ...patch }));
    },
    [setState],
  );

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
      setCurrentPage(1);
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
      } catch (caughtError) {
        if (controller.signal.aborted) {
          return;
        }
        setUploadState("failure");
        setUploadError(caughtError instanceof Error ? caughtError.message : "Upload failed");
      }
    },
    [job],
  );

  const handleAssetSelected = useCallback(async (files: File[]) => {
    const nextFile = files[0];
    if (!nextFile) {
      return;
    }
    const previewUrl = URL.createObjectURL(nextFile);
    setAsset({ name: nextFile.name, src: previewUrl });
    setAssetError(null);
    updateSettings({ type: "image" });

    assetAbortRef.current?.abort();
    const controller = new AbortController();
    assetAbortRef.current = controller;
    try {
      const metadata = await uploadFileToWorkspace(nextFile, undefined, controller.signal);
      setAsset({ fileId: metadata.file_id, name: metadata.original_name, src: metadata.preview_url || previewUrl });
    } catch (caughtError) {
      if (!controller.signal.aborted) {
        setAssetError(caughtError instanceof Error ? caughtError.message : "Could not upload watermark image");
      }
    }
  }, [updateSettings]);

  const handleProcess = () => {
    if (!fileMeta) {
      return;
    }
    if (settings.type === "text" && !settings.text.trim()) {
      return;
    }
    if (settings.type === "image" && !asset?.fileId) {
      setAssetError("Upload a watermark image before processing.");
      return;
    }

    const formData = new FormData();
    formData.append("file_id", fileMeta.file_id);
    formData.append("watermark_type", settings.type);
    formData.append("text", settings.text);
    if (asset?.fileId) {
      formData.append("uploaded_watermark_file_id", asset.fileId);
    }
    formData.append("opacity", String(settings.opacity / 100));
    formData.append("rotation", String(settings.rotation));
    formData.append("x_percent", String(settings.xPercent));
    formData.append("y_percent", String(settings.yPercent));
    formData.append("width_percent", String(settings.widthPercent));
    formData.append("font_size", String(settings.fontSize));
    formData.append("font_color", settings.color);
    formData.append("font_family", settings.fontFamily);
    formData.append("bold", String(settings.bold));
    formData.append("italic", String(settings.italic));
    formData.append("apply_to", settings.applyMode);
    formData.append("selected_pages", settings.selectedPages);
    formData.append("page_range", settings.pageRange);
    formData.append("current_page", String(currentPage));
    formData.append("position_preset", settings.positionPreset);
    formData.append("tile", String(settings.positionPreset === "tiled"));
    formData.append("output_filename", settings.outputFilename.trim());
    job.process("pdf/watermark", formData);
  };

  const fileReady = Boolean(fileMeta);
  const totalPages = Math.max(pageCount || Number(fileMeta?.metadata?.page_count ?? fileMeta?.pages ?? 1), 1);
  const baseSrc = fileMeta ? getPdfPagePreviewUrl(fileMeta.file_id, currentPage, 100) : "";
  const statusError = uploadError ?? assetError ?? job.error;

  return (
    <VisualEditorWorkspaceShell
      countLabel={fileMeta ? `${totalPages} pages` : undefined}
      description="Create text or image watermarks, place them visually, and apply them across selected PDF pages."
      downloadPanel={
        fileMeta && job.state !== "idle" && job.state !== "uploading" && !job.panelDismissed ? (
          <DownloadPanel
            error={job.error}
            estimatedTime={estimateProcessingTime(fileMeta.size_bytes, totalPages)}
            jobId={job.jobId}
            onDownload={job.state === "success" ? job.download : undefined}
            onProcessAnother={() => {
              setFile(null);
              setFileMeta(null);
              setAsset(null);
              job.reset();
            }}
            onReedit={job.dismissPanel}
            state={job.state === "failure" ? "failure" : job.state === "success" ? "success" : job.state}
          />
        ) : null
      }
      editor={
        fileMeta ? (
          <WatermarkEditor
            asset={asset}
            baseAlt={fileMeta.original_name}
            baseSrc={baseSrc}
            currentPage={currentPage}
            onAssetSelected={handleAssetSelected}
            onChange={updateSettings}
            onPageChange={setCurrentPage}
            onRemoveAsset={() => setAsset(null)}
            pageCount={totalPages}
            state={settings}
          />
        ) : null
      }
      emptyState={
        <EmptyPdfWorkspaceState
          description="Upload a PDF to place a draggable text or logo watermark."
          onFilesSelected={(files) => {
            void handleFilesSelected(files);
          }}
        />
      }
      estimatedTime={fileMeta ? estimateProcessingTime(fileMeta.size_bytes, totalPages) : undefined}
      fileInfo={uploadedFileSummary(fileMeta)}
      fileName={fileMeta?.original_name ?? file?.name}
      hasContent={fileReady}
      infoContent={infoContent}
      onDownload={job.state === "success" ? job.download : undefined}
      onFilesDropped={(files) => {
        void handleFilesSelected(files);
      }}
      onProcess={handleProcess}
      onReset={() => {
        setFile(null);
        setFileMeta(null);
        setAsset(null);
        job.reset();
      }}
      processButtonDisabled={!fileMeta || (settings.type === "text" ? !settings.text.trim() : !asset?.fileId)}
      processButtonLabel="Apply watermark"
      processingLabel={
        uploadState === "uploading"
          ? "Uploading file"
          : uploadState === "failure"
            ? uploadError ?? "Upload failed"
            : job.processingLabel
      }
      propertiesPanel={
        <div className="space-y-6">
          <div
            className={[
              "rounded-xl border px-4 py-3 text-[13px] font-medium leading-6",
              statusError || job.state === "failure"
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : job.state === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-[#E5E7EB] bg-[#F9FAFB] text-slate-500",
            ].join(" ")}
          >
            {statusError
              ? statusError
              : job.state === "success"
                ? "Watermarked PDF is ready to download."
                : fileReady
                  ? "Drag the watermark on the preview. Default export applies to all pages."
                  : "Upload a PDF to start watermarking."}
          </div>

          <WatermarkPresetControls onChange={updateSettings} state={settings} />

          {settings.type === "image" ? (
            <div className="space-y-3 border-t border-[#E5E7EB] pt-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Watermark image</p>
              <label className="secondary-button min-h-11 w-full cursor-pointer gap-2">
                <Upload className="h-4 w-4" />
                {asset ? "Replace image" : "Upload image"}
                <input accept="image/*" className="hidden" onChange={(event) => void handleAssetSelected(Array.from(event.target.files ?? []))} type="file" />
              </label>
              {asset ? (
                <div className="flex items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white p-3">
                  <img alt="" className="h-12 w-12 rounded-lg border border-slate-200 object-contain" src={asset.src} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">{asset.name}</p>
                    <p className="text-xs text-slate-500">{asset.fileId ? "Uploaded for this job" : "Uploading watermark image"}</p>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-4 border-t border-[#E5E7EB] pt-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Apply to pages</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                ["all", "All pages"],
                ["current", "Current page"],
                ["selected", "Selected pages"],
                ["range", "Page range"],
              ].map(([value, label]) => (
                <ApplyModeButton
                  active={settings.applyMode === value}
                  key={value}
                  label={label}
                  onClick={() => updateSettings({ applyMode: value as WatermarkApplyMode })}
                />
              ))}
            </div>
            {settings.applyMode === "selected" ? (
              <input
                className="field-input"
                onChange={(event) => updateSettings({ selectedPages: event.target.value })}
                placeholder="1,3,5-8"
                value={settings.selectedPages}
              />
            ) : null}
            {settings.applyMode === "range" ? (
              <input
                className="field-input"
                onChange={(event) => updateSettings({ pageRange: event.target.value })}
                placeholder="1,3,5-8"
                value={settings.pageRange}
              />
            ) : null}
          </div>

          <div className="space-y-4 border-t border-[#E5E7EB] pt-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Text and style</p>
            {settings.type === "text" ? (
              <textarea
                className="field-textarea min-h-[90px]"
                onChange={(event) => updateSettings({ text: event.target.value })}
                value={settings.text}
              />
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1.5">
                <span className="block text-[13px] font-medium text-slate-700">Opacity</span>
                <input className="field-range" max={100} min={5} onChange={(event) => updateSettings({ opacity: Number(event.target.value) })} type="range" value={settings.opacity} />
              </label>
              <label className="space-y-1.5">
                <span className="block text-[13px] font-medium text-slate-700">Rotation</span>
                <input className="field-input" max={360} min={-360} onChange={(event) => updateSettings({ rotation: Number(event.target.value) })} type="number" value={settings.rotation} />
              </label>
              {settings.type === "text" ? (
                <>
                  <label className="space-y-1.5">
                    <span className="block text-[13px] font-medium text-slate-700">Size</span>
                    <input className="field-input" min={10} onChange={(event) => updateSettings({ fontSize: Number(event.target.value) })} type="number" value={settings.fontSize} />
                  </label>
                  <label className="space-y-1.5">
                    <span className="block text-[13px] font-medium text-slate-700">Color</span>
                    <input className="h-10 w-full rounded-lg border border-gray-300 bg-white p-1" onChange={(event) => updateSettings({ color: event.target.value })} type="color" value={settings.color} />
                  </label>
                </>
              ) : (
                <label className="col-span-2 space-y-1.5">
                  <span className="block text-[13px] font-medium text-slate-700">Logo width</span>
                  <input className="field-range" max={80} min={4} onChange={(event) => updateSettings({ widthPercent: Number(event.target.value) })} type="range" value={settings.widthPercent} />
                </label>
              )}
            </div>
            {settings.type === "text" ? (
              <div className="grid grid-cols-2 gap-2">
                <button className={["secondary-button h-10", settings.bold ? "border-[#2563EB] text-[#2563EB]" : ""].join(" ")} onClick={() => updateSettings({ bold: !settings.bold })} type="button">
                  Bold
                </button>
                <button className={["secondary-button h-10", settings.italic ? "border-[#2563EB] text-[#2563EB]" : ""].join(" ")} onClick={() => updateSettings({ italic: !settings.italic })} type="button">
                  Italic
                </button>
              </div>
            ) : null}
          </div>

          <div className="space-y-4 border-t border-[#E5E7EB] pt-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Position</p>
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1.5">
                <span className="block text-[13px] font-medium text-slate-700">X percent</span>
                <input className="field-input" max={100} min={0} onChange={(event) => updateSettings({ xPercent: Number(event.target.value), positionPreset: "custom" })} step={0.1} type="number" value={settings.xPercent} />
              </label>
              <label className="space-y-1.5">
                <span className="block text-[13px] font-medium text-slate-700">Y percent</span>
                <input className="field-input" max={100} min={0} onChange={(event) => updateSettings({ yPercent: Number(event.target.value), positionPreset: "custom" })} step={0.1} type="number" value={settings.yPercent} />
              </label>
            </div>
          </div>

          <div className="space-y-3 border-t border-[#E5E7EB] pt-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Output</p>
            <input
              className="field-input"
              onChange={(event) => updateSettings({ outputFilename: event.target.value })}
              placeholder="watermarked-pdf"
              value={settings.outputFilename}
            />
            <div className="flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-3 py-3 text-sm text-slate-600">
              <FileText className="h-4 w-4 text-slate-400" />
              Default: apply to all pages.
            </div>
          </div>
        </div>
      }
      title="Watermark PDF"
      uploadOverlay={
        file && uploadState === "uploading" ? (
          <UploadProgress
            fileLabel="Uploading PDF"
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
