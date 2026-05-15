import Link from "next/link";

import type { DocLink } from "@/lib/docs";

export function DocsPagination({
  next,
  previous,
}: {
  next: DocLink | null;
  previous: DocLink | null;
}) {
  if (!previous && !next) {
    return null;
  }

  return (
    <nav aria-label="Documentation pagination" className="grid gap-3 sm:grid-cols-2">
      {previous ? (
        <Link
          className="group rounded-[22px] border border-zinc-200/70 bg-white p-5 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 dark:border-white/10 dark:bg-zinc-900 dark:hover:border-emerald-900 dark:hover:bg-zinc-800"
          href={previous.href}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500">Previous</p>
          <p className="mt-2 text-base font-semibold text-zinc-900 transition group-hover:text-emerald-700 dark:text-zinc-100 dark:group-hover:text-emerald-300">
            {previous.title}
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">{previous.description}</p>
        </Link>
      ) : <div className="hidden sm:block" />}

      {next ? (
        <Link
          className="group rounded-[22px] border border-zinc-200/70 bg-white p-5 text-left shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 dark:border-white/10 dark:bg-zinc-900 dark:hover:border-emerald-900 dark:hover:bg-zinc-800"
          href={next.href}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500">Next</p>
          <p className="mt-2 text-base font-semibold text-zinc-900 transition group-hover:text-emerald-700 dark:text-zinc-100 dark:group-hover:text-emerald-300">
            {next.title}
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">{next.description}</p>
        </Link>
      ) : null}
    </nav>
  );
}
