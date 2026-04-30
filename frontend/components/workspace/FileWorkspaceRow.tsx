"use client";

import { ArrowDown, ArrowUp, GripVertical, Trash2 } from "lucide-react";

import { PageIcon } from "@/components/icons/SiteIcons";

export type FileWorkspaceRowItem = {
  id: string;
  meta?: string;
  status?: string;
  thumbnailUrl?: string;
  title: string;
};

export function FileWorkspaceRow({
  canMoveDown = true,
  canMoveUp = true,
  dragAttributes,
  dragListeners,
  dragging,
  index,
  item,
  onMoveDown,
  onMoveUp,
  onRemove,
}: {
  canMoveDown?: boolean;
  canMoveUp?: boolean;
  dragAttributes?: any;
  dragListeners?: any;
  dragging?: boolean;
  index: number;
  item: FileWorkspaceRowItem;
  onMoveDown?: () => void;
  onMoveUp?: () => void;
  onRemove?: () => void;
}) {
  return (
    <div
      className={[
        "grid min-w-0 grid-cols-[44px_minmax(0,1fr)] gap-3 rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm shadow-black/5 dark:border-white/10 dark:bg-zinc-900 sm:flex sm:flex-row sm:items-center",
        dragging ? "opacity-60" : "",
      ].join(" ")}
    >
      <button
        aria-label={`Drag ${item.title} to reorder`}
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-zinc-200 text-zinc-400 dark:border-white/10 dark:text-zinc-500"
        type="button"
        {...dragAttributes}
        {...dragListeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-bold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300">
          {index + 1}
        </span>
        <div className="flex h-16 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 dark:border-white/10 dark:bg-zinc-950">
          {item.thumbnailUrl ? (
            <img alt="" className="h-full w-full object-cover" src={item.thumbnailUrl} />
          ) : (
            <PageIcon className="h-8 w-8 text-zinc-300 dark:text-zinc-600" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500">File {index + 1}</p>
          <p className="truncate font-mono text-[13px] font-semibold text-zinc-900 dark:text-zinc-100">{item.title}</p>
          {item.meta ? <p className="mt-1 text-sm font-medium text-zinc-500 dark:text-zinc-400">{item.meta}</p> : null}
          {item.status ? <p className="mt-1 text-xs font-semibold text-emerald-600 dark:text-emerald-300">{item.status}</p> : null}
        </div>
      </div>

      <div className="col-span-2 grid grid-cols-3 gap-2 sm:col-span-1 sm:flex sm:shrink-0 sm:items-center sm:gap-1 sm:self-auto">
        <button aria-label={`Move ${item.title} up`} className="secondary-button h-11 px-3 sm:h-10 sm:w-10 sm:p-0" disabled={!canMoveUp || !onMoveUp} onClick={onMoveUp} type="button">
          <ArrowUp className="h-4 w-4" />
          <span className="ml-2 sm:hidden">Up</span>
        </button>
        <button aria-label={`Move ${item.title} down`} className="secondary-button h-11 px-3 sm:h-10 sm:w-10 sm:p-0" disabled={!canMoveDown || !onMoveDown} onClick={onMoveDown} type="button">
          <ArrowDown className="h-4 w-4" />
          <span className="ml-2 sm:hidden">Down</span>
        </button>
        {onRemove ? (
          <button
            aria-label={`Remove ${item.title}`}
            className="secondary-button h-11 px-3 text-rose-600 dark:text-rose-400 sm:h-10 sm:w-10 sm:p-0"
            onClick={onRemove}
            type="button"
          >
            <Trash2 className="h-4 w-4" />
            <span className="ml-2 sm:hidden">Remove</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
