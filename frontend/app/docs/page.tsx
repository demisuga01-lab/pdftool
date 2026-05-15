import type { Metadata } from "next";
import Link from "next/link";

import { DocsLayout } from "@/components/docs/DocsLayout";
import { DocsMarkdown } from "@/components/docs/DocsMarkdown";
import { PUBLIC_FILE_HANDLING_STATEMENT } from "@/lib/copy";
import { getDocsForNavigation, getDocsLandingDocument } from "@/lib/docs";
import { imageTools, pdfTools, sharedTools } from "@/lib/tools";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Help Center | PDFTools by WellFriend",
  description:
    "Learn how to use PDFTools, choose the right PDF or image workflow, understand file handling, and troubleshoot failed jobs.",
  path: "/docs",
});

export default async function DocsIndexPage() {
  const [groups, landingDoc] = await Promise.all([
    getDocsForNavigation(),
    getDocsLandingDocument(),
  ]);

  const userGroups = groups.filter((group) => group.audience === "user");
  const technicalGroups = groups.filter((group) => group.audience === "technical");

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

        <section className="rounded-[28px] border border-zinc-200/70 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900 sm:p-8">
          <div className="space-y-4">
            <p className="tool-eyebrow">Help Center</p>
            <h1 className="max-w-4xl text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">
              Help for uploads, settings, processing, downloads, and tool selection
            </h1>
            <p className="max-w-3xl text-base leading-8 text-zinc-500 dark:text-zinc-300">
              Start with user guides and troubleshooting below. Technical references for developers and operators are
              still available, but they live in a separate section so everyday help stays easy to scan.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-zinc-200/80 bg-white px-4 py-3 text-sm shadow-sm dark:border-white/10 dark:bg-zinc-950">
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">{sharedTools.length} shared workspaces</p>
                <p className="mt-1 text-zinc-500 dark:text-zinc-400">Compress, convert, and OCR across common file types.</p>
              </div>
              <div className="rounded-2xl border border-zinc-200/80 bg-white px-4 py-3 text-sm shadow-sm dark:border-white/10 dark:bg-zinc-950">
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">{pdfTools.length} PDF tools</p>
                <p className="mt-1 text-zinc-500 dark:text-zinc-400">Merge, split, protect, watermark, convert, and more.</p>
              </div>
              <div className="rounded-2xl border border-zinc-200/80 bg-white px-4 py-3 text-sm shadow-sm dark:border-white/10 dark:bg-zinc-950">
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">{imageTools.length} image tools</p>
                <p className="mt-1 text-zinc-500 dark:text-zinc-400">Resize, crop, rotate, watermark, remove background, and inspect files.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="tool-panel space-y-6">
          <div className="space-y-2">
            <p className="tool-eyebrow">Start With User Help</p>
            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Most common questions, answered first</h2>
            <p className="max-w-3xl text-sm leading-7 text-zinc-500 dark:text-zinc-400">
              These guides cover what the product does, how to upload files, how processing works, what to do when a
              job fails, and how to contact the team when you need help.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {userGroups.map((group) => {
              const primaryDoc = group.items[0];
              if (!primaryDoc) {
                return null;
              }

              return (
                <Link
                  className="rounded-[24px] border border-zinc-200/70 bg-white p-5 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 dark:border-white/10 dark:bg-zinc-900 dark:hover:border-emerald-900 dark:hover:bg-zinc-800"
                  href={primaryDoc.href}
                  key={group.id}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500">{group.title}</p>
                  <h3 className="mt-3 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{primaryDoc.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-zinc-500 dark:text-zinc-400">{primaryDoc.description}</p>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="tool-panel space-y-5">
            <div className="space-y-2">
              <p className="tool-eyebrow">How It Works</p>
              <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">The typical workflow</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                "Choose the tool that matches your file and goal.",
                "Upload the file or files you want to process.",
                "Review the preview and adjust only the settings you need.",
                "Run the job, wait for the result, and download the finished file.",
              ].map((step, index) => (
                <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50 px-4 py-4 text-sm leading-7 text-zinc-600 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-300" key={step}>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">Step {index + 1}</p>
                  <p className="mt-2">{step}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="tool-panel space-y-5">
            <div className="space-y-2">
              <p className="tool-eyebrow">File Handling</p>
              <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Before you upload</h2>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm leading-7 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
              {PUBLIC_FILE_HANDLING_STATEMENT}
            </div>
            <p className="text-sm leading-7 text-zinc-500 dark:text-zinc-400">
              Use the privacy and troubleshooting guides if you need clearer guidance on sensitive files, failed jobs,
              or what details to include in a support request.
            </p>
          </div>
        </section>

        <section className="tool-panel space-y-6">
          <div className="space-y-2">
            <p className="tool-eyebrow">For Developers and Operators</p>
            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Technical references stay available here</h2>
            <p className="max-w-3xl text-sm leading-7 text-zinc-500 dark:text-zinc-400">
              Architecture, API, deployment, environment, queueing, security hardening, and release references are
              grouped separately so normal users can find help faster.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {technicalGroups.map((group) => (
              <section
                className="rounded-[22px] border border-zinc-200/70 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900"
                key={group.id}
              >
                <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{group.title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">{group.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {group.items.slice(0, 5).map((item) => (
                    <Link
                      className="inline-flex rounded-full border border-zinc-200/80 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-600 transition hover:border-emerald-300 hover:text-emerald-700 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:border-emerald-900 dark:hover:text-emerald-300"
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
