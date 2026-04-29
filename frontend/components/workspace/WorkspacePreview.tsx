"use client";

import { type ReactNode } from "react";

export function WorkspacePreview({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={[
        "overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm shadow-black/5 dark:border-white/10 dark:bg-zinc-900",
        className ?? "",
      ].join(" ")}
    >
      {children}
    </section>
  );
}
