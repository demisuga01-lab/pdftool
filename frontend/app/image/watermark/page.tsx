"use client";

import { useEffect, useRef, useState } from "react";

import { DownloadPanel } from "@/components/ui/DownloadPanel";
import { UploadProgress } from "@/components/ui/UploadProgress";
import { EmptyWorkspaceState, ImageWorkspace } from "@/components/workspace/ImageWorkspace";
import { WorkspaceControls, type ControlSection } from "@/components/workspace/Controls";
import { clamp, estimateProcessingTime, slugifyBaseName } from "@/lib/format";
import { useWorkspaceJob } from "@/lib/workspace-job";
import { imageSummary, useObjectState, useSingleImagePreview } from "@/lib/workspace-data";

type WatermarkSettings = {
  fontColor: string;
  fontSize: number;
  fontWeight: "normal" | "bold";
  opacity: number;
  text: string;
  xPercent: number;
  yPercent: number;
};

const sections: Array<ControlSection<WatermarkSettings>> = [
  {
    key: "text",
    label: "Watermark",
    fields: [
      { key: "text", label: "Text", type: "text", placeholder: "PDFTools by WellFriend" },
      { key: "fontSize", label: "Size", type: "slider", min: 12, max: 180 },
      {
        key: "fontWeight",
        label: "Weight",
        type: "buttonGroup",
        options: [
          { label: "Normal", value: "normal" },
          { label: "Bold", value: "bold" },
        ],
      },
      { key: "fontColor", label: "Color", type: "color" },
      { key: "opacity", label: "Opacity", type: "slider", min: 5, max: 100 },
    ],
  },
  {
    key: "position",
    label: "Position",
    fields: [
      { key: "xPercent", label: "X percent", type: "number", min: 0, max: 100, step: 0.1 },
      { key: "yPercent", label: "Y percent", type: "number", min: 0, max: 100, step: 0.1 },
    ],
  },
];

