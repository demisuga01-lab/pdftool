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
        "overflow-hidden rounded-[28px] border border-zinc-200/70 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-zinc-900 dark:shadow-[0_28px_70px_rgba(0,0,0,0.34)]",
        panelClassName ?? "",
      ].join(" ")}
    >
      <div
        className={[
          "border-b border-zinc-200/80 px-5 py-5 dark:border-white/10 sm:px-6 sm:py-6",
          headerClassName ?? "",
        ].join(" ")}
        data-no-pan
      >
        <div className="space-y-1.5">
          <h2 className="text-xl font-bold leading-tight tracking-[-0.02em] text-zinc-950 dark:text-zinc-100 lg:text-[22px]">{title}</h2>
          {description ? <p className="text-sm font-medium leading-6 text-zinc-500 dark:text-zinc-400">{description}</p> : null}
        </div>
      </div>
      <div className={["px-5 py-5 sm:px-6 sm:py-6", bodyClassName ?? ""].join(" ")} data-settings-control>
        {children}
      </div>
      {footer ? (
        <div
          className={[
            "border-t border-zinc-200/80 bg-zinc-50 px-5 py-5 dark:border-white/10 dark:bg-zinc-950 sm:px-6 sm:py-6",
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
