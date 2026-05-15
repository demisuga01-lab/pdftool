"use client";

import { type ReactNode } from "react";

export function WorkspaceResultPanel({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm shadow-black/5 dark:border-white/10 dark:bg-zinc-900">
      {children}
    </section>
  );
}
