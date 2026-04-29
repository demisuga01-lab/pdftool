"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { imageTools, pdfTools, sharedTools } from "@/lib/tools";

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
        "block rounded-md px-3 py-2 text-[13px] transition",
        isActive
          ? "bg-[#ECFDF5] font-medium text-[#059669] dark:bg-emerald-500/10 dark:text-emerald-300"
          : "text-slate-500 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-emerald-300",
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
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 dark:border-white/10 dark:bg-zinc-900 lg:hidden">
        <div className="flex min-w-max gap-2">
          {[...sharedTools, ...pdfTools, ...imageTools].map((tool) => (
            <ToolLink
              href={tool.href}
              isActive={pathname === tool.href}
              key={tool.href}
              label={tool.name}
            />
          ))}
        </div>
      </div>

      <aside className="hidden w-[240px] shrink-0 lg:block">
        <div className="sticky top-[76px] space-y-6 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-zinc-900">
          <div className="space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
              Shared
            </p>
            <div className="space-y-1">
              {sharedTools.map((tool) => (
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
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
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
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
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

      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-[720px]">{children}</div>
      </main>
    </div>
  );
}
