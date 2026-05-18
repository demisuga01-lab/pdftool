"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowRight, Search, X } from "lucide-react";

import type { DocsSearchEntry } from "@/lib/docs-search";

const POPULAR_HREFS = [
  "/docs/getting-started",
  "/docs/pdf-tools",
  "/docs/image-tools",
  "/docs/troubleshooting",
  "/docs/file-handling-and-privacy",
  "/docs/deployment",
];

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function scoreEntry(entry: DocsSearchEntry, query: string) {
  const title = entry.title.toLowerCase();
  const description = entry.description.toLowerCase();
  const category = entry.category.toLowerCase();
  const group = entry.groupTitle.toLowerCase();
  const keywords = entry.keywords.join(" ");

  if (title === query) {
    return 100;
  }
  if (title.includes(query)) {
    return 80;
  }
  if (keywords.includes(query)) {
    return 60;
  }
  if (description.includes(query)) {
    return 40;
  }
  if (category.includes(query) || group.includes(query)) {
    return 30;
  }
  return 0;
}

export function DocsSearch({
  entries,
  placeholder = "Search tools, uploads, errors, deployment...",
}: {
  entries: DocsSearchEntry[];
  placeholder?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const normalizedQuery = normalize(query);

  const popularEntries = useMemo(() => {
    const byHref = new Map(entries.map((entry) => [entry.href, entry]));
    return POPULAR_HREFS.map((href) => byHref.get(href)).filter(Boolean) as DocsSearchEntry[];
  }, [entries]);

  const results = useMemo(() => {
    if (!normalizedQuery) {
      return popularEntries.slice(0, 6);
    }

    return entries
      .map((entry) => ({
        entry,
        score: scoreEntry(entry, normalizedQuery),
      }))
      .filter((result) => result.score > 0)
      .sort((first, second) => second.score - first.score || first.entry.title.localeCompare(second.entry.title))
      .slice(0, 8)
      .map((result) => result.entry);
  }, [entries, normalizedQuery, popularEntries]);

  const heading = normalizedQuery ? "Search results" : "Popular docs";

  return (
    <div
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
        }
      }}
      onFocus={() => setOpen(true)}
    >
      <label className="relative block">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
        <input
          aria-label="Search documentation"
          autoComplete="off"
          className="h-12 w-full rounded-2xl border border-zinc-200 bg-white pl-11 pr-11 text-sm font-medium text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-500/10 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-emerald-400/40"
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              return;
            }

            if (event.key === "Enter" && results[0]) {
              event.preventDefault();
              setOpen(false);
              router.push(results[0].href);
            }
          }}
          placeholder={placeholder}
          type="search"
          value={query}
        />
        {query ? (
          <button
            aria-label="Clear documentation search"
            className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-xl text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
            onClick={() => {
              setQuery("");
              setOpen(true);
            }}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </label>

      {open ? (
        <div className="absolute left-0 right-0 z-40 mt-2 overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.14)] dark:border-white/10 dark:bg-zinc-950 dark:shadow-[0_24px_56px_rgba(0,0,0,0.34)]">
          <div className="flex items-center justify-between border-b border-zinc-200/80 px-4 py-3 dark:border-white/10">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500">{heading}</p>
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              {normalizedQuery ? `${results.length} matched` : "Quick links"}
            </p>
          </div>
          <div className="max-h-[24rem] overflow-y-auto p-2">
            {results.length ? (
              <div className="grid gap-1">
                {results.map((entry) => (
                  <Link
                    className="group block rounded-2xl px-3 py-3 transition hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/35 dark:hover:bg-zinc-900"
                    href={entry.href}
                    key={entry.href}
                    onClick={() => setOpen(false)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{entry.title}</p>
                          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-semibold text-zinc-500 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-400">
                            {entry.category}
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-500 dark:text-zinc-400">{entry.description}</p>
                      </div>
                      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-emerald-600 dark:group-hover:text-emerald-300" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-5 text-sm leading-6 text-zinc-500 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-400">
                No docs matched that search. Try “upload”, “OCR”, “deployment”, “rate limit”, or “failed job”.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
