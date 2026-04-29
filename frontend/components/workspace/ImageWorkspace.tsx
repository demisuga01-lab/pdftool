"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Settings2 } from "lucide-react";
import { useState, type ReactNode } from "react";

import {
  DragHandleIcon,
  GridDenseIcon,
  GridIcon,
  ImageIcon,
  UploadIcon,
} from "@/components/icons/SiteIcons";
import { WorkspaceHeader } from "@/components/workspace/WorkspaceHeader";

import type { WorkspaceThumbnailSize } from "./PDFWorkspace";

const sizeGridClass: Record<WorkspaceThumbnailSize, string> = {
  small: "xl:grid-cols-5 lg:grid-cols-4 md:grid-cols-3 sm:grid-cols-2",
  medium: "xl:grid-cols-4 lg:grid-cols-3 md:grid-cols-2",
  large: "lg:grid-cols-2 grid-cols-1",
};

export type ImageGridItem = {
  dimensionsLabel?: string;
  fileName: string;
  id: string;
  preview: string;
  sizeLabel?: string;
};

function SortableImageCard({
  hoverActions,
  id,
  meta,
  preview,
  title,
}: {
  hoverActions?: ReactNode;
  id: string;
  meta?: string;
  preview: string;
  title: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <div className="group overflow-hidden rounded-xl border border-[#E5E7EB] bg-white transition hover:shadow-sm dark:border-white/10 dark:bg-slate-900">
        <div className="relative">
          <button
            className="absolute right-3 top-3 z-20 rounded-md bg-white/90 p-1.5 text-slate-400 transition hover:text-slate-700 dark:bg-slate-900/90 dark:text-slate-500 dark:hover:text-white"
            type="button"
            {...attributes}
            {...listeners}
          >
            <DragHandleIcon className="h-4 w-4" />
          </button>
          {hoverActions ? (
            <div className="pointer-events-none absolute inset-0 z-10 opacity-0 transition group-hover:opacity-100">
              <div className="pointer-events-auto absolute inset-x-3 bottom-3">{hoverActions}</div>
            </div>
          ) : null}
          <div className="aspect-[4/3] bg-[#F8FAFC] p-3 dark:bg-slate-950">
            <img alt={title} className="h-full w-full rounded-lg border border-[#E5E7EB] object-contain dark:border-white/10" src={preview} />
          </div>
        </div>
        <div className="space-y-1 border-t border-[#E5E7EB] px-3 py-2 dark:border-white/10">
          <p className="truncate font-mono text-[13px] text-slate-700 dark:text-slate-100">{title}</p>
          {meta ? <p className="text-[12px] text-slate-500 dark:text-slate-400">{meta}</p> : null}
        </div>
      </div>
    </div>
  );
}

