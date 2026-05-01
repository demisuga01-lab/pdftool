import type { DocHeading } from "@/lib/docs";

export function DocsToc({ headings }: { headings: DocHeading[] }) {
  if (!headings.length) {
    return null;
  }

  return (
    <aside className="hidden xl:block">
      <div className="sticky top-24 max-h-[calc(100dvh-7rem)] overflow-y-auto rounded-[22px] border border-zinc-200/70 bg-white/76 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/76">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500">On this page</p>
        <nav aria-label="Table of contents" className="mt-3">
          <ul className="space-y-1">
            {headings.map((heading) => (
              <li key={heading.id}>
                <a
                  className={[
                    "block rounded-lg px-3 py-2 text-sm leading-6 text-zinc-500 transition hover:bg-emerald-50 hover:text-emerald-700 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-emerald-300",
                    heading.depth === 3 ? "ml-4" : "",
                  ].join(" ")}
                  href={`#${heading.id}`}
                >
                  {heading.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </aside>
  );
}
