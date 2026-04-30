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
  ArrowDown,
  ArrowUp,
  GripVertical,
  Maximize2,
  Minus,
  PanelRight,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useState, type DragEvent, type ReactNode } from "react";

import { PageIcon } from "@/components/icons/SiteIcons";
import { WorkspaceHeader } from "@/components/workspace/WorkspaceHeader";
import { WorkspaceSettingsPanel } from "@/components/workspace/WorkspaceSettingsPanel";
import { useDragPan, useWorkspaceZoom } from "@/lib/use-workspace-zoom";

type DropHandler = (files: File[]) => void;

function useDropZone(onFilesDropped?: DropHandler) {
  const [dragging, setDragging] = useState(false);

  return {
    dragging,
    dragProps: {
      onDragEnter: (event: DragEvent<HTMLElement>) => {
        if (!onFilesDropped) {
          return;
        }
        event.preventDefault();
        setDragging(true);
      },
      onDragOver: (event: DragEvent<HTMLElement>) => {
        if (!onFilesDropped) {
          return;
        }
        event.preventDefault();
        setDragging(true);
      },
      onDragLeave: (event: DragEvent<HTMLElement>) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setDragging(false);
        }
      },
      onDrop: (event: DragEvent<HTMLElement>) => {
        if (!onFilesDropped) {
          return;
        }
        event.preventDefault();
        setDragging(false);
        onFilesDropped(Array.from(event.dataTransfer.files ?? []));
      },
    },
  };
}

export function MobileActionBar({
  disabled,
  label,
  onClick,
}: {
  disabled?: boolean;
  label: string;
  onClick?: () => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-zinc-950/95 dark:shadow-black/30 lg:hidden">
      <button className="primary-button min-h-11 w-full" disabled={disabled} onClick={onClick} type="button">
        {label}
      </button>
    </div>
  );
}