export function ImageThumbnailGrid({
  items,
  onRemove,
  onReorder,
  size = "medium",
}: {
  items: ImageGridItem[];
  onRemove?: (id: string) => void;
  onReorder: (items: ImageGridItem[]) => void;
  size?: WorkspaceThumbnailSize;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    onReorder(arrayMove(items, oldIndex, newIndex));
  };

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd} sensors={sensors}>
      <SortableContext items={items.map((item) => item.id)} strategy={rectSortingStrategy}>
        <div className={["grid gap-4", sizeGridClass[size]].join(" ")}>
          {items.map((item) => (
            <SortableImageCard
              hoverActions={
                onRemove ? (
                  <button
                    className="rounded-lg border border-white/80 bg-white/90 px-3 py-2 text-sm text-slate-700 dark:border-white/15 dark:bg-slate-900/90 dark:text-slate-200"
                    onClick={() => onRemove(item.id)}
                    type="button"
                  >
                    Remove
                  </button>
                ) : undefined
              }
              id={item.id}
              key={item.id}
              meta={[item.dimensionsLabel, item.sizeLabel].filter(Boolean).join(" / ")}
              preview={item.preview}
              title={item.fileName}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

export function ImageWorkspace({
  breadcrumbTitle,
  centerContent,
  countLabel,
  description,
  downloadPanel,
  emptyState,
  estimatedTime,
  fileInfo,
  fileName,
  hasContent,
  infoContent,
  onDownload,
  onProcess,
  onReset,
  processButtonDisabled,
  processButtonLabel = "Process",
  processingLabel,
  rightPanel,
  showSizeToggle = false,
  size = "medium",
  setSize,
  uploadOverlay,
}: {
  breadcrumbTitle: string;
  centerContent: ReactNode;
  countLabel?: string;
  description: string;
  downloadPanel?: ReactNode;
  emptyState: ReactNode;
  estimatedTime?: string;
  fileInfo?: string;
  fileName?: string;
  hasContent: boolean;
  infoContent?: ReactNode;
  onDownload?: () => void;
  onProcess?: () => void;
  onReset?: () => void;
  processButtonDisabled?: boolean;
  processButtonLabel?: string;
  processingLabel?: string | null;
  rightPanel: ReactNode;
  showSizeToggle?: boolean;
  size?: WorkspaceThumbnailSize;
  setSize?: (size: WorkspaceThumbnailSize) => void;
  uploadOverlay?: ReactNode;
}) {
  return (
    <main className="flex min-h-[calc(100vh-60px)] flex-col bg-white dark:bg-slate-950 lg:h-[calc(100vh-60px)]">
      <WorkspaceHeader
        countLabel={countLabel}
        fileInfo={fileInfo}
        fileName={fileName}
        infoContent={infoContent}
        onDownload={onDownload}
        onReset={onReset}
        processingLabel={processingLabel}
        title={breadcrumbTitle}
      />

      <div className="relative flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="flex min-w-0 flex-1 flex-col bg-[#F3F4F6] dark:bg-slate-950">
          {hasContent ? (
            <>
              {(showSizeToggle && setSize) ? (
                <div className="flex items-center justify-between gap-3 border-b border-[#E5E7EB] bg-white px-4 py-2.5 dark:border-white/10 dark:bg-slate-950 sm:px-6">
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{countLabel}</p>
                  <div className="flex items-center gap-2">
                    {([
                      { key: "small", icon: GridDenseIcon },
                      { key: "medium", icon: GridIcon },
                      { key: "large", icon: GridIcon },
                    ] as const).map((option) => {
                      const Icon = option.icon;
                      return (
                        <button
                          aria-label={`${option.key} grid`}
                          className={[
                            "inline-flex h-8 w-8 items-center justify-center rounded-lg border",
                            size === option.key
                              ? "border-[#2563EB] bg-[#EFF6FF] text-[#2563EB] dark:border-blue-400 dark:bg-blue-500/10 dark:text-blue-300"
                              : "border-slate-200 bg-white text-slate-500 dark:border-white/10 dark:bg-slate-900 dark:text-slate-400",
                          ].join(" ")}
                          key={option.key}
                          onClick={() => setSize(option.key)}
                          type="button"
                        >
                          <Icon className="h-4 w-4" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-24 sm:px-6 sm:py-6 lg:pb-6">
                <div className="space-y-5">
                  {centerContent}
                  <section className="rounded-2xl border border-[#E5E7EB] bg-white p-4 pb-6 dark:border-white/10 dark:bg-slate-900 lg:hidden">
                    <div className="mb-4 space-y-1">
                      <h2 className="text-[18px] font-bold text-slate-900 dark:text-slate-100">{breadcrumbTitle}</h2>
                      <p className="text-[13px] font-medium leading-5 text-slate-500 dark:text-slate-400">{description}</p>
                    </div>
                    {rightPanel}
                    <div className="mt-6">
                      <button
                        className="primary-button h-11 w-full text-[15px]"
                        disabled={processButtonDisabled}
                        onClick={onProcess}
                        type="button"
                      >
                        {processButtonLabel}
                      </button>
                      <p className="mt-2 text-center text-xs text-slate-400 dark:text-slate-500">
                        {estimatedTime ?? "Files deleted after 24 hours"}
                      </p>
                    </div>
                  </section>
                </div>
              </div>
            </>
          ) : (
            <div className="flex min-h-0 flex-1 items-center justify-center p-6">{emptyState}</div>
          )}
        </div>

        <aside className="hidden w-full shrink-0 flex-col border-l border-[#E5E7EB] bg-white dark:border-white/10 dark:bg-slate-950 lg:flex lg:w-[360px]">
          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            <div className="mb-5 space-y-1">
              <h1 className="text-[22px] font-bold leading-tight text-slate-900 dark:text-slate-100">{breadcrumbTitle}</h1>
              <p className="text-[13px] font-medium leading-5 text-slate-500 dark:text-slate-400">{description}</p>
            </div>
            {rightPanel}
          </div>

          <div className="border-t border-[#E5E7EB] bg-white p-5 dark:border-white/10 dark:bg-slate-950">
            <button
              className="primary-button h-11 w-full text-[15px]"
              disabled={processButtonDisabled}
              onClick={onProcess}
              type="button"
            >
              {processButtonLabel}
            </button>
            <div className="mt-2 space-y-0.5 text-center text-xs text-slate-400 dark:text-slate-500">
              <p>{estimatedTime ?? "Estimated time updates after upload"}</p>
              <p>Files deleted after 24 hours</p>
            </div>
          </div>
        </aside>

        {hasContent ? (
          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#E5E7EB] bg-white/95 p-3 backdrop-blur dark:border-white/10 dark:bg-slate-950/95 lg:hidden">
            <button className="primary-button h-11 w-full" disabled={processButtonDisabled} onClick={onProcess} type="button">
              {processButtonLabel}
            </button>
          </div>
        ) : null}
      </div>

      {uploadOverlay ? <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4">{uploadOverlay}</div> : null}
      {downloadPanel ? <div className="fixed inset-x-4 bottom-20 z-40 lg:inset-x-auto lg:bottom-6 lg:right-6 lg:w-[360px]">{downloadPanel}</div> : null}
    </main>
  );
}

export function EmptyWorkspaceState({
  accept,
  description,
  multiple = false,
  onFilesSelected,
}: {
  accept: string;
  description: string;
  multiple?: boolean;
  onFilesSelected: (files: File[]) => void;
}) {
  const [dragging, setDragging] = useState(false);

  return (
    <label
      className={[
        "flex w-full max-w-2xl cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed bg-white px-6 py-14 text-center transition dark:bg-slate-900",
        dragging ? "border-[#2563EB] bg-[#EFF6FF] dark:bg-blue-500/10" : "border-slate-300 dark:border-white/15",
      ].join(" ")}
      onDragLeave={() => setDragging(false)}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        onFilesSelected(Array.from(event.dataTransfer.files ?? []));
      }}
    >
      <input
        accept={accept}
        className="hidden"
        multiple={multiple}
        onChange={(event) => onFilesSelected(Array.from(event.target.files ?? []))}
        type="file"
      />
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB]">
        <ImageIcon className="h-7 w-7" />
      </span>
      <h2 className="text-[18px] text-slate-900 dark:text-slate-100">{multiple ? "Upload files" : "Upload a file"}</h2>
      <p className="mt-2 max-w-xl text-[14px] leading-7 text-slate-500 dark:text-slate-400">{description}</p>
      <span className="mt-5 inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-[14px] text-slate-700 dark:border-white/10 dark:text-slate-200">
        <UploadIcon className="h-4 w-4" />
        Browse files
      </span>
    </label>
  );
}
