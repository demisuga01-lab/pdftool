"use client";

import { useEffect, useRef, useState } from "react";

import { DownloadPanel } from "@/components/ui/DownloadPanel";
import { UploadProgress } from "@/components/ui/UploadProgress";
import { EmptyWorkspaceState, ImageWorkspace } from "@/components/workspace/ImageWorkspace";
import { WorkspaceControls, type ControlSection } from "@/components/workspace/Controls";
import { clamp, estimateProcessingTime, slugifyBaseName } from "@/lib/format";
import { useWorkspaceJob } from "@/lib/workspace-job";
import { imageSummary, useObjectState, useSingleImagePreview } from "@/lib/workspace-data";

type CropSettings = {
  aspectPreset: "free" | "1:1" | "4:3" | "16:9" | "3:2" | "2:3" | "9:16" | "custom";
  customRatioHeight: number;
  customRatioWidth: number;
  expandCanvas: boolean;
  height: number;
  units: "pixels" | "percent";
  width: number;
  x: number;
  y: number;
};

type DragHandle = "move" | "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se";

const sections: Array<ControlSection<CropSettings>> = [
  {
    key: "crop-area",
    label: "Crop Area",
    fields: [
      { key: "x", label: "X", type: "number", min: 0 },
      { key: "y", label: "Y", type: "number", min: 0 },
      { key: "width", label: "Width", type: "number", min: 1 },
      { key: "height", label: "Height", type: "number", min: 1 },
    ],
  },
  {
    key: "aspect-ratio",
    label: "Aspect Ratio",
    fields: [
      {
        key: "aspectPreset",
        label: "Preset",
        type: "select",
        options: [
          { label: "Free", value: "free" },
          { label: "1:1", value: "1:1" },
          { label: "4:3", value: "4:3" },
          { label: "16:9", value: "16:9" },
          { label: "3:2", value: "3:2" },
          { label: "2:3", value: "2:3" },
          { label: "9:16", value: "9:16" },
          { label: "Custom", value: "custom" },
        ],
      },
      { key: "customRatioWidth", label: "Custom ratio width", type: "number", min: 1, show: (settings) => settings.aspectPreset === "custom" },
      { key: "customRatioHeight", label: "Custom ratio height", type: "number", min: 1, show: (settings) => settings.aspectPreset === "custom" },
    ],
  },
  {
    key: "options",
    label: "Options",
    fields: [{ key: "expandCanvas", label: "Expand canvas instead of crop", type: "toggle" }],
  },
];

function getAspectRatio(settings: CropSettings): number | null {
  if (settings.aspectPreset === "free") {
    return null;
  }
  if (settings.aspectPreset === "custom") {
    return settings.customRatioWidth / settings.customRatioHeight;
  }

  const [width, height] = settings.aspectPreset.split(":").map(Number);
  return width / height;
}

