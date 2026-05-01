"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";

export function WorkspaceMobileDrawer({
  bodyClassName,
  children,
  description,
  footer,
  footerClassName,
  onClose,
  open,
  title,
}: {
  bodyClassName?: string;
  children: ReactNode;
  description?: string;
  footer?: ReactNode;
  footerClassName?: string;
  onClose: () => void;
  open: boolean;
  title: string;
}) {
  const bodyRef = useRef<HTMLDivElement | null>(null);

  useBodyScrollLock(open);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development" || !open) {
      return;
    }

    const node = bodyRef.current;
    if (!node) {
      return;
    }

    const interactiveControls = node.querySelectorAll("button, input, textarea, select, label, [role='button']");
    if (interactiveControls.length >= 8 && node.scrollHeight <= node.clientHeight) {
      console.warn("[WorkspaceMobileDrawer] Drawer opened with many controls but no vertical overflow. Check mobile layout sizing.");
    }
  }, [open]);

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
          "fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] max-w-full flex-col overflow-hidden rounded-t-3xl border-t border-zinc-200/70 bg-white/90 pb-[env(safe-area-inset-bottom)] shadow-[0_-24px_70px_rgba(15,23,42,0.16)] backdrop-blur-2xl transition dark:border-white/10 dark:bg-zinc-900/88 dark:shadow-[0_-28px_80px_rgba(0,0,0,0.4)] lg:hidden",
          open ? "translate-y-0" : "translate-y-full",
        ].join(" ")}
        style={{ touchAction: "pan-y" }}
      >
        <div className="shrink-0 border-b border-zinc-200 px-4 pb-4 pt-3 dark:border-white/10 sm:px-5" data-no-pan>
          <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-zinc-300/80 dark:bg-white/15" />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold text-zinc-900 dark:text-zinc-100">{title}</h2>
              {description ? <p className="text-[13px] font-medium leading-5 text-zinc-500 dark:text-zinc-400">{description}</p> : null}
            </div>
            <button
              aria-label="Close controls"
              className="secondary-button h-10 w-10 shrink-0 p-0"
              data-no-pan
              onClick={onClose}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div
          className={[
            "min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:px-5",
            bodyClassName ?? "",
          ].join(" ")}
          data-drawer-scroll
          data-settings-control
          ref={bodyRef}
          style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}
        >
          {children}
        </div>
        {footer ? (
          <div
            className={[
              "shrink-0 border-t border-zinc-200/70 bg-white/86 px-4 py-4 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/86 sm:px-5",
              footerClassName ?? "",
            ].join(" ")}
            data-no-pan
            data-settings-control
          >
            {footer}
          </div>
        ) : null}
      </div>
    </>
  );
}
