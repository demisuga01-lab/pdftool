import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, FileText, Layers, LifeBuoy, ShieldCheck } from "lucide-react";

import { DocsLayout } from "@/components/docs/DocsLayout";
import { DocsSearch } from "@/components/docs/DocsSearch";
import { PUBLIC_FILE_HANDLING_STATEMENT } from "@/lib/copy";
import { getDocsForNavigation } from "@/lib/docs";
import { buildDocsSearchEntries, type DocsSearchEntry } from "@/lib/docs-search";
import { imageTools, pdfTools, sharedTools } from "@/lib/tools";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Help Center | PDFTools by WellFriend",
  description:
    "Find guides for uploads, tools, errors, deployment, file handling, and PDFTools operator documentation.",
  path: "/docs",
});

type FeaturedDoc = {
  fallbackDescription: string;
  fallbackTitle: string;
  href: string;
};

const userHelpDocs: FeaturedDoc[] = [
  {
    href: "/docs/getting-started",
    fallbackTitle: "Getting Started",
    fallbackDescription: "Choose tools, upload files, adjust settings, run jobs, and download results.",
  },
  {
    href: "/docs/pdf-tools",
    fallbackTitle: "PDF Tools",
    fallbackDescription: "Compare merge, split, convert, watermark, protect, decrypt, and OCR workflows.",
  },
  {
    href: "/docs/image-tools",
    fallbackTitle: "Image Tools",
    fallbackDescription: "Compare resize, compress, convert, crop, rotate, watermark, OCR, and background removal.",
  },
  {
    href: "/docs/troubleshooting",
    fallbackTitle: "Troubleshooting",
    fallbackDescription: "Fix upload issues, failed jobs, missing downloads, OCR problems, and preview glitches.",
  },
  {
    href: "/docs/file-handling-and-privacy",
    fallbackTitle: "File Handling & Privacy",
    fallbackDescription: "Understand temporary processing, file limits, and when to use caution.",
  },
  {
    href: "/docs/contact-and-support",
    fallbackTitle: "Contact & Support",
    fallbackDescription: "Know where to send bugs, processing failures, business questions, and API interest.",
  },
];

const technicalDocs: FeaturedDoc[] = [
  {
    href: "/docs/architecture",
    fallbackTitle: "Architecture",
    fallbackDescription: "System boundaries, request flow, services, workers, and storage.",
  },
  {
    href: "/docs/backend-api",
    fallbackTitle: "Backend API",
    fallbackDescription: "Backend route behavior, request patterns, and response notes.",
  },
  {
    href: "/docs/deployment",
    fallbackTitle: "Deployment",
    fallbackDescription: "Production deployment, restart, verification, and rollback steps.",
  },
  {
    href: "/docs/environment",
    fallbackTitle: "Environment",
    fallbackDescription: "Runtime configuration, env templates, and production values.",
  },
  {
    href: "/docs/workers-and-queues",
    fallbackTitle: "Workers & Queues",
    fallbackDescription: "Queue usage, task routing, and operational worker behavior.",
  },
  {
    href: "/docs/rate-limiting",
    fallbackTitle: "Rate Limiting",
    fallbackDescription: "Per-tool and per-bucket rate limiting behavior.",
  },
  {
    href: "/docs/security-hardening",
    fallbackTitle: "Security Hardening",
    fallbackDescription: "Upload, subprocess, archive, SVG, and error-safety controls.",
  },
  {
    href: "/docs/external-tools",
    fallbackTitle: "External Tools",
    fallbackDescription: "Host command dependencies used by PDF, image, OCR, and archive workflows.",
  },
];

const operatorDocs: FeaturedDoc[] = [
  {
    href: "/docs/production-checklist",
    fallbackTitle: "Production Checklist",
    fallbackDescription: "Release and deployment verification steps.",
  },
  {
    href: "/docs/operations",
    fallbackTitle: "Operations",
    fallbackDescription: "Daily and weekly PM2, Redis, disk, and runtime checks.",
  },
  {
    href: "/docs/testing-and-smoke-tests",
    fallbackTitle: "Smoke Tests",
    fallbackDescription: "Validation commands and high-value manual checks.",
  },
  {
    href: "/docs/troubleshooting-index",
    fallbackTitle: "Troubleshooting Index",
    fallbackDescription: "Symptom-based technical troubleshooting entry points.",
  },
  {
    href: "/docs/release-process",
    fallbackTitle: "Release Process",
    fallbackDescription: "Release workflow, coordination, and post-release checks.",
  },
];

function resolveDoc(entryList: DocsSearchEntry[], doc: FeaturedDoc) {
  const entry = entryList.find((item) => item.href === doc.href);
  return {
    category: entry?.category,
    description: entry?.description ?? doc.fallbackDescription,
    href: doc.href,
    title: entry?.title ?? doc.fallbackTitle,
  };
}

