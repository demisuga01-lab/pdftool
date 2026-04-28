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
        "block rounded-md px-3 py-2 text-[13px] transition",
        isActive
          ? "bg-[#EFF6FF] font-medium text-[#2563EB]"
          : "text-slate-500 hover:bg-[#F9FAFB] hover:text-[#111827]",
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
      <div className="overflow-x-auto rounded-lg border border-[#E5E7EB] bg-white p-2 lg:hidden">
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

      <aside className="hidden w-[240px] shrink-0 lg:block">
        <div className="sticky top-[76px] space-y-6 rounded-lg border-r border-[#E5E7EB] bg-white pr-6">
          <div className="space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
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
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
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
