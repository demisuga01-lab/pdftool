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
import { ArrowDown, ArrowUp, Settings2, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";

import {
  CheckIcon,
  CloseIcon,
  DragHandleIcon,
  GridDenseIcon,
  GridIcon,
  PageIcon,
  UploadIcon,
} from "@/components/icons/SiteIcons";
import { WorkspaceHeader } from "@/components/workspace/WorkspaceHeader";

export type WorkspaceThumbnailSize = "small" | "medium" | "large";

type WorkspaceShellProps = {
  breadcrumbTitle: string;
  countLabel?: string;
  description: string;
  downloadPanel?: ReactNode;
  emptyState: ReactNode;
  estimatedTime?: string;
  fileInfo?: string;
  fileName?: string;
  hasContent: boolean;
  infoContent?: ReactNode;
  onDeselectAll?: () => void;
  onDownload?: () => void;
  onProcess?: () => void;
  onReset?: () => void;
  onSelectAll?: () => void;
  processButtonDisabled?: boolean;
  processButtonLabel?: string;
  processingLabel?: string | null;
  renderCenter: ReactNode;
  rightPanel: ReactNode;
  selectAllChecked?: boolean;
  showSelectionBar?: boolean;
  showSizeToggle?: boolean;
  size?: WorkspaceThumbnailSize;
  setSize?: (size: WorkspaceThumbnailSize) => void;
  uploadOverlay?: ReactNode;
};

const sizeGridClass: Record<WorkspaceThumbnailSize, string> = {
  small: "xl:grid-cols-5 lg:grid-cols-4 md:grid-cols-3 sm:grid-cols-2",
  medium: "xl:grid-cols-4 lg:grid-cols-3 md:grid-cols-2",
  large: "lg:grid-cols-2 grid-cols-1",
};

type SortableCardProps = {
  badge?: ReactNode;
  children: ReactNode;
  hoverActions?: ReactNode;
  id: string;
  selected?: boolean;
  title?: string;
};

function SortableCard({
  badge,
  children,
  hoverActions,
  id,
  selected = false,
  title,
}: SortableCardProps) {
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.55 : 1,
      }}
    >
      <div
        className={[
          "group relative overflow-hidden rounded-xl border bg-white transition hover:shadow-sm",
          selected ? "border-2 border-[#2563EB]" : "border-[#E5E7EB]",
          isDragging ? "shadow-lg shadow-slate-900/10 ring-2 ring-[#2563EB]/20" : "",
        ].join(" ")}
      >
        {badge ? <div className="absolute left-3 top-3 z-20">{badge}</div> : null}
        <button
          className="absolute right-3 top-3 z-20 rounded-md bg-white/90 p-1.5 text-slate-400 transition hover:text-slate-700"
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
        {children}
        {title ? <div className="border-t border-[#E5E7EB] px-3 py-2 text-[12px] text-slate-500">{title}</div> : null}
      </div>
    </div>
  );
}

export type PdfPageCard = {
  id: string;
  pageNumber: number;
  rotation?: number;
  selected?: boolean;
  thumbnail: string;
};

