"use client";

import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
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
import {
  memo,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";

import {
  WorkspaceCanvas,
  WorkspaceZoomControls,
  type WorkspaceZoomLevel,
} from "@/components/workspace/WorkspaceCanvas";

export type PageGridItem = {
  currentIndex: number;
  id: string;
  loadState: "idle" | "loading" | "loaded" | "error";
  originalPageNumber: number;
  pageNumber: number;
  previewUrl?: string;
  removed: boolean;
  rotation?: 0 | 90 | 180 | 270;
  selected: boolean;
  thumbnail: string;
  thumbnailUrl: string;
};

export type PageGridPreviewLabels = {
  currentPositionLabel?: (item: PageGridItem, position: number) => string;
  pageLabel?: (item: PageGridItem) => string;
};

type PageGridWorkspaceProps = {
  dragDisabledReason?: string;
  dragEnabled?: boolean;
  items: PageGridItem[];
  largeDocumentThreshold?: number;
  onItemsChange: (items: PageGridItem[]) => void;
  previewLabels?: PageGridPreviewLabels;
  removedNotice?: string;
  summary?: ReactNode;
};

type PageCardProps = {
  dragEnabled: boolean;
  index: number;
  item: PageGridItem;
  onMove: (id: string, direction: -1 | 1) => void;
  onPreview: (id: string) => void;
  onRemoveToggle: (id: string) => void;
  onToggleSelect: (item: PageGridItem, shiftKey: boolean) => void;
  total: number;
};

function activeItems(items: PageGridItem[]) {
  return items.filter((item) => !item.removed);
}

function selectedActiveItems(items: PageGridItem[]) {
  return items.filter((item) => item.selected && !item.removed);
}

function orderedWithCurrentIndex(items: PageGridItem[]) {
  return items.map((item, index) => ({ ...item, currentIndex: index }));
}

function stopControlClick(event: MouseEvent<HTMLElement>) {
  event.stopPropagation();
}

function ThumbnailImage({
  alt,
  className,
  src,
  style,
}: {
  alt: string;
  className: string;
  src: string;
  style?: CSSProperties;
}) {
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  if (failed) {
    return (
      <div className="flex aspect-[1/1.38] h-full w-full flex-col items-center justify-center gap-2 rounded border border-dashed border-zinc-300 bg-zinc-50 px-2 text-center text-xs font-medium text-zinc-500 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-400">
        <span>Thumbnail failed</span>
        <button
          className="secondary-button h-8 px-2 text-xs"
          onClick={(event) => {
            event.stopPropagation();
            setFailed(false);
            setReloadKey((current) => current + 1);
          }}
          type="button"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <img
      alt={alt}
      className={className}
      key={reloadKey}
      loading="lazy"
      onError={() => setFailed(true)}
      src={src}
      style={style}
    />
  );
}

function PageCardBase({
  dragEnabled,
  index,
  item,
  onMove,
  onPreview,
  onRemoveToggle,
  onToggleSelect,
  total,
}: PageCardProps) {
  const removed = item.removed;
  const selected = item.selected && !removed;
  const sortableEnabled = dragEnabled && !removed;
  const { attributes, isDragging, listeners, setActivatorNodeRef, setNodeRef, transform, transition } = useSortable({
    disabled: !sortableEnabled,
    id: item.id,
  });

  const handleKeyboard = (event: KeyboardEvent<HTMLElement>) => {
    if (removed) {
      return;
    }
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      onToggleSelect(item, event.shiftKey);
    }
  };

  return (
    <article
      aria-label={`Page ${item.originalPageNumber}`}
      aria-pressed={selected}
      className={[
        "group relative rounded-lg border bg-white p-2 shadow-sm shadow-black/[0.02] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/30 dark:bg-zinc-900",
        selected ? "border-emerald-600 ring-2 ring-emerald-600/15 dark:border-emerald-700" : "border-zinc-200 dark:border-white/10",
        removed ? "opacity-55" : "hover:border-zinc-300 dark:hover:border-zinc-600",
        isDragging ? "z-10 opacity-70 shadow-lg ring-2 ring-emerald-600/20" : "",
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
            "flex h-7 w-7 items-center justify-center rounded-md border bg-white text-emerald-700 dark:bg-zinc-950 dark:text-emerald-400",
            selected ? "border-emerald-600" : "border-zinc-200 text-transparent dark:border-white/10",
          ].join(" ")}
        >
          <Check className="h-4 w-4" />
        </span>
      </div>

      {dragEnabled ? (
        <button
          aria-label={removed ? `Restore page ${item.originalPageNumber} before dragging` : `Drag page ${item.originalPageNumber}`}
          className={[
            "absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-md border bg-white transition dark:bg-zinc-950",
            removed
              ? "cursor-not-allowed border-zinc-200 text-zinc-300 dark:border-white/10 dark:text-zinc-700"
              : "border-zinc-200 text-zinc-500 hover:text-zinc-900 dark:border-white/10 dark:text-zinc-300 dark:hover:text-white",
          ].join(" ")}
          disabled={removed}
          onClick={stopControlClick}
          ref={setActivatorNodeRef}
          type="button"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      ) : null}

      <button
        aria-label={`Preview page ${item.originalPageNumber}`}
        className="block w-full rounded-md bg-zinc-100 p-2 dark:bg-zinc-950"
        onClick={(event) => {
          event.stopPropagation();
          onPreview(item.id);
        }}
        type="button"
      >
        <ThumbnailImage
          alt={`Page ${item.originalPageNumber}`}
          className="aspect-[1/1.38] w-full rounded border border-zinc-200 bg-white object-cover dark:border-white/10"
          src={item.thumbnailUrl}
          style={item.rotation ? { transform: `rotate(${item.rotation}deg)` } : undefined}
        />
      </button>

      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <span className="block truncate text-xs font-semibold text-zinc-700 dark:text-zinc-200">
            Page {item.originalPageNumber}
          </span>
          <span className="block text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
            Position {index + 1}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            aria-label={`Open page ${item.originalPageNumber} preview`}
            className="secondary-button h-8 w-8 p-0"
            onClick={(event) => {
              event.stopPropagation();
              onPreview(item.id);
            }}
            type="button"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
          <button
            aria-label={removed ? `Restore page ${item.originalPageNumber}` : `Remove page ${item.originalPageNumber} from output`}
            className={["secondary-button h-8 w-8 p-0", removed ? "text-emerald-700 dark:text-emerald-400" : "text-rose-600"].join(" ")}
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

      {dragEnabled ? (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            aria-label={`Move page ${item.originalPageNumber} left`}
            className="secondary-button h-8 px-2 text-xs"
            disabled={index === 0 || removed}
            onClick={(event) => {
              event.stopPropagation();
              onMove(item.id, -1);
            }}
            type="button"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
          <button
            aria-label={`Move page ${item.originalPageNumber} right`}
            className="secondary-button h-8 px-2 text-xs"
            disabled={index === total - 1 || removed}
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

const PageCard = memo(PageCardBase);

function PageDragPreview({ item }: { item: PageGridItem }) {
  return (
    <div className="w-[180px] rounded-lg border border-emerald-600 bg-white p-2 shadow-2xl shadow-black/20 dark:bg-zinc-900">
      <ThumbnailImage
        alt={`Dragging page ${item.originalPageNumber}`}
        className="aspect-[1/1.38] w-full rounded border border-zinc-200 bg-white object-cover dark:border-white/10"
        src={item.thumbnailUrl}
      />
      <p className="mt-2 text-center text-xs font-semibold text-zinc-700 dark:text-zinc-200">
        Page {item.originalPageNumber}
      </p>
    </div>
  );
}

function PageSelectionToolbar({
  activeCount,
  dragDisabledReason,
  dragEnabled,
  onClearSelection,
  onInvertSelection,
  onRestoreAll,
  onSelectAll,
  onSelectEven,
  onSelectOdd,
  onZoomChange,
  removedCount,
  selectedCount,
  totalCount,
  zoomLevel,
}: {
  activeCount: number;
  dragDisabledReason?: string;
  dragEnabled: boolean;
  onClearSelection: () => void;
  onInvertSelection: () => void;
  onRestoreAll: () => void;
  onSelectAll: () => void;
  onSelectEven: () => void;
  onSelectOdd: () => void;
  onZoomChange: (value: WorkspaceZoomLevel) => void;
  removedCount: number;
  selectedCount: number;
  totalCount: number;
  zoomLevel: WorkspaceZoomLevel;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {selectedCount > 0 ? `${selectedCount} pages selected` : "No pages selected"}
        </p>
        <p className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">
          {activeCount} active of {totalCount} pages
          {removedCount > 0 ? ` / ${removedCount} removed from output` : ""}
          {" / "}
          {dragEnabled ? "Drag enabled" : dragDisabledReason ?? "Drag disabled"}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
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
        <WorkspaceZoomControls onChange={onZoomChange} value={zoomLevel} />
      </div>
    </div>
  );
}

function PagePreviewModal({
  items,
  labels,
  onClose,
  onItemsChange,
  onPageChange,
  pageId,
}: {
  items: PageGridItem[];
  labels?: PageGridPreviewLabels;
  onClose: () => void;
  onItemsChange: (items: PageGridItem[]) => void;
  onPageChange: (id: string) => void;
  pageId: string;
}) {
  const currentIndex = useMemo(() => items.findIndex((item) => item.id === pageId), [items, pageId]);
  const item = currentIndex >= 0 ? items[currentIndex] : null;
  const [failedPageId, setFailedPageId] = useState<string | null>(null);
  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex >= 0 && currentIndex < items.length - 1;

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
      if (event.key === "ArrowLeft" && canGoPrevious) {
        onPageChange(items[currentIndex - 1].id);
      }
      if (event.key === "ArrowRight" && canGoNext) {
        onPageChange(items[currentIndex + 1].id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canGoNext, canGoPrevious, currentIndex, items, onClose, onPageChange]);

  if (!item) {
    return null;
  }

  const removed = item.removed;
  const selected = item.selected && !removed;
  const failed = failedPageId === pageId;
  const pageLabel = labels?.pageLabel?.(item) ?? `Page ${item.originalPageNumber}`;
  const positionLabel = labels?.currentPositionLabel?.(item, currentIndex + 1) ?? `Position ${currentIndex + 1}`;

  const toggleSelection = () => {
    if (removed) {
      return;
    }
    onItemsChange(items.map((candidate) => candidate.id === item.id ? { ...candidate, selected: !candidate.selected } : candidate));
  };

  const toggleRemoved = () => {
    onItemsChange(
      items.map((candidate) =>
        candidate.id === item.id
          ? { ...candidate, removed: !candidate.removed, selected: candidate.removed ? candidate.selected : false }
          : candidate,
      ),
    );
  };

  return (
    <div
      aria-label={`${pageLabel} preview`}
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 p-3 sm:p-6"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-white/10 bg-white shadow-2xl dark:bg-zinc-950"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 px-3 py-3 dark:border-white/10 sm:px-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{pageLabel}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {positionLabel} / {selected ? "Selected for output" : removed ? "Removed from output" : "Not selected"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              aria-label="Previous page"
              className="secondary-button h-9 w-9 p-0"
              disabled={!canGoPrevious}
              onClick={() => onPageChange(items[currentIndex - 1].id)}
              type="button"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              aria-label="Next page"
              className="secondary-button h-9 w-9 p-0"
              disabled={!canGoNext}
              onClick={() => onPageChange(items[currentIndex + 1].id)}
              type="button"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              className="secondary-button h-9 px-3 text-xs"
              disabled={removed}
              onClick={toggleSelection}
              type="button"
            >
              {selected ? "Unselect" : "Select"}
            </button>
            <button className="secondary-button h-9 px-3 text-xs" onClick={toggleRemoved} type="button">
              {removed ? "Restore page" : "Remove from output"}
            </button>
            <button aria-label="Close preview" className="secondary-button h-9 w-9 p-0" onClick={onClose} type="button">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto bg-zinc-100 p-3 dark:bg-zinc-900 sm:p-6">
          {failed ? (
            <div className="mx-auto max-w-md rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium leading-6 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
              Preview could not be loaded. You can still process this page.
            </div>
          ) : (
            <img
              alt={`Preview of ${pageLabel}`}
              className="mx-auto max-h-[calc(100dvh-12rem)] w-auto max-w-full rounded-md border border-zinc-300 bg-white shadow-lg dark:border-white/10"
              onError={() => setFailedPageId(pageId)}
              src={item.previewUrl || item.thumbnailUrl}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export function PageGridWorkspace({
  dragDisabledReason,
  dragEnabled = true,
  items,
  largeDocumentThreshold = 100,
  onItemsChange,
  previewLabels,
  removedNotice = "Removed pages are excluded from the new file. Your original PDF is not changed.",
  summary,
}: PageGridWorkspaceProps) {
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<WorkspaceZoomLevel>(100);
  const active = activeItems(items);
  const selected = selectedActiveItems(items);
  const removedCount = items.length - active.length;
  const activeDragItem = activeDragId ? items.find((item) => item.id === activeDragId) : null;
  const cardWidth = Math.round(148 + (zoomLevel - 50) * 1.08);
  const gridStyle: CSSProperties = {
    gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${cardWidth}px), 1fr))`,
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const updateItems = (nextItems: PageGridItem[]) => {
    onItemsChange(orderedWithCurrentIndex(nextItems));
  };

  const setSelection = (predicate: (item: PageGridItem) => boolean) => {
    updateItems(items.map((item) => ({ ...item, selected: !item.removed && predicate(item) })));
  };

  const toggleSelection = (item: PageGridItem, shiftKey: boolean) => {
    if (item.removed) {
      return;
    }
    if (shiftKey && lastSelectedId) {
      const currentIndex = items.findIndex((candidate) => candidate.id === item.id);
      const previousIndex = items.findIndex((candidate) => candidate.id === lastSelectedId);
      if (currentIndex >= 0 && previousIndex >= 0) {
        const start = Math.min(currentIndex, previousIndex);
        const end = Math.max(currentIndex, previousIndex);
        updateItems(
          items.map((candidate, index) => ({
            ...candidate,
            selected: candidate.removed ? false : index >= start && index <= end ? true : candidate.selected,
          })),
        );
        setLastSelectedId(item.id);
        return;
      }
    }
    updateItems(
      items.map((candidate) =>
        candidate.id === item.id ? { ...candidate, selected: !candidate.selected } : candidate,
      ),
    );
    setLastSelectedId(item.id);
  };

  const toggleRemoved = (id: string) => {
    updateItems(
      items.map((item) =>
        item.id === id
          ? { ...item, removed: !item.removed, selected: item.removed ? item.selected : false }
          : item,
      ),
    );
  };

  const movePage = (id: string, direction: -1 | 1) => {
    const index = items.findIndex((item) => item.id === id);
    const item = items[index];
    const nextIndex = index + direction;
    if (!item || item.removed || index < 0 || nextIndex < 0 || nextIndex >= items.length) {
      return;
    }
    updateItems(arrayMove(items, index, nextIndex));
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active: activeDrag, over } = event;
    setActiveDragId(null);
    if (!over || activeDrag.id === over.id) {
      return;
    }
    const oldIndex = items.findIndex((item) => item.id === activeDrag.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    if (oldIndex < 0 || newIndex < 0 || items[oldIndex]?.removed) {
      return;
    }
    updateItems(arrayMove(items, oldIndex, newIndex));
  };

  return (
    <WorkspaceCanvas
      summary={
        <div className="space-y-2">
          {summary}
          {removedCount > 0 ? (
            <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs leading-5 text-zinc-500 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-400">
              {removedNotice}
            </div>
          ) : null}
          {items.length > largeDocumentThreshold ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
              Large PDF detected. Thumbnails may load gradually.
            </div>
          ) : null}
        </div>
      }
      toolbar={
        <PageSelectionToolbar
          activeCount={active.length}
          dragDisabledReason={dragDisabledReason}
          dragEnabled={dragEnabled}
          onClearSelection={() => setSelection(() => false)}
          onInvertSelection={() => updateItems(items.map((item) => ({ ...item, selected: item.removed ? false : !item.selected })))}
          onRestoreAll={() => updateItems(items.map((item) => ({ ...item, removed: false })))}
          onSelectAll={() => setSelection(() => true)}
          onSelectEven={() => setSelection((item) => item.originalPageNumber % 2 === 0)}
          onSelectOdd={() => setSelection((item) => item.originalPageNumber % 2 === 1)}
          onZoomChange={setZoomLevel}
          removedCount={removedCount}
          selectedCount={selected.length}
          totalCount={items.length}
          zoomLevel={zoomLevel}
        />
      }
    >
      {items.length > 0 ? (
        <DndContext
          collisionDetection={closestCenter}
          onDragCancel={() => setActiveDragId(null)}
          onDragEnd={handleDragEnd}
          onDragStart={handleDragStart}
          sensors={sensors}
        >
          <SortableContext items={items.map((item) => item.id)} strategy={rectSortingStrategy}>
            <div className="grid min-w-0 gap-3" style={gridStyle}>
              {items.map((item, index) => (
                <PageCard
                  dragEnabled={dragEnabled}
                  index={index}
                  item={item}
                  key={item.id}
                  onMove={movePage}
                  onPreview={setPreviewId}
                  onRemoveToggle={toggleRemoved}
                  onToggleSelect={toggleSelection}
                  total={items.length}
                />
              ))}
            </div>
          </SortableContext>
          <DragOverlay>{activeDragItem ? <PageDragPreview item={activeDragItem} /> : null}</DragOverlay>
        </DndContext>
      ) : (
        <div className="rounded-lg border border-dashed border-zinc-200 bg-white p-6 text-center text-sm text-zinc-500 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-400">
          Loading page thumbnails...
        </div>
      )}
      {previewId ? (
        <PagePreviewModal
          items={items}
          labels={previewLabels}
          onClose={() => setPreviewId(null)}
          onItemsChange={updateItems}
          onPageChange={setPreviewId}
          pageId={previewId}
        />
      ) : null}
    </WorkspaceCanvas>
  );
}
