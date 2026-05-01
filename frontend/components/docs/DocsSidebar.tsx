"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BookOpen, Search, X } from "lucide-react";

import type { DocGroup } from "@/lib/docs";

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function SidebarContent({
  activeSlug,
  groups,
  onNavigate,
  search,
  setSearch,
}: {
  activeSlug?: string;
  groups: DocGroup[];
  onNavigate?: () => void;
  search: string;
  setSearch: (value: string) => void;
}) {
  const query = normalize(search);
  const filteredGroups = useMemo(() => {
    if (!query) {
      return groups;
    }

    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          const haystack = normalize(`${item.title} ${item.description} ${item.slug} ${group.title}`);
          return haystack.includes(query);
        }),
      }))
      .filter((group) => group.items.length > 0);
  }, [groups, query]);

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-3 border-b border-zinc-200/70 px-4 py-4 dark:border-white/10">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
            <BookOpen className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Documentation</p>
            <p className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">Browse the live markdown docs.</p>
          </div>
        </div>

        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
          <input
            className="field-input h-11 pl-10"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search title, slug, or group"
            type="search"
            value={search}
          />
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {filteredGroups.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/90 px-4 py-5 text-sm leading-6 text-zinc-500 dark:border-white/10 dark:bg-zinc-950/70 dark:text-zinc-400">
            No docs matched your search. Try a broader title or slug.
          </div>
        ) : null}

        <div className="space-y-5">
          {filteredGroups.map((group) => (
            <section key={group.id}>
              <div className="px-2">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">{group.title}</h2>
                <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">{group.description}</p>
              </div>
              <div className="mt-2 space-y-1">
                {group.items.map((item) => {
                  const active = item.slug === activeSlug;
                  return (
                    <Link
                      className={[
                        "block rounded-2xl px-3 py-3 transition",
                        active
                          ? "border border-emerald-300/60 bg-emerald-50/90 text-emerald-800 shadow-sm dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-200"
                          : "border border-transparent text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-white/5 dark:hover:text-zinc-100",
                      ].join(" ")}
                      href={item.href}
                      key={item.slug}
                      onClick={onNavigate}
                    >
                      <p className="text-sm font-semibold">{item.title}</p>
                      <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">{item.description}</p>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DocsSidebar({
  activeSlug,
  groups,
}: {
  activeSlug?: string;
  groups: DocGroup[];
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");

  return (
    <>
      <div className="xl:hidden">
        <button
          className="secondary-button h-11 w-full justify-between rounded-2xl"
          onClick={() => setMobileOpen(true)}
          type="button"
        >
          <span className="inline-flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Docs Menu
          </span>
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Search & browse</span>
        </button>
      </div>

      <aside className="hidden xl:block">
        <div className="sticky top-24 h-[calc(100dvh-7rem)] overflow-hidden rounded-[24px] border border-zinc-200/70 bg-white/78 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/78">
          <SidebarContent activeSlug={activeSlug} groups={groups} search={search} setSearch={setSearch} />
        </div>
      </aside>

      {mobileOpen ? (
        <div className="xl:hidden">
          <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-[60] w-[min(100vw,24rem)] border-r border-zinc-200/70 bg-white/94 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/94">
            <div className="flex items-center justify-between border-b border-zinc-200/70 px-4 py-3 dark:border-white/10">
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Docs Navigation</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Browse and filter documentation</p>
              </div>
              <button
                aria-label="Close docs navigation"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-900 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/5 dark:hover:text-zinc-100"
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
              search={search}
              setSearch={setSearch}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