export function PDFThumbnailGrid({
  items,
  onReorder,
  onToggleSelect,
  renderHoverActions,
  size = "medium",
}: {
  items: PdfPageCard[];
  onReorder: (items: PdfPageCard[]) => void;
  onToggleSelect: (id: string) => void;
  renderHoverActions?: (item: PdfPageCard) => ReactNode;
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
            <SortableCard
              badge={
                <button
                  className={[
                    "flex h-6 w-6 items-center justify-center rounded-md border bg-white/95",
                    item.selected ? "border-[#2563EB] text-[#2563EB]" : "border-slate-200 text-transparent",
                  ].join(" ")}
                  onClick={() => onToggleSelect(item.id)}
                  type="button"
                >
                  <CheckIcon className="h-4 w-4" />
                </button>
              }
              hoverActions={renderHoverActions?.(item)}
              id={item.id}
              key={item.id}
              selected={item.selected}
              title={`Page ${item.pageNumber}`}
            >
              <div className="aspect-[1/1.4] bg-white p-3">
                <img
                  alt={`Page ${item.pageNumber}`}
                  className="h-full w-full rounded-lg border border-[#E5E7EB] object-cover"
                  src={item.thumbnail}
                />
                {item.rotation ? (
                  <div className="absolute bottom-11 left-3 rounded-full bg-slate-900/80 px-2 py-1 text-[11px] text-white">
                    {item.rotation} deg
                  </div>
                ) : null}
              </div>
            </SortableCard>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

export type PdfFileCard = {
  fileName: string;
  id: string;
  pageCount: number;
  sizeLabel: string;
  thumbnail?: string;
};

export function PDFFileGrid({
  items,
  onRemove,
  onReorder,
}: {
  items: PdfFileCard[];
  onRemove: (id: string) => void;
  onReorder: (items: PdfFileCard[]) => void;
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
        <div className="grid gap-3">
          {items.map((item, index) => (
            <SortableCard
              id={item.id}
              key={item.id}
            >
              <div className="flex items-center gap-4 p-4">
                <button className="rounded-lg border border-slate-200 bg-white p-2 text-slate-400" type="button">
                  <DragHandleIcon className="h-4 w-4" />
                </button>
                <div className="flex h-20 w-16 shrink-0 items-center justify-center rounded-lg border border-[#E5E7EB] bg-[#F8FAFC]">
                  {item.thumbnail ? (
                    <img alt={item.fileName} className="h-full w-full rounded-lg object-cover" src={item.thumbnail} />
                  ) : (
                    <PageIcon className="h-10 w-10 text-slate-300" />
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">File {index + 1}</p>
                  <p className="truncate font-mono text-[13px] font-medium text-slate-700">{item.fileName}</p>
                  <p className="text-sm font-medium text-slate-500">{item.pageCount} pages</p>
                  <p className="text-sm font-medium text-slate-500">{item.sizeLabel}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    aria-label="Move file up"
                    className="secondary-button h-10 w-10 p-0"
                    disabled={index === 0}
                    onClick={() => onReorder(arrayMove(items, index, index - 1))}
                    type="button"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    aria-label="Move file down"
                    className="secondary-button h-10 w-10 p-0"
                    disabled={index === items.length - 1}
                    onClick={() => onReorder(arrayMove(items, index, index + 1))}
                    type="button"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                </div>
                <button
                  aria-label={`Remove ${item.fileName}`}
                  className="secondary-button h-10 w-10 shrink-0 p-0 text-rose-600"
                  onClick={() => onRemove(item.id)}
                  type="button"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </SortableCard>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

export function PDFWorkspace({
  breadcrumbTitle,
  countLabel,
  description,
  downloadPanel,
  emptyState,
  estimatedTime,
  fileInfo,
  fileName,
  hasContent,
  infoContent,
  onDeselectAll,
  onDownload,
  onProcess,
  onReset,
  onSelectAll,
  processButtonDisabled,
  processButtonLabel = "Process",
  processingLabel,
  renderCenter,
  rightPanel,
  selectAllChecked,
  showSelectionBar = true,
  showSizeToggle = true,
  size = "medium",
  setSize,
  uploadOverlay,
}: WorkspaceShellProps) {
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);

  return (
    <main className="flex min-h-[calc(100vh-60px)] flex-col bg-white lg:h-[calc(100vh-60px)]">
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
        <div className="flex min-w-0 flex-1 flex-col bg-[#F3F4F6]">
          {hasContent ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5E7EB] bg-white px-4 py-2.5 sm:px-6">
                <div className="flex items-center gap-3">
                  {showSelectionBar ? (
                    <>
                      <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-600">
                        <input
                          checked={Boolean(selectAllChecked)}
                          className="h-4 w-4 rounded border-slate-300"
                          onChange={() => (selectAllChecked ? onDeselectAll?.() : onSelectAll?.())}
                          type="checkbox"
                        />
                        <span>{countLabel}</span>
                      </label>
                      <button className="text-sm font-medium text-slate-400 hover:text-slate-700" onClick={onDeselectAll} type="button">
                        Deselect all
                      </button>
                    </>
                  ) : (
                    <p className="text-sm font-medium text-slate-500">{countLabel}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {showSizeToggle && setSize ? (
                    <>
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
                                ? "border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]"
                                : "border-slate-200 bg-white text-slate-500",
                            ].join(" ")}
                            key={option.key}
                            onClick={() => setSize(option.key)}
                            type="button"
                          >
                            <Icon className="h-4 w-4" />
                          </button>
                        );
                      })}
                    </>
                  ) : null}
                  <button
                    className="secondary-button h-9 gap-2 lg:hidden"
                    onClick={() => setMobileSettingsOpen(true)}
                    type="button"
                  >
                    <Settings2 className="h-4 w-4" />
                    Settings
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-24 sm:px-6 sm:py-6 lg:pb-6">
                {renderCenter}
              </div>
            </>
          ) : (
            <div className="flex min-h-0 flex-1 items-center justify-center p-6">{emptyState}</div>
          )}
        </div>

        <aside className="hidden w-full shrink-0 flex-col border-l border-[#E5E7EB] bg-white lg:flex lg:w-[360px]">
          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            <div className="mb-5 space-y-1">
              <h1 className="text-[22px] font-bold leading-tight text-slate-900">{breadcrumbTitle}</h1>
              <p className="text-[13px] font-medium leading-5 text-slate-500">{description}</p>
            </div>
            {rightPanel}
          </div>

          <div className="border-t border-[#E5E7EB] bg-white p-5">
            <button
              className="primary-button h-11 w-full text-[15px]"
              disabled={processButtonDisabled}
              onClick={onProcess}
              type="button"
            >
              {processButtonLabel}
            </button>
            <div className="mt-2 space-y-0.5 text-center text-xs text-slate-400">
              <p>{estimatedTime ?? "Estimated time updates after upload"}</p>
              <p>Files deleted after 24 hours</p>
            </div>
          </div>
        </aside>

        {hasContent ? (
          <>
            <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#E5E7EB] bg-white/95 p-3 backdrop-blur lg:hidden">
              <button className="primary-button h-11 w-full" disabled={processButtonDisabled} onClick={onProcess} type="button">
                {processButtonLabel}
              </button>
            </div>
            <button
              aria-label="Open settings"
              className="fixed bottom-16 right-4 z-30 inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/30 lg:hidden"
              onClick={() => setMobileSettingsOpen(true)}
              type="button"
            >
              <Settings2 className="h-5 w-5" />
            </button>
          </>
        ) : null}

        <div
          className={[
            "fixed inset-0 z-40 bg-slate-900/35 transition lg:hidden",
            mobileSettingsOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
          ].join(" ")}
          onClick={() => setMobileSettingsOpen(false)}
        />
        <div
          className={[
            "fixed inset-x-0 bottom-0 z-50 max-h-[85vh] rounded-t-[24px] bg-white transition lg:hidden",
            mobileSettingsOpen ? "translate-y-0" : "translate-y-full",
          ].join(" ")}
        >
          <div className="flex items-center justify-between border-b border-[#E5E7EB] px-5 py-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">{breadcrumbTitle}</h2>
              <p className="text-[13px] font-medium text-slate-500">{description}</p>
            </div>
            <button
              aria-label="Close settings"
              className="secondary-button h-9 w-9 p-0"
              onClick={() => setMobileSettingsOpen(false)}
              type="button"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>
          <div className="overflow-y-auto px-5 py-4 pb-24">
            {rightPanel}
            <div className="pt-5">
              <button
                className="primary-button h-11 w-full"
                disabled={processButtonDisabled}
                onClick={() => { onProcess?.(); setMobileSettingsOpen(false); }}
                type="button"
              >
                {processButtonLabel}
              </button>
            </div>
          </div>
        </div>
      </div>

      {uploadOverlay ? <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4">{uploadOverlay}</div> : null}
      {downloadPanel ? <div className="fixed inset-x-4 bottom-20 z-40 lg:inset-x-auto lg:bottom-6 lg:right-6 lg:w-[360px]">{downloadPanel}</div> : null}
    </main>
  );
}

export function EmptyPdfWorkspaceState({
  description,
  multiple = false,
  onFilesSelected,
}: {
  description: string;
  multiple?: boolean;
  onFilesSelected: (files: File[]) => void;
}) {
  const [dragging, setDragging] = useState(false);

  return (
    <label
      className={[
        "flex w-full max-w-2xl cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed bg-white px-6 py-14 text-center transition",
        dragging ? "border-[#2563EB] bg-[#EFF6FF]" : "border-slate-300",
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
        accept=".pdf,application/pdf"
        className="hidden"
        multiple={multiple}
        onChange={(event) => onFilesSelected(Array.from(event.target.files ?? []))}
        type="file"
      />
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB]">
        <PageIcon className="h-7 w-7" />
      </span>
      <h2 className="text-[18px] text-slate-900">{multiple ? "Upload PDF files" : "Upload a PDF"}</h2>
      <p className="mt-2 max-w-xl text-[14px] leading-7 text-slate-500">{description}</p>
      <span className="mt-5 inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-[14px] text-slate-700">
        <UploadIcon className="h-4 w-4" />
        Browse files
      </span>
    </label>
  );
}