export default function ImageCropPage() {
  const [file, setFile] = useState<File | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const dragState = useRef<{
    handle: DragHandle;
    startX: number;
    startY: number;
    startRect: { x: number; y: number; width: number; height: number };
  } | null>(null);
  const preview = useSingleImagePreview(file);
  const { state: settings, setState, update } = useObjectState<CropSettings>({
    aspectPreset: "free",
    customRatioHeight: 1,
    customRatioWidth: 1,
    expandCanvas: false,
    height: 800,
    units: "pixels",
    width: 1200,
    x: 0,
    y: 0,
  });
  const job = useWorkspaceJob({
    filename: file ? `${slugifyBaseName(file.name)}-cropped.${file.name.split(".").pop() ?? "png"}` : "cropped.png",
    prefix: "image",
  });

  useEffect(() => {
    if (!preview) {
      return;
    }

    setState((current) => {
      if (current.width <= preview.width && current.height <= preview.height && (current.width !== 1200 || preview.width >= 1200)) {
        return current;
      }

      return {
        ...current,
        width: preview.width,
        height: preview.height,
        x: 0,
        y: 0,
      };
    });
  }, [preview, setState]);

  useEffect(() => {
    if (!preview) {
      return;
    }

    const ratio = getAspectRatio(settings);
    if (!ratio) {
      return;
    }

    setState((current) => {
      const nextHeight = Math.max(1, Math.round(current.width / ratio));
      return {
        ...current,
        height: clamp(nextHeight, 1, preview.height - current.y),
      };
    });
  }, [preview, setState, settings.aspectPreset, settings.customRatioHeight, settings.customRatioWidth, settings.width]);

  useEffect(() => {
    if (!preview) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (!dragState.current) {
        return;
      }

      event.preventDefault();
      const frame = frameRef.current?.getBoundingClientRect();
      if (!frame) {
        return;
      }

      const scaleX = preview.width / frame.width;
      const scaleY = preview.height / frame.height;
      const deltaX = (event.clientX - dragState.current.startX) * scaleX;
      const deltaY = (event.clientY - dragState.current.startY) * scaleY;
      const start = dragState.current.startRect;
      let next = { ...start };

      if (dragState.current.handle === "move") {
        next.x = clamp(Math.round(start.x + deltaX), 0, preview.width - start.width);
        next.y = clamp(Math.round(start.y + deltaY), 0, preview.height - start.height);
      } else {
        if (dragState.current.handle.includes("e")) {
          next.width = clamp(Math.round(start.width + deltaX), 20, preview.width - start.x);
        }
        if (dragState.current.handle.includes("s")) {
          next.height = clamp(Math.round(start.height + deltaY), 20, preview.height - start.y);
        }
        if (dragState.current.handle.includes("w")) {
          const nextX = clamp(Math.round(start.x + deltaX), 0, start.x + start.width - 20);
          next.width = start.width + (start.x - nextX);
          next.x = nextX;
        }
        if (dragState.current.handle.includes("n")) {
          const nextY = clamp(Math.round(start.y + deltaY), 0, start.y + start.height - 20);
          next.height = start.height + (start.y - nextY);
          next.y = nextY;
        }
      }

      setState((current) => ({ ...current, ...next }));
    };

    const handlePointerUp = () => {
      dragState.current = null;
    };

    const handleTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch || !dragState.current) {
        return;
      }

      const frame = frameRef.current?.getBoundingClientRect();
      if (!frame) {
        return;
      }

      const scaleX = preview.width / frame.width;
      const scaleY = preview.height / frame.height;
      const deltaX = (touch.clientX - dragState.current.startX) * scaleX;
      const deltaY = (touch.clientY - dragState.current.startY) * scaleY;
      const start = dragState.current.startRect;
      let next = { ...start };

      if (dragState.current.handle === "move") {
        next.x = clamp(Math.round(start.x + deltaX), 0, preview.width - start.width);
        next.y = clamp(Math.round(start.y + deltaY), 0, preview.height - start.height);
      } else {
        if (dragState.current.handle.includes("e")) {
          next.width = clamp(Math.round(start.width + deltaX), 20, preview.width - start.x);
        }
        if (dragState.current.handle.includes("s")) {
          next.height = clamp(Math.round(start.height + deltaY), 20, preview.height - start.y);
        }
        if (dragState.current.handle.includes("w")) {
          const nextX = clamp(Math.round(start.x + deltaX), 0, start.x + start.width - 20);
          next.width = start.width + (start.x - nextX);
          next.x = nextX;
        }
        if (dragState.current.handle.includes("n")) {
          const nextY = clamp(Math.round(start.y + deltaY), 0, start.y + start.height - 20);
          next.height = start.height + (start.y - nextY);
          next.y = nextY;
        }
      }

      setState((current) => ({ ...current, ...next }));
    };

    const handleTouchEnd = () => {
      dragState.current = null;
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [preview, setState]);

  const startDrag = (handle: DragHandle, clientX: number, clientY: number) => {
    dragState.current = {
      handle,
      startX: clientX,
      startY: clientY,
      startRect: {
        x: settings.x,
        y: settings.y,
        width: settings.width,
        height: settings.height,
      },
    };
  };

  const handleProcess = () => {
    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("x", String(settings.x));
    formData.append("y", String(settings.y));
    formData.append("width", String(settings.width));
    formData.append("height", String(settings.height));
    formData.append("units", settings.units);
    formData.append("expand_canvas", String(settings.expandCanvas));
    job.process("image/crop", formData);
  };

  const cropWidth = preview ? clamp((settings.width / preview.width) * 100, 2, 100) : 60;
  const cropHeight = preview ? clamp((settings.height / preview.height) * 100, 2, 100) : 60;
  const cropLeft = preview ? clamp((settings.x / preview.width) * 100, 0, 100 - cropWidth) : 0;
  const cropTop = preview ? clamp((settings.y / preview.height) * 100, 0, 100 - cropHeight) : 0;

  return (
    <ImageWorkspace
      breadcrumbTitle="Crop Image"
      centerContent={
        preview ? (
          <div className="mx-auto max-w-6xl rounded-2xl border border-[#E5E7EB] bg-white p-4 dark:border-white/10 dark:bg-slate-900 sm:p-6">
            <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4 dark:border-white/10 dark:bg-slate-950 sm:min-h-[520px] sm:p-6">
              <div className="relative inline-block max-w-full" ref={frameRef}>
                <img
                  alt={file?.name ?? "Preview"}
                  className="max-h-[65vh] max-w-full rounded-xl border border-[#E5E7EB] bg-white object-contain dark:border-white/10"
                  src={preview.dataUrl}
                />
                <div className="absolute inset-0">
                  <div className="absolute left-0 right-0 top-0 bg-black/45" style={{ height: `${cropTop}%` }} />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/45" style={{ height: `${100 - cropTop - cropHeight}%` }} />
                  <div className="absolute left-0 bg-black/45" style={{ top: `${cropTop}%`, height: `${cropHeight}%`, width: `${cropLeft}%` }} />
                  <div className="absolute right-0 bg-black/45" style={{ top: `${cropTop}%`, height: `${cropHeight}%`, width: `${100 - cropLeft - cropWidth}%` }} />
                  <div
                    className="absolute border-2 border-[#2563EB] bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0)]"
                    onPointerDown={(event) => startDrag("move", event.clientX, event.clientY)}
                    onTouchStart={(event) => {
                      const touch = event.touches[0];
                      if (touch) {
                        startDrag("move", touch.clientX, touch.clientY);
                      }
                    }}
                    style={{ left: `${cropLeft}%`, top: `${cropTop}%`, width: `${cropWidth}%`, height: `${cropHeight}%` }}
                  >
                    {[
                      ["nw", "left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nw-resize"],
                      ["n", "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 cursor-n-resize"],
                      ["ne", "right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-ne-resize"],
                      ["e", "right-0 top-1/2 translate-x-1/2 -translate-y-1/2 cursor-e-resize"],
                      ["se", "bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-se-resize"],
                      ["s", "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 cursor-s-resize"],
                      ["sw", "bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-sw-resize"],
                      ["w", "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-w-resize"],
                    ].map(([handle, className]) => (
                      <div
                        className={`absolute h-4 w-4 rounded-[2px] border-2 border-[#2563EB] bg-white dark:bg-slate-900 md:h-[10px] md:w-[10px] ${className}`}
                        key={handle}
                        onPointerDown={(event) => {
                          event.stopPropagation();
                          startDrag(handle as DragHandle, event.clientX, event.clientY);
                        }}
                        onTouchStart={(event) => {
                          event.stopPropagation();
                          const touch = event.touches[0];
                          if (touch) {
                            startDrag(handle as DragHandle, touch.clientX, touch.clientY);
                          }
                        }}
                      />
                    ))}
                  </div>
                  <div className="absolute bottom-4 left-4 rounded-full bg-slate-900/80 px-3 py-1 text-[12px] font-semibold text-white">
                    {settings.width} x {settings.height} px
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null
      }
      countLabel={preview ? `${preview.width} x ${preview.height} px` : undefined}
      description="Drag the crop rectangle directly on the image, resize it from any handle, and keep the numeric controls in sync."
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
          description="Upload an image to crop it with drag handles and pixel-precise controls."
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
      processButtonDisabled={!file}
      processingLabel={job.processingLabel}
      rightPanel={
        <div className="space-y-6">
          <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-[13px] font-medium leading-6 text-slate-500 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300">
            Drag inside the crop box to move it, or use any of the eight handles to resize it. The X, Y, Width, and Height fields update live.
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
