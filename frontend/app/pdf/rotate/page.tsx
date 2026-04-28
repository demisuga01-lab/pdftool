"use client";

import { useState } from "react";

import { RotateCcwIcon, RotateCwIcon } from "@/components/icons/SiteIcons";
import { WorkspaceControls, type ControlSection } from "@/components/workspace/Controls";
import {
  EmptyPdfWorkspaceState,
  PDFThumbnailGrid,
  PDFWorkspace,
  type PdfPageCard,
  type WorkspaceThumbnailSize,
} from "@/components/workspace/PDFWorkspace";
import { estimateProcessingTime, formatBytes, slugifyBaseName } from "@/lib/format";
import { useWorkspaceJob } from "@/lib/workspace-job";
import { selectedPagesLabel, useObjectState, usePageSelection, usePdfPageItems } from "@/lib/workspace-data";

type RotateSettings = {
  angle: 90 | 180 | 270;
  applyTo: "all" | "selected" | "even" | "odd";
};

const sections: Array<ControlSection<RotateSettings>> = [
  {
    key: "rotate-selection",
    label: "Rotate Selection",
    fields: [
      {
        key: "applyTo",
        label: "Apply to",
        type: "buttonGroup",
        options: [
          { label: "All", value: "all" },
          { label: "Selected", value: "selected" },
          { label: "Even", value: "even" },
          { label: "Odd", value: "odd" },
        ],
      },
    ],
  },
];

function applyRotation(items: PdfPageCard[], matcher: (item: PdfPageCard) => boolean, delta: number) {
  return items.map((item) =>
    matcher(item)
      ? {
          ...item,
          rotation: (((item.rotation ?? 0) + delta) % 360 + 360) % 360,
          selected: true,
        }
      : item,
  );
}

