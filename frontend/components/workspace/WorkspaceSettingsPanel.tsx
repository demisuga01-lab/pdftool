"use client";

import { type ReactNode } from "react";

export function WorkspaceSettingsPanel({
  bodyClassName,
  children,
  description,
  footer,
  footerClassName,
  headerClassName,
  panelClassName,
  title,
}: {
  bodyClassName?: string;
  children: ReactNode;
  description?: string;
  footer?: ReactNode;
  footerClassName?: string;
  headerClassName?: string;
  panelClassName?: string;
  title: string;
}) {
  return (
    <section
      className={[
        "overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900",
        panelClassName ?? "",
      ].join(" ")}
    >
      <div
        className={[
          "border-b border-zinc-200 px-5 py-4 dark:border-white/10 sm:px-6 sm:py-5",
          headerClassName ?? "",
        ].join(" ")}
        data-no-pan
      >
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">Settings</p>
          <h2 className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-100">{title}</h2>
          {description ? <p className="text-sm leading-6 text-zinc-500 dark:text-zinc-400">{description}</p> : null}
        </div>
      </div>
      <div className={["px-5 py-5 sm:px-6", bodyClassName ?? ""].join(" ")} data-settings-control>
        {children}
      </div>
      {footer ? (
        <div
          className={[
            "border-t border-zinc-200 bg-zinc-50/60 px-5 py-4 dark:border-white/10 dark:bg-zinc-950/60 sm:px-6 sm:py-5",
            footerClassName ?? "",
          ].join(" ")}
          data-settings-control
        >
          {footer}
        </div>
      ) : null}
    </section>
  );
}
