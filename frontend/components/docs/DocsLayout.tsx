import type { ReactNode } from "react";

import type { DocGroup, DocHeading } from "@/lib/docs";
import type { DocsSearchEntry } from "@/lib/docs-search";

import { DocsSidebar } from "./DocsSidebar";
import { DocsToc } from "./DocsToc";

export function DocsLayout({
  activeSlug,
  children,
  groups,
  headings,
  searchEntries,
}: {
  activeSlug?: string;
  children: ReactNode;
  groups: DocGroup[];
  headings?: DocHeading[];
  searchEntries?: DocsSearchEntry[];
}) {
  const hasToc = Boolean(headings?.length);

  return (
    <main className="overflow-x-hidden bg-transparent">
      <div className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div
          className={[
            "grid gap-6",
            hasToc
              ? "xl:grid-cols-[280px,minmax(0,1fr)] 2xl:grid-cols-[280px,minmax(0,820px),220px] 2xl:justify-center"
              : "xl:grid-cols-[280px,minmax(0,1fr)]",
          ].join(" ")}
        >
          <DocsSidebar activeSlug={activeSlug} groups={groups} searchEntries={searchEntries ?? []} />
          <div className="min-w-0 max-w-full overflow-hidden">{children}</div>
          {hasToc ? <DocsToc headings={headings ?? []} /> : null}
        </div>
      </div>
    </main>
  );
}
