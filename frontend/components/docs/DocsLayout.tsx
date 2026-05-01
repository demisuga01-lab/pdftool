import type { ReactNode } from "react";

import type { DocGroup, DocHeading } from "@/lib/docs";

import { DocsSidebar } from "./DocsSidebar";
import { DocsToc } from "./DocsToc";

export function DocsLayout({
  activeSlug,
  children,
  groups,
  headings,
}: {
  activeSlug?: string;
  children: ReactNode;
  groups: DocGroup[];
  headings?: DocHeading[];
}) {
  return (
    <main className="bg-transparent">
      <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="grid gap-6 xl:grid-cols-[300px,minmax(0,1fr),240px]">
          <DocsSidebar activeSlug={activeSlug} groups={groups} />
          <div className="min-w-0">{children}</div>
          <DocsToc headings={headings ?? []} />
        </div>
      </div>
    </main>
  );
}
