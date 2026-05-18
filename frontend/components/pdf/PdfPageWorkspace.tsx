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
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  GripVertical,
  RotateCcw,
  X,
} from "lucide-react";
import { useEffect, useMemo, type KeyboardEvent, type MouseEvent } from "react";

import type { PdfPageCard } from "@/components/workspace/PDFWorkspace";
import { getPdfPagePreviewUrl } from "@/lib/files";

export type PdfWorkspacePageItem = PdfPageCard;

type PageSelectionToolbarProps = {
  activeCount: number;
  onClearSelection: () => void;
  onInvertSelection: () => void;
  onRestoreAll: () => void;
  onSelectAll: () => void;
  onSelectEven: () => void;
  onSelectOdd: () => void;
  removedCount: number;
  selectedCount: number;
  totalCount: number;
};

type PdfPageGridProps = {
  items: PdfWorkspacePageItem[];
  onMove: (id: string, direction: -1 | 1) => void;
  onPreview: (pageNumber: number) => void;
  onRemoveToggle: (id: string) => void;
  onReorder: (items: PdfWorkspacePageItem[]) => void;
  onToggleSelect: (item: PdfWorkspacePageItem, shiftKey: boolean) => void;
  reorderEnabled?: boolean;
};

type PdfPagePreviewModalProps = {
  fileId: string;
  items: PdfWorkspacePageItem[];
  onClose: () => void;
  onPageChange: (pageNumber: number) => void;
  onRemoveToggle: (id: string) => void;
  onToggleSelect: (item: PdfWorkspacePageItem) => void;
  pageNumber: number;
};

function stopButtonClick(event: MouseEvent<HTMLButtonElement>) {
  event.stopPropagation();
}

