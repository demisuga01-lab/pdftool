import type { Metadata } from "next";
import Link from "next/link";

import { DocsLayout } from "@/components/docs/DocsLayout";
import { DocsMarkdown } from "@/components/docs/DocsMarkdown";
import { getDocsForNavigation, getDocsLandingDocument } from "@/lib/docs";

export const metadata: Metadata = {
  title: "Documentation | PDFTools by WellFriend",
  description: "Browse the full PDFTools by WellFriend documentation system on the website at /docs.",
};

export default async function DocsIndexPage() {
  const [groups, landingDoc] = await Promise.all([
    getDocsForNavigation(),
    getDocsLandingDocument(),
  ]);

  return (
    <DocsLayout groups={groups}>
      <div className="space-y-6">
        <nav aria-label="Breadcrumb" className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          <Link className="transition hover:text-emerald-700 dark:hover:text-emerald-300" href="/">
            Home
          </Link>
          <span className="px-2 text-zinc-300 dark:text-zinc-600">/</span>
          <span className="text-zinc-700 dark:text-zinc-200">Docs</span>
        </nav>

        <section className="tool-panel space-y-5">
          <div className="space-y-3">
            <p className="tool-eyebrow">Live Documentation</p>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">
              PDFTools documentation inside the website
            </h1>
            <p className="max-w-3xl text-base leading-8 text-zinc-500 dark:text-zinc-300">
              Browse the markdown documentation from <code>pdftools-documentation/</code> directly in the live app.
              Use the docs menu to search by title, slug, or category, then move through pages with previous/next links
              and heading anchors.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {groups.map((group) => (
              <section
                className="rounded-[22px] border border-zinc-200/70 bg-white/78 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/72"
                key={group.id}
              >
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{group.title}</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">{group.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {group.items.slice(0, 5).map((item) => (
                    <Link
                      className="inline-flex rounded-full border border-zinc-200/80 bg-zinc-50/90 px-3 py-1.5 text-xs font-semibold text-zinc-600 transition hover:border-emerald-300 hover:text-emerald-700 dark:border-white/10 dark:bg-zinc-950/70 dark:text-zinc-300 dark:hover:border-emerald-400/30 dark:hover:text-emerald-300"
                      href={item.href}
                      key={item.slug}
                    >
                      {item.title}
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </section>

        {landingDoc ? <DocsMarkdown html={landingDoc.html} /> : null}
      </div>
    </DocsLayout>
  );
}
