"use client";

import { X } from "lucide-react";
import { type ReactNode } from "react";

export function WorkspaceMobileDrawer({
  children,
  description,
  onClose,
  open,
  title,
}: {
  children: ReactNode;
  description?: string;
  onClose: () => void;
  open: boolean;
  title: string;
}) {
  return (
    <>
      <div
        className={[
          "fixed inset-0 z-40 bg-black/60 transition lg:hidden",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
        onClick={onClose}
      />
      <div
        className={[
          "fixed inset-x-0 bottom-0 z-50 max-h-[86vh] rounded-t-[24px] bg-white shadow-2xl shadow-black/20 transition dark:bg-zinc-900 dark:shadow-black/40 lg:hidden",
          open ? "translate-y-0" : "translate-y-full",
        ].join(" ")}
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-200 px-5 py-4 dark:border-white/10">
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-zinc-900 dark:text-zinc-100">{title}</h2>
            {description ? <p className="text-[13px] font-medium leading-5 text-zinc-500 dark:text-zinc-400">{description}</p> : null}
          </div>
          <button aria-label="Close controls" className="secondary-button h-10 w-10 shrink-0 p-0" onClick={onClose} type="button">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4 pb-28">{children}</div>
      </div>
    </>
  );
}