export function PageSelectionToolbar({
  activeCount,
  onClearSelection,
  onInvertSelection,
  onRestoreAll,
  onSelectAll,
  onSelectEven,
  onSelectOdd,
  removedCount,
  selectedCount,
  totalCount,
}: PageSelectionToolbarProps) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-3 dark:border-white/10 dark:bg-zinc-900 sm:px-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {selectedCount > 0 ? `${selectedCount} pages selected` : "No pages selected"}
          </p>
          <p className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">
            {activeCount} active of {totalCount} pages
            {removedCount > 0 ? ` / ${removedCount} removed from output` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="secondary-button h-9 px-3 text-xs" onClick={onSelectAll} type="button">
            Select all
          </button>
          <button className="secondary-button h-9 px-3 text-xs" onClick={onClearSelection} type="button">
            Clear
          </button>
          <button className="secondary-button h-9 px-3 text-xs" onClick={onSelectOdd} type="button">
            Odd
          </button>
          <button className="secondary-button h-9 px-3 text-xs" onClick={onSelectEven} type="button">
            Even
          </button>
          <button className="secondary-button h-9 px-3 text-xs" onClick={onInvertSelection} type="button">
            Invert
          </button>
          {removedCount > 0 ? (
            <button className="secondary-button h-9 px-3 text-xs" onClick={onRestoreAll} type="button">
              Restore all
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function PageCard({
  index,
  item,
  onMove,
  onPreview,
  onRemoveToggle,
  onToggleSelect,
  reorderEnabled,
  total,
}: {
  index: number;
  item: PdfWorkspacePageItem;
  onMove: (id: string, direction: -1 | 1) => void;
  onPreview: (pageNumber: number) => void;
  onRemoveToggle: (id: string) => void;
  onToggleSelect: (item: PdfWorkspacePageItem, shiftKey: boolean) => void;
  reorderEnabled: boolean;
  total: number;
}) {
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({
    disabled: !reorderEnabled,
    id: item.id,
  });
  const removed = Boolean(item.removed);
  const selected = Boolean(item.selected) && !removed;

  const handleKeyboard = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      onToggleSelect(item, event.shiftKey);
    }
  };

  return (
    <article
      aria-pressed={selected}
      className={[
        "group relative rounded-lg border bg-white p-2 shadow-sm shadow-black/[0.02] transition focus-within:ring-2 focus-within:ring-emerald-500/25 hover:border-zinc-300 dark:bg-zinc-900 dark:hover:border-zinc-600",
        selected ? "border-emerald-500 ring-2 ring-emerald-500/15 dark:border-emerald-500" : "border-zinc-200 dark:border-white/10",
        removed ? "opacity-50" : "",
        isDragging ? "z-10 shadow-lg ring-2 ring-emerald-500/20" : "",
      ].join(" ")}
      onClick={(event) => onToggleSelect(item, event.shiftKey)}
      onKeyDown={handleKeyboard}
      ref={setNodeRef}
      role="button"
      style={{ transform: CSS.Transform.toString(transform), transition }}
      tabIndex={0}
    >
      <div className="absolute left-3 top-3 z-10">
        <span
          className={[
            "flex h-7 w-7 items-center justify-center rounded-md border bg-white text-emerald-600 dark:bg-zinc-950",
            selected ? "border-emerald-500" : "border-zinc-200 text-transparent dark:border-white/10",
          ].join(" ")}
        >
          <Check className="h-4 w-4" />
        </span>
      </div>

      {reorderEnabled ? (
        <button
          aria-label={`Drag page ${item.pageNumber}`}
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-500 transition hover:text-zinc-900 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:text-white"
          onClick={stopButtonClick}
          type="button"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      ) : null}

      <button
        aria-label={`Preview page ${item.pageNumber}`}
        className="block w-full rounded-md bg-zinc-100 p-2 dark:bg-zinc-950"
        onClick={(event) => {
          event.stopPropagation();
          onPreview(item.pageNumber);
        }}
        type="button"
      >
        <img
          alt={`Page ${item.pageNumber}`}
          className="aspect-[1/1.38] w-full rounded border border-zinc-200 bg-white object-cover dark:border-white/10"
          loading="lazy"
          src={item.thumbnail}
        />
      </button>

      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-xs font-semibold text-zinc-700 dark:text-zinc-200">
          Page {item.pageNumber}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          <button
            aria-label={`Open page ${item.pageNumber} preview`}
            className="secondary-button h-8 w-8 p-0"
            onClick={(event) => {
              event.stopPropagation();
              onPreview(item.pageNumber);
            }}
            type="button"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
          <button
            aria-label={removed ? `Restore page ${item.pageNumber}` : `Remove page ${item.pageNumber} from output`}
            className={["secondary-button h-8 w-8 p-0", removed ? "text-emerald-600" : "text-rose-600"].join(" ")}
            onClick={(event) => {
              event.stopPropagation();
              onRemoveToggle(item.id);
            }}
            title={removed ? "Restore page" : "Remove from output"}
            type="button"
          >
            {removed ? <RotateCcw className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {reorderEnabled ? (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            aria-label={`Move page ${item.pageNumber} left`}
            className="secondary-button h-8 px-2 text-xs"
            disabled={index === 0}
            onClick={(event) => {
              event.stopPropagation();
              onMove(item.id, -1);
            }}
            type="button"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
          <button
            aria-label={`Move page ${item.pageNumber} right`}
            className="secondary-button h-8 px-2 text-xs"
            disabled={index === total - 1}
            onClick={(event) => {
              event.stopPropagation();
              onMove(item.id, 1);
            }}
            type="button"
          >
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      {removed ? (
        <p className="mt-2 rounded-md bg-zinc-100 px-2 py-1 text-center text-[11px] font-medium text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
          Removed from output
        </p>
      ) : null}
    </article>
  );
}

export function PdfPageGrid({
  items,
  onMove,
  onPreview,
  onRemoveToggle,
  onReorder,
  onToggleSelect,
  reorderEnabled = false,
}: PdfPageGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
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
    if (oldIndex < 0 || newIndex < 0) {
      return;
    }
    onReorder(arrayMove(items, oldIndex, newIndex));
  };

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd} sensors={sensors}>
      <SortableContext items={items.map((item) => item.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 gap-3 min-[420px]:grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {items.map((item, index) => (
            <PageCard
              index={index}
              item={item}
              key={item.id}
              onMove={onMove}
              onPreview={onPreview}
              onRemoveToggle={onRemoveToggle}
              onToggleSelect={onToggleSelect}
              reorderEnabled={reorderEnabled}
              total={items.length}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

export function PdfPagePreviewModal({
  fileId,
  items,
  onClose,
  onPageChange,
  onRemoveToggle,
  onToggleSelect,
  pageNumber,
}: PdfPagePreviewModalProps) {
  const currentIndex = useMemo(
    () => items.findIndex((item) => item.pageNumber === pageNumber),
    [items, pageNumber],
  );
  const item = currentIndex >= 0 ? items[currentIndex] : null;
  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex >= 0 && currentIndex < items.length - 1;

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
      if (event.key === "ArrowLeft" && canGoPrevious) {
        onPageChange(items[currentIndex - 1].pageNumber);
      }
      if (event.key === "ArrowRight" && canGoNext) {
        onPageChange(items[currentIndex + 1].pageNumber);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canGoNext, canGoPrevious, currentIndex, items, onClose, onPageChange]);

  if (!item) {
    return null;
  }

  const removed = Boolean(item.removed);
  const selected = Boolean(item.selected) && !removed;

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 p-3 sm:p-6"
      role="dialog"
    >
      <div className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-white/10 bg-white shadow-2xl dark:bg-zinc-950">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 px-3 py-3 dark:border-white/10 sm:px-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Page {item.pageNumber}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {selected ? "Selected for output" : removed ? "Removed from output" : "Not selected"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              aria-label="Previous page"
              className="secondary-button h-9 w-9 p-0"
              disabled={!canGoPrevious}
              onClick={() => onPageChange(items[currentIndex - 1].pageNumber)}
              type="button"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              aria-label="Next page"
              className="secondary-button h-9 w-9 p-0"
              disabled={!canGoNext}
              onClick={() => onPageChange(items[currentIndex + 1].pageNumber)}
              type="button"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              className="secondary-button h-9 px-3 text-xs"
              disabled={removed}
              onClick={() => onToggleSelect(item)}
              type="button"
            >
              {selected ? "Unselect" : "Select"}
            </button>
            <button
              className="secondary-button h-9 px-3 text-xs"
              onClick={() => onRemoveToggle(item.id)}
              type="button"
            >
              {removed ? "Restore page" : "Remove from output"}
            </button>
            <button aria-label="Close preview" className="secondary-button h-9 w-9 p-0" onClick={onClose} type="button">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto bg-zinc-100 p-3 dark:bg-zinc-900 sm:p-6">
          <img
            alt={`Preview of page ${item.pageNumber}`}
            className="mx-auto max-h-[calc(100dvh-12rem)] w-auto max-w-full rounded-md border border-zinc-300 bg-white shadow-lg dark:border-white/10"
            src={getPdfPagePreviewUrl(fileId, item.pageNumber, 150)}
          />
        </div>
      </div>
    </div>
  );
}