export default function ImageWatermarkPage() {
  const [file, setFile] = useState<File | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const dragState = useRef<
    | { mode: "move"; startX: number; startY: number; startXP: number; startYP: number }
    | { mode: "resize"; startX: number; startSize: number }
    | null
  >(null);
  const preview = useSingleImagePreview(file);
  const { state: settings, setState, update } = useObjectState<WatermarkSettings>({
    fontColor: "#ffffff",
    fontSize: 48,
    fontWeight: "bold",
    opacity: 70,
    text: "PDFTools by WellFriend",
    xPercent: 55,
    yPercent: 78,
  });
  const job = useWorkspaceJob({
    filename: file ? `${slugifyBaseName(file.name)}-watermarked.${file.name.split(".").pop() ?? "png"}` : "watermarked.png",
    prefix: "image",
  });

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (!dragState.current || !frameRef.current) {
        return;
      }

      const bounds = frameRef.current.getBoundingClientRect();
      if (dragState.current.mode === "move") {
        const drag = dragState.current;
        const deltaX = ((event.clientX - dragState.current.startX) / bounds.width) * 100;
        const deltaY = ((event.clientY - dragState.current.startY) / bounds.height) * 100;
        setState((current) => ({
          ...current,
          xPercent: clamp(Number((drag.startXP + deltaX).toFixed(2)), 0, 100),
          yPercent: clamp(Number((drag.startYP + deltaY).toFixed(2)), 0, 100),
        }));
        return;
      }

      const drag = dragState.current;
      const delta = event.clientX - drag.startX;
      setState((current) => ({
        ...current,
        fontSize: clamp(Math.round(drag.startSize + delta / 3), 12, 220),
      }));
    };

    const handlePointerUp = () => {
      dragState.current = null;
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [setState]);

  const handleProcess = () => {
    if (!file || !settings.text.trim()) {
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("text", settings.text);
    formData.append("opacity", String(settings.opacity / 100));
    formData.append("position", "custom");
    formData.append("x_percent", String(settings.xPercent));
    formData.append("y_percent", String(settings.yPercent));
    formData.append("font_size", String(settings.fontSize));
    formData.append("font_color", settings.fontColor);
    formData.append("font_weight", settings.fontWeight);
    job.process("image/watermark", formData);
  };

  const watermarkWidth = Math.max(settings.text.length * settings.fontSize * 0.58, settings.fontSize * 2);
  const watermarkHeight = settings.fontSize * 1.45;

  return (
    <ImageWorkspace
      breadcrumbTitle="Watermark Image"
      centerContent={
        preview ? (
          <div className="mx-auto max-w-5xl rounded-2xl border border-[#E5E7EB] bg-white p-4 sm:p-6">
            <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4 sm:min-h-[520px] sm:p-6">
              <div className="relative inline-block max-w-full" ref={frameRef}>
                <img
                  alt={file?.name ?? "Preview"}
                  className="max-h-[65vh] max-w-full rounded-xl border border-[#E5E7EB] bg-white object-contain"
                  src={preview.dataUrl}
                />
                <div
                  className="absolute cursor-move border border-dashed border-white/80 bg-black/10 px-2 py-1"
                  onPointerDown={(event) => {
                    dragState.current = {
                      mode: "move",
                      startX: event.clientX,
                      startY: event.clientY,
                      startXP: settings.xPercent,
                      startYP: settings.yPercent,
                    };
                  }}
                  onTouchStart={(event) => {
                    const touch = event.touches[0];
                    if (!touch) {
                      return;
                    }
                    dragState.current = {
                      mode: "move",
                      startX: touch.clientX,
                      startY: touch.clientY,
                      startXP: settings.xPercent,
                      startYP: settings.yPercent,
                    };
                  }}
                  style={{
                    minHeight: `${watermarkHeight}px`,
                    minWidth: `${watermarkWidth}px`,
                    left: `${settings.xPercent}%`,
                    top: `${settings.yPercent}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  <span
                    style={{
                      color: settings.fontColor,
                      fontSize: `${settings.fontSize}px`,
                      fontWeight: settings.fontWeight === "bold" ? 700 : 500,
                      opacity: settings.opacity / 100,
                      textShadow: "0 2px 10px rgba(0, 0, 0, 0.25)",
                      userSelect: "none",
                    }}
                    >
                    {settings.text}
                  </span>
                  {[
                    "left-0 top-0 -translate-x-1/2 -translate-y-1/2",
                    "right-0 top-0 translate-x-1/2 -translate-y-1/2",
                    "left-0 bottom-0 -translate-x-1/2 translate-y-1/2",
                    "right-0 bottom-0 translate-x-1/2 translate-y-1/2",
                  ].map((positionClass) => (
                    <button
                      className={`absolute h-4 w-4 rounded-sm border-2 border-[#2563EB] bg-white ${positionClass}`}
                      key={positionClass}
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        dragState.current = {
                          mode: "resize",
                          startSize: settings.fontSize,
                          startX: event.clientX,
                        };
                      }}
                      onTouchStart={(event) => {
                        event.stopPropagation();
                        const touch = event.touches[0];
                        if (!touch) {
                          return;
                        }
                        dragState.current = {
                          mode: "resize",
                          startSize: settings.fontSize,
                          startX: touch.clientX,
                        };
                      }}
                      type="button"
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null
      }
      countLabel={preview ? `${preview.width} x ${preview.height} px` : undefined}
      description="Drag the watermark anywhere on the image and keep the percentage coordinates in sync with the side panel."
      downloadPanel={
        job.state !== "idle" && job.state !== "uploading" && !job.panelDismissed ? (
          <DownloadPanel
            error={job.error}
            estimatedTime={file ? estimateProcessingTime(file.size, 1) : undefined}
            jobId={job.jobId}
            onDownload={job.state === "success" ? job.download : undefined}
            onProcessAnother={() => {
              setFile(null);
              job.reset();
            }}
            onReedit={job.dismissPanel}
            state={job.state === "failure" ? "failure" : job.state === "success" ? "success" : job.state}
          />
        ) : null
      }
      emptyState={
        <EmptyWorkspaceState
          accept="image/*"
          description="Upload an image to place a draggable watermark anywhere on top of it."
          onFilesSelected={(files) => {
            setFile(files[0] ?? null);
            job.reset();
          }}
        />
      }
      estimatedTime={file ? estimateProcessingTime(file.size, 1) : undefined}
      fileInfo={imageSummary(preview)}
      fileName={file?.name}
      hasContent={Boolean(file)}
      onDownload={job.state === "success" ? job.download : undefined}
      onProcess={handleProcess}
      onReset={() => {
        setFile(null);
        job.reset();
      }}
      processButtonDisabled={!file || !settings.text.trim()}
      processingLabel={job.processingLabel}
      rightPanel={
        <div className="space-y-6">
          <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-[13px] font-medium leading-6 text-slate-500">
            Drag the watermark directly on top of the image. Position values are stored as percentages from the top-left corner.
          </div>
          <WorkspaceControls sections={sections} state={settings} update={update} />
        </div>
      }
      uploadOverlay={
        file && job.state === "uploading" ? (
          <UploadProgress
            fileName={file.name}
            fileSize={file.size}
            percent={job.uploadPercent}
            speedKBs={job.uploadSpeedKBs}
          />
        ) : null
      }
    />
  );
}
