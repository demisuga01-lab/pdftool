"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Image as ImageIcon, Upload } from "lucide-react";

import { DownloadPanel } from "@/components/ui/DownloadPanel";
import { UploadProgress } from "@/components/ui/UploadProgress";
import { EmptyWorkspaceState } from "@/components/workspace/ImageWorkspace";
import {
  WatermarkEditor,
  WatermarkPresetControls,
  type UploadedWatermarkAsset,
  type WatermarkEditorState,
} from "@/components/workspace/WatermarkEditor";
import { VisualEditorWorkspaceShell } from "@/components/workspace/WorkspaceShells";
import { estimateProcessingTime, formatBytes, slugifyBaseName } from "@/lib/format";
import {
  uploadFileToWorkspace,
  type UploadedFileMetadata,
  type UploadProgressHandler,
} from "@/lib/files";
import { useWorkspaceJob } from "@/lib/workspace-job";
import { uploadedFileDetails, uploadedFileSummary, useObjectState } from "@/lib/workspace-data";

type ImageWatermarkSettings = WatermarkEditorState & {
  outputFilename: string;
};

const initialSettings: ImageWatermarkSettings = {
  applyMode: "current",
  bold: true,
  color: "#ffffff",
  fontFamily: "Arial",
  fontSize: 48,
  italic: false,
  opacity: 70,
  outputFilename: "",
  pageRange: "",
  positionPreset: "bottom-right",
  rotation: 0,
  selectedPages: "",
  text: "PDFTools",
  type: "text",
  widthPercent: 22,
  xPercent: 82,
  yPercent: 84,
};

function StatusCard({
  error,
  fileReady,
  jobState,
}: {
  error?: string | null;
  fileReady: boolean;
  jobState: "idle" | "uploading" | "queued" | "processing" | "success" | "failure";
}) {
  const failure = Boolean(error) || jobState === "failure";
  const success = jobState === "success";
  return (
    <div
      className={[
        "rounded-xl border px-4 py-3 text-[13px] font-medium leading-6",
        failure
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : success
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-zinc-200 bg-zinc-50 text-slate-500 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300",
      ].join(" ")}
    >
      {failure
        ? error ?? "Watermark failed."
        : success
          ? "Watermarked image is ready to download."
          : fileReady
            ? "Drag the watermark on the image or tune the controls below."
            : "Upload an image to start watermarking."}
    </div>
  );
}

