import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DocsLayout } from "@/components/docs/DocsLayout";
import { DocsMarkdown } from "@/components/docs/DocsMarkdown";
import { DocsPagination } from "@/components/docs/DocsPagination";
import { PUBLIC_FILE_HANDLING_STATEMENT } from "@/lib/copy";
import {
  docsStaticParams,
  getDocBySlug,
  getDocPagination,
  getDocsForNavigation,
  isNoindexDoc,
} from "@/lib/docs";
import { buildPageMetadata } from "@/lib/metadata";

type DocsPageProps = {
  params: Promise<{
    slug?: string[];
  }>;
};

const MAINTAINER_NOTE =
  "This documentation contains operational commands for maintainers. It does not contain secrets. Never publish real .env files, credentials, private keys, or mailbox/admin passwords. Verify commands against the current VPS before running them.";

export const dynamicParams = false;

export function generateStaticParams() {
  return docsStaticParams();
}

export async function generateMetadata({ params }: DocsPageProps): Promise<Metadata> {
  const resolved = await params;
  const slug = resolved.slug?.join("/") ?? "";
  const doc = await getDocBySlug(slug);
  if (!doc) {
    return {
      title: "Documentation Not Found | PDFTools by WellFriend",
      robots: { index: false, follow: false },
    };
  }

  return buildPageMetadata({
    title:
      doc.audience === "user"
        ? `${doc.title} | PDFTools Help Center`
        : `${doc.title} | PDFTools Developer Docs`,
    description: doc.description,
    path: doc.href,
    robots: isNoindexDoc(slug) ? { index: false, follow: false } : undefined,
  });
}

export default async function DocsPage({ params }: DocsPageProps) {
  const resolved = await params;
  const slug = resolved.slug?.join("/") ?? "";
  const [doc, groups, pagination] = await Promise.all([
    getDocBySlug(slug),
    getDocsForNavigation(),
    getDocPagination(slug),
  ]);

  if (!doc) {
    notFound();
  }

  return (
    <DocsLayout activeSlug={doc.slug} groups={groups} headings={doc.headings}>
      <div className="space-y-6">
        <nav aria-label="Breadcrumb" className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          <Link className="transition hover:text-emerald-700 dark:hover:text-emerald-300" href="/">
            Home
          </Link>
          <span className="px-2 text-zinc-300 dark:text-zinc-600">/</span>
          <Link className="transition hover:text-emerald-700 dark:hover:text-emerald-300" href="/docs">
            Docs
          </Link>
          <span className="px-2 text-zinc-300 dark:text-zinc-600">/</span>
          <span className="text-zinc-700 dark:text-zinc-200">{doc.title}</span>
        </nav>

        <section className="tool-panel space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={[
                "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em]",
                doc.audience === "user"
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200"
                  : "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-200",
              ].join(" ")}
            >
              {doc.audience === "user" ? "Help Center" : "For Developers and Operators"}
            </span>
            <span className="rounded-full border border-zinc-200/80 bg-zinc-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-400">
              {doc.groupTitle}
            </span>
            {doc.noindex ? (
              <span className="rounded-full border border-zinc-200/80 bg-zinc-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-400">
                Noindex
              </span>
            ) : null}
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">
              {doc.title}
            </h1>
            <p className="max-w-3xl text-base leading-8 text-zinc-500 dark:text-zinc-300">{doc.description}</p>
          </div>
        </section>

        {doc.operational ? (
          <section className="rounded-[22px] border border-amber-200 bg-amber-50/90 px-5 py-4 text-sm leading-7 text-amber-900 shadow-sm dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
            <p className="font-semibold">Maintainer note</p>
            <p className="mt-2">{MAINTAINER_NOTE}</p>
          </section>
        ) : null}

        {doc.audience === "user" ? (
          <section className="rounded-[22px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm leading-7 text-emerald-900 shadow-sm dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
            <p className="font-semibold">File handling</p>
            <p className="mt-2">{PUBLIC_FILE_HANDLING_STATEMENT}</p>
          </section>
        ) : null}

        <DocsMarkdown html={doc.html} />

        <section className="rounded-[22px] border border-zinc-200/70 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {doc.audience === "user" ? "Need help or want to report an issue?" : "Need support or want to report an issue?"}
          </h2>
          <div className="mt-3 grid gap-3 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
            <p>
              Bugs, processing failures, security issues, and abuse reports:{" "}
              <a className="font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200" href="mailto:support@wellfriend.online">
                support@wellfriend.online
              </a>
            </p>
            <p>
              API access, feature requests, business, and partnerships:{" "}
              <a className="font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200" href="mailto:contact@wellfriend.online">
                contact@wellfriend.online
              </a>
            </p>
            <p>
              Community help, updates, and discussion:{" "}
              <a
                className="font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200"
                href="https://discord.gg/ZQFmYaQbVu"
                rel="noreferrer"
                target="_blank"
              >
                WellFriend Discord
              </a>
            </p>
            {doc.audience === "user" ? (
              <p>Include the tool name, file type, approximate size, exact error text, and job ID if one is shown.</p>
            ) : null}
          </div>
        </section>

        <section className="rounded-[22px] border border-zinc-200/70 bg-white p-5 text-sm leading-7 text-zinc-500 shadow-sm dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-400">
          <p>
            Docs source: <code>{`pdftools-documentation/${doc.source}`}</code>
          </p>
        </section>

        <DocsPagination next={pagination.next} previous={pagination.previous} />
      </div>
    </DocsLayout>
  );
}
