"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { imageTools, pdfTools } from "@/lib/tools";

type ToolLayoutProps = {
  children: ReactNode;
};

function ToolLink({
  href,
  isActive,
  label,
}: {
  href: string;
  isActive: boolean;
  label: string;
}) {
  return (
    <Link
      className={[
        "block rounded-xl px-3 py-2 text-sm transition",
        isActive
          ? "bg-sky-500/10 font-medium text-sky-700 dark:text-sky-300"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white",
      ].join(" ")}
      href={href}
    >
      {label}
    </Link>
  );
}

export function ToolLayout({ children }: ToolLayoutProps) {
  const pathname = usePathname();

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:flex-row lg:px-8">
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white/85 p-2 dark:border-slate-800 dark:bg-slate-900/85 lg:hidden">
        <div className="flex min-w-max gap-2">
          {[...pdfTools, ...imageTools].map((tool) => (
            <ToolLink
              href={tool.href}
              isActive={pathname === tool.href}
              key={tool.href}
              label={tool.name}
            />
          ))}
        </div>
      </div>

      <aside className="hidden w-72 shrink-0 lg:block">
        <div className="sticky top-28 space-y-6 rounded-3xl border border-slate-200 bg-white/85 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/85">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              PDF Tools
            </p>
            <div className="space-y-1">
              {pdfTools.map((tool) => (
                <ToolLink
                  href={tool.href}
                  isActive={pathname === tool.href}
                  key={tool.href}
                  label={tool.name}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              Image Tools
            </p>
            <div className="space-y-1">
              {imageTools.map((tool) => (
                <ToolLink
                  href={tool.href}
                  isActive={pathname === tool.href}
                  key={tool.href}
                  label={tool.name}
                />
              ))}
            </div>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