function DocCard({
  doc,
  entries,
  compact = false,
}: {
  compact?: boolean;
  doc: FeaturedDoc;
  entries: DocsSearchEntry[];
}) {
  const resolved = resolveDoc(entries, doc);

  return (
    <Link
      className={[
        "group block rounded-3xl border border-zinc-200/80 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/35 dark:border-white/10 dark:bg-zinc-900 dark:hover:border-emerald-400/40",
        compact ? "p-4" : "p-5",
      ].join(" ")}
      href={resolved.href}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          {resolved.category ? (
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">{resolved.category}</p>
          ) : null}
          <h3 className="mt-2 text-base font-semibold text-zinc-950 dark:text-zinc-50">{resolved.title}</h3>
        </div>
        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-emerald-600 dark:group-hover:text-emerald-300" />
      </div>
      <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">{resolved.description}</p>
    </Link>
  );
}

function MetricCard({
  description,
  icon: Icon,
  title,
}: {
  description: string;
  icon: typeof BookOpen;
  title: string;
}) {
  return (
    <div className="rounded-3xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-300">
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-4 text-base font-semibold text-zinc-950 dark:text-zinc-50">{title}</p>
      <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">{description}</p>
    </div>
  );
}

export default async function DocsIndexPage() {
  const groups = await getDocsForNavigation();
  const searchEntries = buildDocsSearchEntries(groups);

  return (
    <DocsLayout groups={groups} searchEntries={searchEntries}>
      <div className="space-y-8">
        <nav aria-label="Breadcrumb" className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          <Link className="transition hover:text-emerald-700 dark:hover:text-emerald-300" href="/">
            Home
          </Link>
          <span className="px-2 text-zinc-300 dark:text-zinc-600">/</span>
          <span className="text-zinc-700 dark:text-zinc-200">Docs</span>
        </nav>

        <section className="rounded-[32px] border border-zinc-200/80 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900 sm:p-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.72fr)] lg:items-center">
            <div>
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Help Center</p>
              <h1 className="mt-3 max-w-4xl text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl">
                Find the right guide for uploads, tools, errors, and deployment
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-zinc-600 dark:text-zinc-300">
                Start with user guides for everyday use, or jump into technical references for development and operations.
              </p>
            </div>
            <div>
              <DocsSearch entries={searchEntries} />
              <p className="mt-3 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                Search titles, tool names, upload issues, errors, deployment notes, and operational docs.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <MetricCard
            description="Compress, convert, and OCR workflows for mixed document and image jobs."
            icon={Layers}
            title={`${sharedTools.length} shared workspaces`}
          />
          <MetricCard
            description="Merge, split, protect, watermark, extract text, convert, and more."
            icon={FileText}
            title={`${pdfTools.length} PDF tools`}
          />
          <MetricCard
            description="Resize, crop, rotate, watermark, remove backgrounds, and inspect files."
            icon={BookOpen}
            title={`${imageTools.length} image tools`}
          />
        </section>

        <section className="rounded-[32px] border border-zinc-200/80 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900 sm:p-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Start with user help</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">Everyday use, tool choice, and troubleshooting</h2>
            </div>
            <LifeBuoy className="hidden h-6 w-6 text-zinc-300 dark:text-zinc-600 sm:block" />
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {userHelpDocs.map((doc) => (
              <DocCard doc={doc} entries={searchEntries} key={doc.href} />
            ))}
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.72fr)]">
          <div className="rounded-[32px] border border-zinc-200/80 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Technical references</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">Development and platform details</h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                  Architecture, APIs, deployment, queues, security hardening, and required host tooling.
                </p>
              </div>
              <ShieldCheck className="hidden h-6 w-6 text-zinc-300 dark:text-zinc-600 sm:block" />
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {technicalDocs.map((doc) => (
                <DocCard doc={doc} entries={searchEntries} key={doc.href} />
              ))}
            </div>
          </div>

          <aside className="space-y-5">
            <section className="rounded-[32px] border border-zinc-200/80 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900 sm:p-7">
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Operator checklist</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">When you maintain the deployment</h2>
              <div className="mt-5 grid gap-3">
                {operatorDocs.map((doc) => (
                  <DocCard compact doc={doc} entries={searchEntries} key={doc.href} />
                ))}
              </div>
            </section>

            <section className="rounded-[32px] border border-emerald-200/80 bg-emerald-50 p-6 text-emerald-950 shadow-sm dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-100">
              <p className="text-sm font-semibold">File handling</p>
              <p className="mt-3 text-sm leading-7">{PUBLIC_FILE_HANDLING_STATEMENT}</p>
              <p className="mt-3 text-sm leading-7">
                For failed jobs, include the tool name, file type, approximate size, exact error text, and job ID if one is shown.
              </p>
            </section>
          </aside>
        </section>
      </div>
    </DocsLayout>
  );
}