export default function PdfRotatePage() {
  const [file, setFile] = useState<File | null>(null);
  const [size, setSize] = useState<WorkspaceThumbnailSize>("medium");
  const { state: settings, update } = useObjectState<RotateSettings>({
    angle: 90,
    applyTo: "all",
  });
  const { items, pageCount, setItems } = usePdfPageItems(file);
  const { allSelected, deselectAll, selectAll, toggleItem } = usePageSelection(items, setItems);
  const job = useWorkspaceJob({
    filename: file ? `${slugifyBaseName(file.name)}-rotated.pdf` : "rotated.pdf",
    prefix: "pdf",
  });

  const selectionMatcher = (item: PdfPageCard) => {
    if (settings.applyTo === "selected") {
      return Boolean(item.selected);
    }
    if (settings.applyTo === "even") {
      return item.pageNumber % 2 === 0;
    }
    if (settings.applyTo === "odd") {
      return item.pageNumber % 2 === 1;
    }
    return true;
  };

  const rotatedItems = items.filter((item) => (item.rotation ?? 0) > 0);
  const uniqueAngles = Array.from(new Set(rotatedItems.map((item) => item.rotation ?? 0).filter(Boolean)));
  const targetCount = items.filter(selectionMatcher).length;

  const handleProcess = () => {
    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("angle", String(settings.angle));

    let pages = "all";
    if (settings.applyTo === "selected") {
      pages = selectedPagesLabel(items);
    } else if (settings.applyTo === "even") {
      pages = items.filter((item) => item.pageNumber % 2 === 0).map((item) => item.pageNumber).join(",");
    } else if (settings.applyTo === "odd") {
      pages = items.filter((item) => item.pageNumber % 2 === 1).map((item) => item.pageNumber).join(",");
    }
    formData.append("pages", pages);
    formData.append("output_filename", file ? `${slugifyBaseName(file.name)}-rotated` : "rotated");

    job.process("pdf/rotate", formData);
  };

  return (
    <PDFWorkspace
      breadcrumbTitle="Rotate PDF"
      countLabel={pageCount > 0 ? `${pageCount} pages` : undefined}
      description="Rotate full documents or selected page groups from a thumbnail-driven workspace."
      emptyState={
        <EmptyPdfWorkspaceState
          description="Upload a PDF to review its pages and adjust rotation before processing."
          onFilesSelected={(files) => {
            setFile(files[0] ?? null);
            job.reset();
          }}
        />
      }
      estimatedTime={file ? estimateProcessingTime(file.size, pageCount) : undefined}
      fileInfo={file ? formatBytes(file.size) : undefined}
      fileName={file?.name}
      hasContent={Boolean(file)}
      onDeselectAll={deselectAll}
      onDownload={job.state === "success" ? job.download : undefined}
      onProcess={handleProcess}
      onReset={() => {
        setFile(null);
        setItems([]);
        job.reset();
      }}
      onSelectAll={selectAll}
      processButtonDisabled={!file || (settings.applyTo === "selected" && !items.some((item) => item.selected)) || uniqueAngles.length > 1}
      processingLabel={job.processingLabel}
      renderCenter={
        file ? (
          <PDFThumbnailGrid
            items={items}
            onReorder={setItems}
            onToggleSelect={toggleItem}
            renderHoverActions={(item) => (
              <div className="flex gap-2">
                <button
                  className="rounded-lg border border-white/80 bg-white/90 px-3 py-2 text-sm text-slate-700"
                  onClick={() =>
                    setItems(items.map((entry) =>
                      entry.id === item.id
                        ? { ...entry, rotation: (((entry.rotation ?? 0) + 270) % 360 + 360) % 360, selected: true }
                        : entry,
                    ))
                  }
                  type="button"
                >
                  <RotateCcwIcon className="h-4 w-4" />
                </button>
                <button
                  className="rounded-lg border border-white/80 bg-white/90 px-3 py-2 text-sm text-slate-700"
                  onClick={() =>
                    setItems(items.map((entry) =>
                      entry.id === item.id
                        ? { ...entry, rotation: (((entry.rotation ?? 0) + 90) % 360 + 360) % 360, selected: true }
                        : entry,
                    ))
                  }
                  type="button"
                >
                  <RotateCwIcon className="h-4 w-4" />
                </button>
              </div>
            )}
            size={size}
          />
        ) : null
      }
      rightPanel={
        <div className="space-y-6">
          <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-[13px] leading-6 text-slate-500">
            {job.state === "failure"
              ? job.error ?? "Rotation failed."
              : uniqueAngles.length > 1
                ? "Use one rotation angle per run. The current backend accepts a single angle for the selected pages."
                : "Pick pages on the canvas or use the quick selection tools here."}
          </div>

          <WorkspaceControls sections={sections} state={settings} update={update} />

          <div className="space-y-4 border-t border-[#E5E7EB] pt-6">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
              Rotate Selection
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { angle: 90 as const, label: "90 CW", icon: RotateCwIcon },
                { angle: 180 as const, label: "180", icon: RotateCwIcon },
                { angle: 270 as const, label: "90 CCW", icon: RotateCcwIcon },
              ].map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    className={[
                      "flex h-11 items-center justify-center gap-2 rounded-lg border text-[14px] transition",
                      settings.angle === option.angle
                        ? "border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
                    ].join(" ")}
                    key={option.label}
                    onClick={() => {
                      update("angle", option.angle);
                      setItems(applyRotation(items, selectionMatcher, option.angle === 270 ? -90 : option.angle));
                    }}
                    type="button"
                  >
                    <Icon className="h-4 w-4" />
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-4 border-t border-[#E5E7EB] pt-6">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
              Page Selection
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button className="rounded-lg border border-slate-200 px-3 py-2 text-[14px] text-slate-700" onClick={selectAll} type="button">
                Select all
              </button>
              <button
                className="rounded-lg border border-slate-200 px-3 py-2 text-[14px] text-slate-700"
                onClick={() => setItems(items.map((item) => ({ ...item, selected: item.pageNumber % 2 === 0 })))}
                type="button"
              >
                Select even
              </button>
              <button
                className="rounded-lg border border-slate-200 px-3 py-2 text-[14px] text-slate-700"
                onClick={() => setItems(items.map((item) => ({ ...item, selected: item.pageNumber % 2 === 1 })))}
                type="button"
              >
                Select odd
              </button>
              <button className="rounded-lg border border-slate-200 px-3 py-2 text-[14px] text-slate-700" onClick={deselectAll} type="button">
                Clear
              </button>
            </div>
          </div>

          <div className="space-y-3 border-t border-[#E5E7EB] pt-6">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
              Preview
            </p>
            <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-[13px] leading-6 text-slate-600">
              {targetCount} pages will be rotated {settings.angle} degrees.
            </div>
          </div>
        </div>
      }
      selectAllChecked={allSelected}
      setSize={setSize}
      size={size}
    />
  );
}
