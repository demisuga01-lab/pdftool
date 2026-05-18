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
  Loader2,
  RotateCcw,
  X,
} from "lucide-react";
import {
  memo,
  useCallback,
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

// ---------------------------------------------------------------------------
// Generic GridWorkspace<T>
// ---------------------------------------------------------------------------
// This is the shared engine used by the page grid, the merge file grid, and
// the image grids. It provides:
//   - dnd-kit reorder with a drag activator on a dedicated handle
//   - selection (single, shift-range), removed/restored state
//   - arrow-left / arrow-right keyboard order changes
//   - an optional fullscreen preview modal driven by previewUrl/thumbnailUrl
//   - a card-width zoom slider that only resizes the grid items
// ---------------------------------------------------------------------------

export type GridWorkspaceItemBase = {
  id: string;
  removed?: boolean;
  selected?: boolean;
  previewUrl?: string;
  thumbnailUrl?: string;
};

export type GridWorkspacePreviewLabels<T> = {
  pageLabel?: (item: T) => string;
  currentPositionLabel?: (item: T, position: number) => string;
};

type GridWorkspaceCardArgs<T> = {
  dragEnabled: boolean;
  index: number;
  item: T;
  total: number;
  // dnd-kit wiring the caller MUST spread on the card root + drag handle.
  attributes: ReturnType<typeof useSortable>["attributes"];
  listeners: ReturnType<typeof useSortable>["listeners"];
  setNodeRef: (node: HTMLElement | null) => void;
  setActivatorNodeRef: (node: HTMLElement | null) => void;
  style: CSSProperties;
  isDragging: boolean;
  // selection helpers
  onClick: (event: MouseEvent<HTMLElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  onMove: (direction: -1 | 1) => void;
  onPreview?: () => void;
  onRemoveToggle?: () => void;
};

export type GridWorkspaceCardRenderer<T> = (args: GridWorkspaceCardArgs<T>) => ReactNode;

export type GridWorkspaceDragPreview<T> = (item: T) => ReactNode;

type GridWorkspaceProps<T extends GridWorkspaceItemBase> = {
  cardWidth?: (zoom: WorkspaceZoomLevel) => number;
  defaultZoom?: WorkspaceZoomLevel;
  dragDisabledReason?: string;
  dragEnabled?: boolean;
  items: T[];
  largeDocumentThreshold?: number;
  onItemsChange: (items: T[]) => void;
  previewLabels?: GridWorkspacePreviewLabels<T>;
  removedNotice?: string;
  showPreviewModal?: boolean;
  showRemoveAction?: boolean;
  summary?: ReactNode;
  toolbarExtras?: ReactNode;
  renderCard: GridWorkspaceCardRenderer<T>;
  renderDragPreview?: GridWorkspaceDragPreview<T>;
};

// ---------------------------------------------------------------------------
// Page-grid specific item shape (PDF Split / Rotate)
// ---------------------------------------------------------------------------

export type PageGridItem = GridWorkspaceItemBase & {
  currentIndex: number;
  loadState: "idle" | "loading" | "loaded" | "error";
  originalPageNumber: number;
  pageNumber: number;
  removed: boolean;
  rotation?: 0 | 90 | 180 | 270;
  selected: boolean;
  thumbnail: string;
  thumbnailUrl: string;
};

export type PageGridPreviewLabels = GridWorkspacePreviewLabels<PageGridItem>;

type PageGridWorkspaceProps = {
  dragDisabledReason?: string;
  dragEnabled?: boolean;
  items: PageGridItem[];
  largeDocumentThreshold?: number;
  onItemsChange: (items: PageGridItem[]) => void;
  previewLabels?: PageGridPreviewLabels;
  removedNotice?: string;
  summary?: ReactNode;
  renderCardOverlay?: (item: PageGridItem, index: number) => ReactNode;
};

function activeItemsBase<T extends GridWorkspaceItemBase>(items: T[]) {
  return items.filter((item) => !item.removed);
}

function selectedActiveItems(items: PageGridItem[]) {
  return items.filter((item) => item.selected && !item.removed);
}

function stopControlClick(event: MouseEvent<HTMLElement>) {
  event.stopPropagation();
}

// ---------------------------------------------------------------------------
// Shared thumbnail with retry + loading
// ---------------------------------------------------------------------------

export function GridThumbnail({
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
  const [state, setState] = useState<"loading" | "loaded" | "failed">(src ? "loading" : "failed");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setState(src ? "loading" : "failed");
  }, [src, reloadKey]);

  if (state === "failed") {
    return (
      <div className="flex aspect-[1/1.38] h-full w-full flex-col items-center justify-center gap-2 rounded border border-dashed border-zinc-300 bg-zinc-50 px-2 text-center text-xs font-medium text-zinc-500 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-400">
        <span>Thumbnail failed</span>
        <button
          className="secondary-button h-8 px-2 text-xs"
          onClick={(event) => {
            event.stopPropagation();
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
    <div className="relative h-full w-full">
      {state === "loading" ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded bg-zinc-100 text-zinc-400 dark:bg-zinc-950 dark:text-zinc-600">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : null}
      <img
        alt={alt}
        className={className}
        key={reloadKey}
        loading="lazy"
        onError={() => setState("failed")}
        onLoad={() => setState("loaded")}
        src={src}
        style={style}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Generic preview modal
// ---------------------------------------------------------------------------

const PREVIEW_ZOOM_MIN = 50;
const PREVIEW_ZOOM_MAX = 300;
const PREVIEW_ZOOM_STEP = 25;

function PreviewImage({ alt, src, zoom }: { alt: string; src: string | undefined; zoom: number }) {
  const [state, setState] = useState<"loading" | "loaded" | "failed">(src ? "loading" : "failed");

  if (!src || state === "failed") {
    return (
      <div className="mx-auto max-w-md rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium leading-6 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
        {src ? "Preview could not be loaded. You can still process this item." : "No preview available for this item."}
      </div>
    );
  }

  return (
    <div className="relative mx-auto flex w-fit min-w-0 items-start justify-center">
      {state === "loading" ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 rounded-md bg-zinc-100 text-sm font-medium text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading preview…
        </div>
      ) : null}
      <img
        alt={alt}
        className="mx-auto block bg-white shadow-md"
        onError={() => setState("failed")}
        onLoad={() => {
          setState("loaded");
        }}
        src={src}
        style={{
          maxWidth: zoom <= 100 ? "100%" : "none",
          transition: "width 0.15s ease",
          width: `${zoom}%`,
        }}
      />
    </div>
  );
}

function GenericPreviewModal<T extends GridWorkspaceItemBase>({
  items,
  labels,
  onClose,
  onItemsChange,
  onPageChange,
  pageId,
  showRemoveAction,
}: {
  items: T[];
  labels?: GridWorkspacePreviewLabels<T>;
  onClose: () => void;
  onItemsChange: (items: T[]) => void;
  onPageChange: (id: string) => void;
  pageId: string;
  showRemoveAction: boolean;
}) {
  const currentIndex = useMemo(() => items.findIndex((item) => item.id === pageId), [items, pageId]);
  const item = currentIndex >= 0 ? items[currentIndex] : null;
  const [previewZoom, setPreviewZoom] = useState(100);
  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex >= 0 && currentIndex < items.length - 1;
  const closeModal = useCallback(() => {
    setPreviewZoom(100);
    onClose();
  }, [onClose]);
  const goPrevious = useCallback(() => {
    if (!canGoPrevious) {
      return;
    }
    setPreviewZoom(100);
    onPageChange(items[currentIndex - 1].id);
  }, [canGoPrevious, currentIndex, items, onPageChange]);
  const goNext = useCallback(() => {
    if (!canGoNext) {
      return;
    }
    setPreviewZoom(100);
    onPageChange(items[currentIndex + 1].id);
  }, [canGoNext, currentIndex, items, onPageChange]);

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        closeModal();
      }
      if (event.key === "ArrowLeft" && canGoPrevious) {
        goPrevious();
      }
      if (event.key === "ArrowRight" && canGoNext) {
        goNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canGoNext, canGoPrevious, closeModal, goNext, goPrevious]);

  if (!item) {
    return null;
  }

  const removed = Boolean(item.removed);
  const selected = Boolean(item.selected) && !removed;
  const pageLabel = labels?.pageLabel?.(item) ?? `Item ${currentIndex + 1}`;
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

  const previewSrc = item.previewUrl || item.thumbnailUrl;

  return (
    <div
      aria-label={`${pageLabel} preview`}
      aria-modal="true"
      className="fixed inset-0 z-[200] flex items-center justify-center bg-zinc-950/80 p-4"
      onClick={closeModal}
      role="dialog"
    >
      <div
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex min-w-0 items-center gap-3">
            <button
              aria-label="Previous"
              className="secondary-button h-9 w-9 p-0"
              disabled={!canGoPrevious}
              onClick={goPrevious}
              type="button"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="truncate text-sm text-zinc-600 dark:text-zinc-400">
              {positionLabel} · {selected ? "Selected" : "Not selected"}
            </span>
            <button
              aria-label="Next"
              className="secondary-button h-9 w-9 p-0"
              disabled={!canGoNext}
              onClick={goNext}
              type="button"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              className="secondary-button h-9 px-3 text-xs"
              disabled={removed}
              onClick={toggleSelection}
              type="button"
            >
              {selected ? "Deselect" : "Select"}
            </button>
            {showRemoveAction ? (
              <button className="secondary-button h-9 px-3 text-xs" onClick={toggleRemoved} type="button">
                {removed ? "Restore" : "Remove from output"}
              </button>
            ) : null}
            <button aria-label="Close preview" className="secondary-button h-9 w-9 p-0" onClick={closeModal} type="button">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-zinc-100 p-6 dark:bg-zinc-900">
          <PreviewImage alt={`Preview of ${pageLabel}`} key={pageId} src={previewSrc} zoom={previewZoom} />
        </div>

        <div className="flex items-center justify-center gap-3 border-t border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
          <button
            aria-label="Zoom out"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-sm hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700"
            disabled={previewZoom <= PREVIEW_ZOOM_MIN}
            onClick={() => setPreviewZoom((zoom) => Math.max(PREVIEW_ZOOM_MIN, zoom - PREVIEW_ZOOM_STEP))}
            type="button"
          >
            -
          </button>
          <button
            aria-label="Reset zoom"
            className="min-w-[4rem] rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs tabular-nums text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
            onClick={() => setPreviewZoom(100)}
            type="button"
          >
            {previewZoom}%
          </button>
          <button
            aria-label="Zoom in"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-sm hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700"
            disabled={previewZoom >= PREVIEW_ZOOM_MAX}
            onClick={() => setPreviewZoom((zoom) => Math.min(PREVIEW_ZOOM_MAX, zoom + PREVIEW_ZOOM_STEP))}
            type="button"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Selection toolbar (page-grid specific helpers + zoom)
// ---------------------------------------------------------------------------

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
  removedCount,
  selectedCount,
  totalCount,
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
  removedCount: number;
  selectedCount: number;
  totalCount: number;
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
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SortableCardWrapper — connects renderCard to dnd-kit
// ---------------------------------------------------------------------------

type SortableCardWrapperProps<T extends GridWorkspaceItemBase> = {
  dragEnabled: boolean;
  index: number;
  item: T;
  onMove: (id: string, direction: -1 | 1) => void;
  onPreview?: (id: string) => void;
  onRemoveToggle?: (id: string) => void;
  onClickItem: (item: T, shiftKey: boolean) => void;
  total: number;
  renderCard: GridWorkspaceCardRenderer<T>;
};

function SortableCardWrapperBase<T extends GridWorkspaceItemBase>({
  dragEnabled,
  index,
  item,
  onMove,
  onPreview,
  onRemoveToggle,
  onClickItem,
  total,
  renderCard,
}: SortableCardWrapperProps<T>) {
  const sortableEnabled = dragEnabled && !item.removed;
  const { attributes, isDragging, listeners, setActivatorNodeRef, setNodeRef, transform, transition } = useSortable({
    disabled: !sortableEnabled,
    id: item.id,
  });

  const onClick = (event: MouseEvent<HTMLElement>) => onClickItem(item, event.shiftKey);
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (item.removed) {
      return;
    }
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      onClickItem(item, event.shiftKey);
    }
  };

  const style: CSSProperties = { transform: CSS.Transform.toString(transform), transition };

  return (
    <>
      {renderCard({
        attributes,
        dragEnabled,
        index,
        isDragging,
        item,
        listeners: listeners ?? {},
        onClick,
        onKeyDown,
        onMove: (direction) => onMove(item.id, direction),
        onPreview: onPreview ? () => onPreview(item.id) : undefined,
        onRemoveToggle: onRemoveToggle ? () => onRemoveToggle(item.id) : undefined,
        setActivatorNodeRef,
        setNodeRef,
        style,
        total,
      })}
    </>
  );
}

const SortableCardWrapper = memo(SortableCardWrapperBase) as <T extends GridWorkspaceItemBase>(props: SortableCardWrapperProps<T>) => ReactNode;

// ---------------------------------------------------------------------------
// GridWorkspace<T> — the generic shell
// ---------------------------------------------------------------------------

export function GridWorkspace<T extends GridWorkspaceItemBase>({
  cardWidth,
  defaultZoom = 100,
  dragDisabledReason,
  dragEnabled = true,
  items,
  largeDocumentThreshold = 100,
  onItemsChange,
  previewLabels,
  removedNotice,
  showPreviewModal = true,
  showRemoveAction = true,
  summary,
  toolbarExtras,
  renderCard,
  renderDragPreview,
}: GridWorkspaceProps<T>) {
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<WorkspaceZoomLevel>(defaultZoom);

  const active = activeItemsBase(items);
  const removedCount = items.length - active.length;
  const selectedCount = items.filter((item) => item.selected && !item.removed).length;
  const activeDragItem = activeDragId ? items.find((item) => item.id === activeDragId) : null;

  const widthForZoom = cardWidth ?? ((zoom: WorkspaceZoomLevel) => Math.round(170 + (zoom - 100) * 1.2));
  const computedWidth = widthForZoom(zoomLevel);
  const gridStyle: CSSProperties = {
    display: "grid",
    gap: "12px",
    gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${computedWidth}px), 1fr))`,
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const updateItems = (next: T[]) => onItemsChange(next);

  const setSelection = (predicate: (item: T) => boolean) => {
    updateItems(items.map((item) => ({ ...item, selected: !item.removed && predicate(item) })));
  };

  const toggleSelection = (item: T, shiftKey: boolean) => {
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

  const handleDragStart = (event: DragStartEvent) => setActiveDragId(String(event.active.id));

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
          {removedCount > 0 && removedNotice ? (
            <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs leading-5 text-zinc-500 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-400">
              {removedNotice}
            </div>
          ) : null}
          {items.length > largeDocumentThreshold ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
              Large document detected. Thumbnails may load gradually.
            </div>
          ) : null}
        </div>
      }
      toolbar={
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              {toolbarExtras ?? (
                <p className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                  {active.length} active of {items.length}
                  {removedCount > 0 ? ` / ${removedCount} removed` : ""}
                  {selectedCount > 0 ? ` / ${selectedCount} selected` : ""}
                  {" / "}
                  {dragEnabled ? "Drag enabled" : dragDisabledReason ?? "Drag disabled"}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-zinc-200 pt-3 dark:border-white/10">
            <span className="mr-auto text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500">
              Card size
            </span>
            <WorkspaceZoomControls onChange={setZoomLevel} value={zoomLevel} />
          </div>
        </div>
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
            <div className="min-w-0" style={gridStyle}>
              {items.map((item, index) => (
                <SortableCardWrapper<T>
                  dragEnabled={dragEnabled}
                  index={index}
                  item={item}
                  key={item.id}
                  onClickItem={toggleSelection}
                  onMove={movePage}
                  onPreview={showPreviewModal ? setPreviewId : undefined}
                  onRemoveToggle={showRemoveAction ? toggleRemoved : undefined}
                  renderCard={renderCard}
                  total={items.length}
                />
              ))}
            </div>
          </SortableContext>
          <DragOverlay>
            {activeDragItem && renderDragPreview ? renderDragPreview(activeDragItem) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <div className="rounded-lg border border-dashed border-zinc-200 bg-white p-6 text-center text-sm text-zinc-500 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-400">
          Loading thumbnails…
        </div>
      )}
      {showPreviewModal && previewId ? (
        <GenericPreviewModal<T>
          items={items}
          labels={previewLabels}
          onClose={() => setPreviewId(null)}
          onItemsChange={updateItems}
          onPageChange={setPreviewId}
          pageId={previewId}
          showRemoveAction={showRemoveAction}
        />
      ) : null}
    </WorkspaceCanvas>
  );
}

// ---------------------------------------------------------------------------
// Default page-grid card (Split / Rotate)
// ---------------------------------------------------------------------------

function PageCard({
  args,
  cardOverlay,
}: {
  args: GridWorkspaceCardArgs<PageGridItem>;
  cardOverlay?: ReactNode;
}) {
  const { attributes, dragEnabled, index, isDragging, item, listeners, onClick, onKeyDown, onMove, onPreview, onRemoveToggle, setActivatorNodeRef, setNodeRef, style, total } = args;
  const removed = item.removed;
  const selected = item.selected && !removed;
  const rotation = item.rotation ?? 0;
  const rotatedSideways = rotation % 180 !== 0;

  return (
    <article
      aria-label={`Page ${item.originalPageNumber}`}
      aria-pressed={selected}
      className={[
        "group relative rounded-lg border bg-white p-2 shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/30 dark:bg-zinc-900",
        selected ? "border-emerald-600 ring-2 ring-emerald-600/15 dark:border-emerald-700" : "border-zinc-200 dark:border-white/10",
        removed ? "opacity-55" : "hover:border-zinc-300 dark:hover:border-zinc-600",
        isDragging ? "z-10 opacity-70 shadow-md ring-2 ring-emerald-600/20" : "",
      ].join(" ")}
      onClick={onClick}
      onKeyDown={onKeyDown}
      ref={setNodeRef}
      role="button"
      style={style}
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
            "absolute right-3 top-3 z-10 flex h-9 w-9 cursor-grab items-center justify-center rounded-md border bg-white transition active:cursor-grabbing dark:bg-zinc-950",
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
          onPreview?.();
        }}
        type="button"
      >
        <div
          style={{
            alignItems: "center",
            aspectRatio: "1 / 1",
            display: "flex",
            justifyContent: "center",
            overflow: "hidden",
            position: "relative",
            width: "100%",
          }}
        >
          <GridThumbnail
            alt={`Page ${item.originalPageNumber}`}
            className="rounded border border-zinc-200 bg-white object-contain dark:border-white/10"
            src={item.thumbnailUrl}
            style={{
              height: rotatedSideways ? "100%" : "auto",
              maxHeight: "100%",
              maxWidth: rotatedSideways ? "none" : "100%",
              objectFit: "contain",
              transform: `rotate(${rotation}deg)`,
              transformOrigin: "center center",
              transition: "transform 0.2s ease",
              width: rotatedSideways ? "auto" : "100%",
            }}
          />
        </div>
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
              onPreview?.();
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
              onRemoveToggle?.();
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
              onMove(-1);
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
              onMove(1);
            }}
            type="button"
          >
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      {cardOverlay}

      {removed ? (
        <p className="mt-2 rounded-md bg-zinc-100 px-2 py-1 text-center text-[11px] font-medium text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
          Removed from output
        </p>
      ) : null}
    </article>
  );
}

function PageDragPreview({ item }: { item: PageGridItem }) {
  return (
    <div className="w-[180px] rounded-lg border border-emerald-600 bg-white p-2 shadow-xl dark:bg-zinc-900">
      <GridThumbnail
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

// ---------------------------------------------------------------------------
// PageGridWorkspace — the Split/Rotate-friendly wrapper
// ---------------------------------------------------------------------------

export function PageGridWorkspace({
  dragDisabledReason,
  dragEnabled = true,
  items,
  largeDocumentThreshold = 100,
  onItemsChange,
  previewLabels,
  removedNotice = "Removed pages are excluded from the new file. Your original PDF is not changed.",
  summary,
  renderCardOverlay,
}: PageGridWorkspaceProps) {
  const orderedWithIndex = (next: PageGridItem[]): PageGridItem[] =>
    next.map((item, index) => ({ ...item, currentIndex: index }));

  const setSelection = (predicate: (item: PageGridItem) => boolean) => {
    onItemsChange(orderedWithIndex(items.map((item) => ({ ...item, selected: !item.removed && predicate(item) }))));
  };

  const removedCount = items.length - items.filter((item) => !item.removed).length;
  const selectedCount = selectedActiveItems(items).length;
  const activeCount = items.length - removedCount;

  const cardWidth = (zoom: WorkspaceZoomLevel) => Math.round(170 + (zoom - 100) * 1.2);

  return (
    <GridWorkspace<PageGridItem>
      cardWidth={cardWidth}
      defaultZoom={100}
      dragDisabledReason={dragDisabledReason}
      dragEnabled={dragEnabled}
      items={items}
      largeDocumentThreshold={largeDocumentThreshold}
      onItemsChange={(next) => onItemsChange(orderedWithIndex(next))}
      previewLabels={previewLabels}
      removedNotice={removedNotice}
      renderCard={(args) => <PageCard args={args} cardOverlay={renderCardOverlay?.(args.item, args.index)} />}
      renderDragPreview={(item) => <PageDragPreview item={item} />}
      summary={summary}
      toolbarExtras={
        <PageSelectionToolbar
          activeCount={activeCount}
          dragDisabledReason={dragDisabledReason}
          dragEnabled={dragEnabled}
          onClearSelection={() => setSelection(() => false)}
          onInvertSelection={() =>
            onItemsChange(orderedWithIndex(items.map((item) => ({ ...item, selected: item.removed ? false : !item.selected }))))
          }
          onRestoreAll={() => onItemsChange(orderedWithIndex(items.map((item) => ({ ...item, removed: false }))))}
          onSelectAll={() => setSelection(() => true)}
          onSelectEven={() => setSelection((item) => item.originalPageNumber % 2 === 0)}
          onSelectOdd={() => setSelection((item) => item.originalPageNumber % 2 === 1)}
          removedCount={removedCount}
          selectedCount={selectedCount}
          totalCount={items.length}
        />
      }
    />
  );
}
