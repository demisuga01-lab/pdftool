"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BookOpen, ChevronRight, X } from "lucide-react";

import type { DocGroup } from "@/lib/docs";
import { docsNavSections, type DocsSearchEntry } from "@/lib/docs-search";

import { DocsSearch } from "./DocsSearch";

function SidebarContent({
  activeSlug,
  groups,
  onNavigate,
  searchEntries,
}: {
  activeSlug?: string;
  groups: DocGroup[];
  onNavigate?: () => void;
  searchEntries: DocsSearchEntry[];
}) {
  const groupsById = useMemo(() => new Map<string, DocGroup>(groups.map((group) => [group.id, group])), [groups]);

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-900">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300">
            <BookOpen className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">Help Center</p>
            <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">User help, tool guides, and operator docs.</p>
          </div>
        </div>
        <div className="mt-4">
          <DocsSearch entries={searchEntries} />
        </div>
      </div>

      <nav aria-label="Documentation navigation" className="space-y-4">
        {docsNavSections.map((section) => {
          const sectionGroups = section.groupIds.map((id) => groupsById.get(id)).filter(Boolean) as DocGroup[];
          if (!sectionGroups.length) {
            return null;
          }

          return (
            <section className="rounded-3xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-900" key={section.title}>
              <div>
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500">{section.title}</h2>
                <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">{section.description}</p>
              </div>
              <div className="mt-3 grid gap-1">
                {sectionGroups.flatMap((group) =>
                  group.items.map((item) => {
                    const active = item.slug === activeSlug;

                    return (
                      <Link
                        className={[
                          "group flex items-start gap-2 rounded-2xl px-3 py-2.5 transition",
                          active
                            ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-400/20"
                            : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-950 dark:hover:text-zinc-100",
                        ].join(" ")}
                        href={item.href}
                        key={item.slug}
                        onClick={onNavigate}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold leading-5">{item.title}</span>
                          <span className="mt-0.5 line-clamp-1 block text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                            {item.description}
                          </span>
                        </span>
                        <ChevronRight
                          className={[
                            "mt-0.5 h-4 w-4 shrink-0 transition",
                            active ? "text-emerald-600 dark:text-emerald-300" : "text-zinc-300 group-hover:text-emerald-600 dark:text-zinc-600 dark:group-hover:text-emerald-300",
                          ].join(" ")}
                        />
                      </Link>
                    );
                  }),
                )}
              </div>
            </section>
          );
        })}
      </nav>
    </div>
  );
}

export function DocsSidebar({
  activeSlug,
  groups,
  searchEntries,
}: {
  activeSlug?: string;
  groups: DocGroup[];
  searchEntries: DocsSearchEntry[];
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <div className="xl:hidden">
        <button
          className="secondary-button h-12 w-full justify-between rounded-2xl px-4"
          onClick={() => setMobileOpen(true)}
          type="button"
        >
          <span className="inline-flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Docs menu
          </span>
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Search and browse</span>
        </button>
      </div>

      <aside className="hidden xl:block">
        <div className="sticky top-24">
          <SidebarContent activeSlug={activeSlug} groups={groups} searchEntries={searchEntries} />
        </div>
      </aside>

      {mobileOpen ? (
        <div className="xl:hidden">
          <div className="fixed inset-0 z-50 bg-black/55" onClick={() => setMobileOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-[60] w-[min(100vw,26rem)] overflow-y-auto border-r border-zinc-200/70 bg-zinc-50 p-4 shadow-2xl dark:border-white/10 dark:bg-zinc-950">
            <div className="mb-4 flex items-center justify-between rounded-3xl border border-zinc-200 bg-white px-4 py-3 shadow-sm dark:border-white/10 dark:bg-zinc-900">
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Docs navigation</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Search and browse help articles</p>
              </div>
              <button
                aria-label="Close docs navigation"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-900 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-zinc-950 dark:hover:text-zinc-100"
                onClick={() => setMobileOpen(false)}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <SidebarContent
              activeSlug={activeSlug}
              groups={groups}
              onNavigate={() => setMobileOpen(false)}
              searchEntries={searchEntries}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