export default function ImageWatermarkPage() {
  const uploadAbortRef = useRef<AbortController | null>(null);
  const assetAbortRef = useRef<AbortController | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileMeta, setFileMeta] = useState<UploadedFileMetadata | null>(null);
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "failure">("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [uploadSpeedKBs, setUploadSpeedKBs] = useState(0);
  const [uploadRemainingSecs, setUploadRemainingSecs] = useState(0);
  const [uploadedBytes, setUploadedBytes] = useState(0);
  const [uploadTotalBytes, setUploadTotalBytes] = useState(0);
  const [asset, setAsset] = useState<UploadedWatermarkAsset | null>(null);
  const [assetError, setAssetError] = useState<string | null>(null);
  const { state: settings, setState } = useObjectState<ImageWatermarkSettings>(initialSettings);

  const outputExtension = fileMeta?.extension || file?.name.split(".").pop() || "png";
  const job = useWorkspaceJob({
    filename: file ? `${settings.outputFilename.trim() || `${slugifyBaseName(file.name)}-watermarked`}.${outputExtension}` : "watermarked.png",
    prefix: "image",
  });

  const updateSettings = useCallback(
    (patch: Partial<WatermarkEditorState> | Partial<ImageWatermarkSettings>) => {
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
            <span className="max-w-[60%] text-right font-medium text-slate-900 dark:text-zinc-100">{detail.value}</span>
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

  const cancelUpload = useCallback(() => {
    uploadAbortRef.current?.abort();
    uploadAbortRef.current = null;
    setFile(null);
    setFileMeta(null);
    setUploadState("idle");
    setUploadError(null);
    setUploadPercent(0);
    setUploadSpeedKBs(0);
    setUploadRemainingSecs(0);
    setUploadedBytes(0);
    setUploadTotalBytes(0);
    job.reset();
  }, [job]);

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
    formData.append("position_preset", settings.positionPreset);
    formData.append("position", settings.positionPreset);
    formData.append("x_percent", String(settings.xPercent));
    formData.append("y_percent", String(settings.yPercent));
    formData.append("width_percent", String(settings.widthPercent));
    formData.append("font_size", String(settings.fontSize));
    formData.append("font_color", settings.color);
    formData.append("font_weight", settings.bold ? "bold" : "normal");
    formData.append("font_family", settings.fontFamily);
    formData.append("italic", String(settings.italic));
    formData.append("rotation", String(settings.rotation));
    formData.append("tile", String(settings.positionPreset === "tiled"));
    formData.append("output_filename", settings.outputFilename.trim());
    job.process("image/watermark", formData);
  };

  const fileReady = Boolean(fileMeta);
  const baseSrc = fileMeta?.preview_url ?? "";

  return (
    <VisualEditorWorkspaceShell
      countLabel={
        typeof fileMeta?.metadata?.width === "number" && typeof fileMeta?.metadata?.height === "number"
          ? `${fileMeta.metadata.width} x ${fileMeta.metadata.height} px`
          : undefined
      }
      description="Create a text or image watermark, place it visually, then export the watermarked image."
      downloadPanel={
        fileMeta && job.state !== "idle" && job.state !== "uploading" && !job.panelDismissed ? (
          <DownloadPanel
            error={job.error}
            errorDetails={job.errorDetails ?? job.result?.traceback ?? null}
            estimatedTime={estimateProcessingTime(fileMeta.size_bytes, 1)}
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
            onAssetSelected={handleAssetSelected}
            onChange={updateSettings}
            onRemoveAsset={() => setAsset(null)}
            state={settings}
          />
        ) : null
      }
      emptyState={
        <EmptyWorkspaceState
          accept="image/*"
          description="Upload an image to create a draggable text or logo watermark."
          onFilesSelected={(files) => {
            void handleFilesSelected(files);
          }}
        />
      }
      estimatedTime={fileMeta ? estimateProcessingTime(fileMeta.size_bytes, 1) : undefined}
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
          <StatusCard error={uploadError ?? assetError ?? job.error} fileReady={fileReady} jobState={uploadState === "uploading" ? "uploading" : job.state} />
          <WatermarkPresetControls onChange={updateSettings} state={settings} />

          {settings.type === "image" ? (
            <div className="space-y-3 border-t border-zinc-200 pt-6 dark:border-white/10">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Watermark image</p>
              <label className="secondary-button min-h-11 w-full cursor-pointer gap-2">
                <Upload className="h-4 w-4" />
                {asset ? "Replace image" : "Upload image"}
                <input accept="image/*" className="hidden" onChange={(event) => void handleAssetSelected(Array.from(event.target.files ?? []))} type="file" />
              </label>
              {asset ? (
                <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 dark:border-white/10 dark:bg-zinc-900">
                  <img alt="" className="h-12 w-12 rounded-lg border border-slate-200 object-contain dark:border-white/10" src={asset.src} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800 dark:text-zinc-100">{asset.name}</p>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">{asset.fileId ? "Uploaded for this job" : "Uploading watermark image"}</p>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-4 border-t border-zinc-200 pt-6 dark:border-white/10">
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
                <span className="block text-[13px] font-medium text-slate-700 dark:text-zinc-200">Opacity</span>
                <input className="field-range" max={100} min={5} onChange={(event) => updateSettings({ opacity: Number(event.target.value) })} type="range" value={settings.opacity} />
              </label>
              <label className="space-y-1.5">
                <span className="block text-[13px] font-medium text-slate-700 dark:text-zinc-200">Rotation</span>
                <input className="field-input" max={360} min={-360} onChange={(event) => updateSettings({ rotation: Number(event.target.value) })} type="number" value={settings.rotation} />
              </label>
              {settings.type === "text" ? (
                <>
                  <label className="space-y-1.5">
                    <span className="block text-[13px] font-medium text-slate-700 dark:text-zinc-200">Size</span>
                    <input className="field-input" min={10} onChange={(event) => updateSettings({ fontSize: Number(event.target.value) })} type="number" value={settings.fontSize} />
                  </label>
                  <label className="space-y-1.5">
                    <span className="block text-[13px] font-medium text-slate-700 dark:text-zinc-200">Color</span>
                    <input className="h-10 w-full rounded-lg border border-gray-300 bg-white p-1 dark:border-white/10 dark:bg-zinc-950" onChange={(event) => updateSettings({ color: event.target.value })} type="color" value={settings.color} />
                  </label>
                </>
              ) : (
                <label className="col-span-2 space-y-1.5">
                  <span className="block text-[13px] font-medium text-slate-700 dark:text-zinc-200">Logo width</span>
                  <input className="field-range" max={80} min={4} onChange={(event) => updateSettings({ widthPercent: Number(event.target.value) })} type="range" value={settings.widthPercent} />
                </label>
              )}
            </div>
            {settings.type === "text" ? (
              <div className="grid grid-cols-2 gap-2">
                <button className={["secondary-button h-10", settings.bold ? "border-[#059669] text-[#059669]" : ""].join(" ")} onClick={() => updateSettings({ bold: !settings.bold })} type="button">
                  Bold
                </button>
                <button className={["secondary-button h-10", settings.italic ? "border-[#059669] text-[#059669]" : ""].join(" ")} onClick={() => updateSettings({ italic: !settings.italic })} type="button">
                  Italic
                </button>
              </div>
            ) : null}
          </div>

          <div className="space-y-4 border-t border-zinc-200 pt-6 dark:border-white/10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Position</p>
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1.5">
                <span className="block text-[13px] font-medium text-slate-700 dark:text-zinc-200">X percent</span>
                <input className="field-input" max={100} min={0} onChange={(event) => updateSettings({ xPercent: Number(event.target.value), positionPreset: "custom" })} step={0.1} type="number" value={settings.xPercent} />
              </label>
              <label className="space-y-1.5">
                <span className="block text-[13px] font-medium text-slate-700 dark:text-zinc-200">Y percent</span>
                <input className="field-input" max={100} min={0} onChange={(event) => updateSettings({ yPercent: Number(event.target.value), positionPreset: "custom" })} step={0.1} type="number" value={settings.yPercent} />
              </label>
            </div>
          </div>

          <div className="space-y-3 border-t border-zinc-200 pt-6 dark:border-white/10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Output</p>
            <input
              className="field-input"
              onChange={(event) => updateSettings({ outputFilename: event.target.value })}
              placeholder="watermarked-image"
              value={settings.outputFilename}
            />
            <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm text-slate-600 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
              <ImageIcon className="h-4 w-4 text-slate-400" />
              Applies to the current image.
            </div>
          </div>
        </div>
      }
      title="Watermark Image"
      uploadOverlay={
        file && uploadState === "uploading" ? (
          <UploadProgress
            fileLabel="Uploading image"
            fileName={file.name}
            fileSize={file.size}
            onCancel={cancelUpload}
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