export function CompactWorkspaceShell({
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
  onFilesDropped,
  onProcess,
  onReset,
  processButtonDisabled,
  processButtonLabel = "Process",
  processingLabel,
  preview,
  resultPanel,
  settingsPanel,
  title,
  uploadOverlay,
}: {
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
  onFilesDropped?: DropHandler;
  onProcess?: () => void;
  onReset?: () => void;
  processButtonDisabled?: boolean;
  processButtonLabel?: string;
  processingLabel?: string | null;
  preview: ReactNode;
  resultPanel?: ReactNode;
  settingsPanel: ReactNode;
  title: string;
  uploadOverlay?: ReactNode;
}) {
  const { dragProps, dragging } = useDropZone(onFilesDropped);

  return (
    <main className="min-h-[calc(100dvh-3.5rem)] overflow-x-hidden overscroll-x-none bg-zinc-50 dark:bg-[#050505] sm:min-h-[calc(100dvh-4rem)]" {...dragProps}>
      <WorkspaceHeader
        countLabel={countLabel}
        fileInfo={fileInfo}
        fileName={fileName}
        infoContent={infoContent}
        onDownload={onDownload}
        onReset={onReset}
        processingLabel={processingLabel}
        title={title}
      />

      <div className="mx-auto w-full max-w-[1440px] px-4 py-4 sm:px-6 sm:py-6 xl:px-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start">
          <section className="min-w-0 space-y-6">
            {hasContent ? (
              preview
            ) : (
              <div className="rounded-[28px] border border-zinc-200 bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.04)] dark:border-white/10 dark:bg-[#111111] dark:shadow-black/25 sm:p-6">
                <div className="flex min-h-[360px] items-center justify-center">{emptyState}</div>
              </div>
            )}
            {resultPanel}
          </section>

          <aside className="min-w-0 lg:sticky lg:top-24">
            <WorkspaceSettingsPanel
              bodyClassName="space-y-6 lg:min-h-0 lg:flex-1 lg:overflow-y-auto"
              description={description}
              footer={
                hasContent ? (
                  <div className="space-y-3">
                    <button
                      className="primary-button h-12 w-full text-[15px]"
                      disabled={processButtonDisabled}
                      onClick={onProcess}
                      type="button"
                    >
                      {processButtonLabel}
                    </button>
                    <div className="space-y-1 text-center text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      <p>{estimatedTime ?? "Estimated time updates after upload"}</p>
                      <p>Files deleted after 24 hours</p>
                    </div>
                  </div>
                ) : null
              }
              footerClassName="shrink-0"
              panelClassName="lg:flex lg:max-h-[calc(100dvh-7.5rem)] lg:flex-col"
              title={title}
            >
              {settingsPanel}
            </WorkspaceSettingsPanel>
          </aside>
        </div>
      </div>

      {dragging ? (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-[#059669]/10 p-4">
          <div className="rounded-2xl border border-[#059669]/30 bg-white px-5 py-4 text-sm font-semibold text-[#047857] shadow-xl shadow-slate-900/10 dark:bg-zinc-900 dark:text-emerald-300 dark:shadow-black/30">
            Drop files to upload
          </div>
        </div>
      ) : null}
      {uploadOverlay ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4">{uploadOverlay}</div> : null}
      {downloadPanel ? <div className="fixed inset-x-4 bottom-4 z-40 lg:inset-x-auto lg:bottom-6 lg:right-6 lg:w-[380px]">{downloadPanel}</div> : null}
    </main>
  );
}

export function VisualEditorWorkspaceShell({
  countLabel,
  description,
  downloadPanel,
  editor,
  emptyState,
  estimatedTime,
  fileInfo,
  fileName,
  hasContent,
  infoContent,
  onDownload,
  onFilesDropped,
  onProcess,
  onReset,
  processButtonDisabled,
  processButtonLabel = "Process",
  processingLabel,
  propertiesPanel,
  title,
  uploadOverlay,
}: {
  countLabel?: string;
  description: string;
  downloadPanel?: ReactNode;
  editor: ReactNode;
  emptyState: ReactNode;
  estimatedTime?: string;
  fileInfo?: string;
  fileName?: string;
  hasContent: boolean;
  infoContent?: ReactNode;
  onDownload?: () => void;
  onFilesDropped?: DropHandler;
  onProcess?: () => void;
  onReset?: () => void;
  processButtonDisabled?: boolean;
  processButtonLabel?: string;
  processingLabel?: string | null;
  propertiesPanel: ReactNode;
  title: string;
  uploadOverlay?: ReactNode;
}) {
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const { dragProps, dragging } = useDropZone(onFilesDropped);

  useEffect(() => {
    if (!mobilePanelOpen) {
      return;
    }
    // Save and restore the previous body.overflow value so nested drawers do
    // not clobber each other's lock state when they close in stacked order.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobilePanelOpen]);

  return (
    <main className="flex min-h-[calc(100dvh-3.5rem)] flex-col overflow-x-hidden overscroll-x-none bg-white dark:bg-zinc-950 sm:min-h-[calc(100dvh-4rem)] lg:h-[calc(100dvh-4rem)]" {...dragProps}>
      <WorkspaceHeader
        countLabel={countLabel}
        fileInfo={fileInfo}
        fileName={fileName}
        infoContent={infoContent}
        onDownload={onDownload}
        onReset={onReset}
        processingLabel={processingLabel}
        title={title}
      />

      <div className="relative flex min-h-0 flex-1 flex-col bg-zinc-50 dark:bg-[#050505] lg:flex-row">
        {/*
          Mobile (< lg): the section overflows visibly so the document body is
          the scroll container — that lets the user scroll up/down past the
          editor without getting trapped in a captured nested scroll.
          Desktop (lg+): the two-pane layout needs this section to capture its
          own vertical scroll so the sticky settings sidebar can stay in view.
        */}
        <section className="min-w-0 flex-1 px-3 py-3 pb-[calc(env(safe-area-inset-bottom)+8rem)] sm:px-5 sm:py-5 lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:pb-5">
          {hasContent ? editor : <div className="flex min-h-[520px] items-center justify-center">{emptyState}</div>}
        </section>

        <aside className="hidden w-[420px] shrink-0 border-l border-zinc-200/80 bg-zinc-50/80 px-5 py-5 dark:border-white/10 dark:bg-black/10 lg:block">
          <div className="sticky top-24">
            <WorkspaceSettingsPanel
              bodyClassName="space-y-6 lg:max-h-[calc(100dvh-15rem)] lg:overflow-y-auto"
              description={description}
              footer={
                <div className="space-y-3">
                  <button
                    className="primary-button min-h-11 w-full text-[15px]"
                    disabled={processButtonDisabled}
                    onClick={onProcess}
                    type="button"
                  >
                    {processButtonLabel}
                  </button>
                  <div className="space-y-0.5 text-center text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    <p>{estimatedTime ?? "Estimated time updates after upload"}</p>
                    <p>Files deleted after 24 hours</p>
                  </div>
                </div>
              }
              title={title}
            >
              {propertiesPanel}
            </WorkspaceSettingsPanel>
          </div>
        </aside>

        {hasContent ? (
          <>
            <button
              className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-4 z-30 inline-flex h-12 min-w-12 items-center justify-center gap-2 rounded-full bg-[#059669] px-4 text-sm font-semibold text-white shadow-lg shadow-emerald-600/25 lg:hidden"
              onClick={() => setMobilePanelOpen(true)}
              type="button"
            >
              <PanelRight className="h-5 w-5" />
              <span>Controls</span>
            </button>
            <MobileActionBar disabled={processButtonDisabled} label={processButtonLabel} onClick={onProcess} />
          </>
        ) : null}

        <div
          className={[
            "fixed inset-0 z-40 bg-black/60 transition lg:hidden",
            mobilePanelOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
          ].join(" ")}
          onClick={() => setMobilePanelOpen(false)}
        />
        <div
          className={[
            "fixed inset-x-0 bottom-0 z-50 max-h-[86dvh] rounded-t-[24px] border-t border-slate-200 bg-white shadow-2xl shadow-slate-900/20 transition dark:border-white/10 dark:bg-zinc-900 dark:shadow-black/40 lg:hidden",
            mobilePanelOpen ? "translate-y-0" : "translate-y-full",
          ].join(" ")}
        >
          <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-white/10">
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold text-slate-900 dark:text-zinc-100">{title}</h2>
              <p className="text-[13px] font-medium leading-5 text-slate-500 dark:text-zinc-400">{description}</p>
            </div>
            <button
              aria-label="Close controls"
              className="secondary-button h-10 w-10 shrink-0 p-0"
              onClick={() => setMobilePanelOpen(false)}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="overflow-y-auto overscroll-contain px-5 py-4 pb-[calc(env(safe-area-inset-bottom)+7rem)]">
            {propertiesPanel}
            <div className="pt-5">
              <button
                className="primary-button min-h-11 w-full"
                disabled={processButtonDisabled}
                onClick={() => {
                  onProcess?.();
                  setMobilePanelOpen(false);
                }}
                type="button"
              >
                {processButtonLabel}
              </button>
            </div>
          </div>
        </div>
      </div>

      {dragging ? (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-[#059669]/10 p-4">
          <div className="rounded-2xl border border-[#059669]/30 bg-white px-5 py-4 text-sm font-semibold text-[#047857] shadow-xl shadow-slate-900/10 dark:bg-zinc-900 dark:text-emerald-300 dark:shadow-black/30">
            Drop files to upload
          </div>
        </div>
      ) : null}
      {uploadOverlay ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4">{uploadOverlay}</div> : null}
      {downloadPanel ? <div className="fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 lg:inset-x-auto lg:bottom-6 lg:right-6 lg:w-[360px]">{downloadPanel}</div> : null}
    </main>
  );
}

export function PreviewCard({
  actions,
  badges,
  children,
  description,
  icon,
  title,
}: {
  actions?: ReactNode;
  badges?: string[];
  children?: ReactNode;
  description?: string;
  icon?: ReactNode;
  title: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/[0.03] dark:border-white/10 dark:bg-zinc-900 sm:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start">
          <div className="flex min-h-[220px] min-w-0 flex-1 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-zinc-950 sm:min-h-[280px]">
            {children ?? (
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white text-slate-300 dark:bg-zinc-900 dark:text-zinc-600">
                {icon ?? <PageIcon className="h-10 w-10" />}
              </div>
            )}
          </div>
          <div className="min-w-0 space-y-3 md:w-[280px]">
            <div className="space-y-1">
              <p className="truncate font-mono text-sm font-semibold text-slate-900 dark:text-zinc-100">{title}</p>
              {description ? <p className="text-sm font-medium leading-6 text-slate-500 dark:text-zinc-400">{description}</p> : null}
            </div>
            {badges?.length ? (
              <div className="flex flex-wrap gap-2">
                {badges.map((badge) => (
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-500 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-400" key={badge}>
                    {badge}
                  </span>
                ))}
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <button className="secondary-button min-h-10 gap-2 px-3 text-sm" onClick={() => setExpanded(true)} type="button">
                <Maximize2 className="h-4 w-4" />
                Expand preview
              </button>
              {actions}
            </div>
          </div>
        </div>
      </section>

      {expanded ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4" onClick={() => setExpanded(false)}>
          <div className="flex max-h-[92vh] w-full flex-col rounded-t-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-zinc-900 dark:shadow-black/40 sm:max-w-5xl sm:rounded-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-white/10">
              <div className="min-w-0">
                <p className="truncate font-mono text-sm font-semibold text-slate-900 dark:text-zinc-100">{title}</p>
                {description ? <p className="text-xs text-slate-500 dark:text-zinc-400">{description}</p> : null}
              </div>
              <button aria-label="Close preview" className="secondary-button h-10 w-10 p-0" onClick={() => setExpanded(false)} type="button">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 overflow-auto bg-slate-50 p-4 dark:bg-zinc-950 sm:p-6">
              <div className="flex min-h-[60vh] items-center justify-center">{children}</div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function ZoomControls({
  fit,
  label,
  reset,
  zoomIn,
  zoomOut,
}: {
  fit: () => void;
  label: string;
  reset: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button aria-label="Zoom out" className="secondary-button h-10 w-10 p-0" onClick={zoomOut} type="button">
        <Minus className="h-4 w-4" />
      </button>
      <span className="min-w-[68px] text-center text-sm font-semibold text-slate-600 dark:text-zinc-300">{label}</span>
      <button aria-label="Zoom in" className="secondary-button h-10 w-10 p-0" onClick={zoomIn} type="button">
        <Plus className="h-4 w-4" />
      </button>
      <button className="secondary-button h-10 px-3 text-sm" onClick={fit} type="button">
        Fit
      </button>
      <button className="secondary-button h-10 px-3 text-sm" onClick={reset} type="button">
        100%
      </button>
    </div>
  );
}

export function EditorCanvas({
  children,
  className,
  contentSize,
  footer,
  ignorePanSelectors,
  toolbar,
}: {
  children: (args: { effectiveZoom: number; mode: "fit" | "manual" }) => ReactNode;
  className?: string;
  contentSize?: { height: number; width: number } | null;
  footer?: ReactNode;
  ignorePanSelectors?: string;
  toolbar?: ReactNode;
}) {
  const zoom = useWorkspaceZoom({ contentSize });
  const dragPan = useDragPan(zoom.viewportRef, {
    enabled: !zoom.fitMode && zoom.effectiveZoom > 100,
    ignoreSelectors: ignorePanSelectors,
  });

  useEffect(() => {
    const node = zoom.viewportRef.current;
    if (!node) {
      return;
    }

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      zoom.zoomByWheel(event.deltaY);
    };

    node.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      node.removeEventListener("wheel", handleWheel);
    };
  }, [zoom]);

  return (
    <section className={["overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/[0.03] dark:border-white/10 dark:bg-zinc-900", className ?? ""].join(" ")}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-3 py-3 dark:border-white/10 sm:px-4">
        <ZoomControls fit={zoom.fit} label={zoom.label} reset={zoom.reset} zoomIn={zoom.zoomIn} zoomOut={zoom.zoomOut} />
        {toolbar}
      </div>
      <div
        className="h-[min(62dvh,560px)] overflow-auto overscroll-contain bg-slate-50 p-3 dark:bg-zinc-950 sm:h-[min(72dvh,760px)] sm:p-5"
        ref={zoom.viewportRef}
        style={{
          cursor: dragPan.panCursor,
          touchAction: !zoom.fitMode && zoom.effectiveZoom > 100 ? "none" : "manipulation",
        }}
      >
        <div className="flex min-h-full min-w-full items-center justify-center">{children({ effectiveZoom: zoom.effectiveZoom, mode: zoom.mode })}</div>
      </div>
      {footer ? <div className="border-t border-slate-200 px-4 py-3 dark:border-white/10">{footer}</div> : null}
    </section>
  );
}

export type FileGridItem = {
  id: string;
  meta?: string;
  status?: string;
  thumbnail?: string;
  title: string;
};

function SortableFileRow({
  canMoveDown,
  canMoveUp,
  index,
  item,
  onMoveDown,
  onMoveUp,
  onRemove,
}: {
  canMoveDown: boolean;
  canMoveUp: boolean;
  index: number;
  item: FileGridItem;
  onMoveDown: () => void;
  onMoveUp: () => void;
  onRemove?: () => void;
}) {
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        opacity: isDragging ? 0.55 : 1,
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <div className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm shadow-slate-900/[0.02] dark:border-white/10 dark:bg-zinc-900">
        <button
          aria-label="Drag to reorder"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-400 dark:border-white/10 dark:text-zinc-500"
          type="button"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500 dark:bg-zinc-800 dark:text-zinc-300">{index + 1}</span>
        <div className="flex h-16 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-zinc-950">
          {item.thumbnail ? <img alt="" className="h-full w-full object-cover" src={item.thumbnail} /> : <PageIcon className="h-8 w-8 text-slate-300 dark:text-zinc-600" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-[13px] font-semibold text-slate-800 dark:text-zinc-100">{item.title}</p>
          {item.meta ? <p className="mt-1 text-sm font-medium text-slate-500 dark:text-zinc-400">{item.meta}</p> : null}
          {item.status ? <p className="mt-1 text-xs font-semibold text-[#059669]">{item.status}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button aria-label="Move up" className="secondary-button h-10 w-10 p-0" disabled={!canMoveUp} onClick={onMoveUp} type="button">
            <ArrowUp className="h-4 w-4" />
          </button>
          <button aria-label="Move down" className="secondary-button h-10 w-10 p-0" disabled={!canMoveDown} onClick={onMoveDown} type="button">
            <ArrowDown className="h-4 w-4" />
          </button>
          {onRemove ? (
            <button aria-label="Remove file" className="secondary-button h-10 w-10 p-0 text-rose-600" onClick={onRemove} type="button">
              <Trash2 className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function FileGrid({
  items,
  onRemove,
  onReorder,
}: {
  items: FileGridItem[];
  onRemove?: (id: string) => void;
  onReorder: (items: FileGridItem[]) => void;
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

  const move = (from: number, to: number) => {
    onReorder(arrayMove(items, from, to));
  };

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd} sensors={sensors}>
      <SortableContext items={items.map((item) => item.id)} strategy={rectSortingStrategy}>
        <div className="grid gap-3">
          {items.map((item, index) => (
            <SortableFileRow
              canMoveDown={index < items.length - 1}
              canMoveUp={index > 0}
              index={index}
              item={item}
              key={item.id}
              onMoveDown={() => move(index, index + 1)}
              onMoveUp={() => move(index, index - 1)}
              onRemove={onRemove ? () => onRemove(item.id) : undefined}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

export function UploadDropHint({ children }: { children?: ReactNode }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-500 dark:border-white/15 dark:bg-zinc-900 dark:text-zinc-400">
      <Upload className="h-4 w-4" />
      {children ?? "Drag files here or browse"}
    </div>
  );
}
