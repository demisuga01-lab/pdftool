"use client";

import { type ReactNode } from "react";

export function WorkspaceSettingsPanel({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm shadow-black/5 dark:border-white/10 dark:bg-zinc-900 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
      <div className="mb-5 space-y-1">
        <h2 className="text-[18px] font-bold leading-tight text-zinc-900 dark:text-zinc-100 lg:text-[22px]">{title}</h2>
        {description ? <p className="text-[13px] font-medium leading-5 text-zinc-500 dark:text-zinc-400">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
