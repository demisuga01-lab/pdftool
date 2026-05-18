import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  FileArchive,
  FileImage,
  Files,
  GitBranch,
  Layers,
  RefreshCw,
  ScanSearch,
  ShieldAlert,
} from "lucide-react";

import { PUBLIC_FILE_HANDLING_STATEMENT } from "@/lib/copy";
import { buildPageMetadata } from "@/lib/metadata";

const GITHUB_URL = "https://github.com/demisuga01-lab/pdftool";

export const metadata: Metadata = buildPageMetadata({
  title: "About PDFTools by WellFriend",
  description:
    "Learn what PDFTools by WellFriend is, what it helps with, and the honest boundaries of the current public PDF and image workspace.",
  path: "/about",
});

const whatItIs = [
  "Browser-based PDF and image workspace",
  "No-account public tools",
  "Temporary file processing",
  "Open-source and self-hostable base",
  "Built for common everyday document cleanup",
];

const useCases = [
  {
    title: "PDF cleanup",
    description: "Merge, split, rotate, watermark, protect, and decrypt PDF files.",
    icon: Files,
  },
  {
    title: "Conversion and OCR",
    description: "Convert formats, extract text, export pages, and run OCR on scans.",
    icon: ScanSearch,
  },
  {
    title: "Image work",
    description: "Resize, crop, rotate, watermark, remove backgrounds, and inspect image info.",
    icon: FileImage,
  },
  {
    title: "Compression",
    description: "Reduce file size for sharing, forms, uploads, and everyday handoff.",
    icon: FileArchive,
  },
];

const notItems = [
  "Not a user-account platform today",
  "Not the future authenticated API product yet",
  "Not permanent file storage",
  "Not a zero-retention secure vault",
  "Not unlimited processing",
];

const foundation = ["Next.js frontend", "FastAPI backend", "Celery workers", "Redis queue", "External processing tools", "VPS/self-hosted operation"];

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="max-w-3xl">
      <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">{title}</h2>
      <p className="mt-4 text-base leading-7 text-zinc-600 dark:text-zinc-300">{description}</p>
    </div>
  );
}

export default function AboutPage() {
  return (
    <main className="overflow-x-hidden bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <section className="border-b border-zinc-200/80 bg-zinc-100/70 dark:border-white/10 dark:bg-zinc-950">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">About PDFTools</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl">
            Practical PDF and image tools in one clean workspace
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-zinc-600 dark:text-zinc-300 sm:text-lg">
            PDFTools by WellFriend brings common document and image workflows into a single browser-based interface: upload, adjust, process, and download.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link className="primary-button h-12 rounded-2xl px-5 shadow-sm" href="/">
              Browse tools
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link className="secondary-button h-12 rounded-2xl px-5 dark:bg-zinc-950" href="/docs">
              Read docs
            </Link>
            <Link className="secondary-button h-12 rounded-2xl px-5 dark:bg-zinc-950" href="/contact">
              Contact
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[0.8fr_1fr] lg:px-8">
        <div className="rounded-3xl border border-zinc-200/90 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900">
          <SectionHeader
            eyebrow="What it is"
            title="A focused utility for everyday file work."
            description="The public workspace is intentionally simple: pick a tool, upload a supported file, adjust the available settings, and download the result."
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {whatItIs.map((item) => (
            <div className="flex gap-3 rounded-3xl border border-zinc-200/90 bg-white p-5 text-sm leading-6 text-zinc-600 shadow-sm dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300" key={item}>
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-300" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-zinc-200/80 bg-white dark:border-white/10 dark:bg-zinc-900/45">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <SectionHeader
            eyebrow="What it helps with"
            title="One interface for the file tasks that usually get scattered."
            description="PDFTools keeps the workflow consistent across PDF cleanup, conversion, OCR, image work, and compression."
          />
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {useCases.map((item) => {
              const Icon = item.icon;
              return (
                <div className="rounded-3xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900" key={item.title}>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-300">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-zinc-950 dark:text-zinc-50">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.82fr)] lg:px-8">
        <div className="rounded-3xl border border-zinc-200/90 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900 sm:p-7">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-300">
            <RefreshCw className="h-5 w-5" />
          </div>
          <h2 className="mt-6 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">Why it exists</h2>
          <p className="mt-4 text-base leading-8 text-zinc-600 dark:text-zinc-300">
            Many online file tools split every job into disconnected pages with different interfaces. PDFTools tries to keep the workflow consistent across upload, settings, processing, and download.
          </p>
          <p className="mt-4 text-base leading-8 text-zinc-600 dark:text-zinc-300">{PUBLIC_FILE_HANDLING_STATEMENT}</p>
        </div>

        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-950 shadow-sm dark:border-amber-400/25 dark:bg-amber-500/10 dark:text-amber-100 sm:p-7">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-300/70 bg-white/70 dark:border-amber-400/20 dark:bg-amber-500/10">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <h2 className="mt-6 text-3xl font-semibold tracking-tight">What it is not</h2>
          <div className="mt-5 grid gap-3">
            {notItems.map((item) => (
              <div className="rounded-2xl border border-amber-200/80 bg-white/65 px-4 py-3 text-sm font-semibold dark:border-amber-400/20 dark:bg-amber-500/10" key={item}>
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-zinc-200/80 bg-zinc-100/70 dark:border-white/10 dark:bg-zinc-900/45">
        <div className="mx-auto grid max-w-7xl gap-5 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[0.75fr_1fr] lg:px-8">
          <div className="rounded-3xl border border-zinc-200/90 bg-zinc-950 p-6 text-white shadow-sm dark:border-white/10 dark:bg-zinc-900 sm:p-7">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-400/25 bg-emerald-400/10 text-emerald-200">
              <GitBranch className="h-5 w-5" />
            </div>
            <h2 className="mt-6 text-3xl font-semibold tracking-tight">Open-source foundation</h2>
            <p className="mt-4 text-base leading-7 text-zinc-300">
              PDFTools is designed for VPS and self-hosted operation, with a browser frontend, backend workers, and external processing tools.
            </p>
            <Link
              className="mt-7 inline-flex h-12 items-center justify-center rounded-2xl bg-white px-5 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              href={GITHUB_URL}
              rel="noreferrer"
              target="_blank"
            >
              View GitHub
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {foundation.map((item) => (
              <div className="flex items-center gap-3 rounded-3xl border border-zinc-200/90 bg-white p-5 text-sm font-semibold text-zinc-700 shadow-sm dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200" key={item}>
                <Layers className="h-4 w-4 shrink-0 text-zinc-400" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="rounded-3xl border border-zinc-200/90 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900 sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Start here</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">Use the workspace, read the docs, or reach the team.</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { href: "/", label: "Browse tools" },
                { href: "/docs", label: "Read docs" },
                { href: "/contact", label: "Contact" },
              ].map((item) => (
                <Link
                  className="inline-flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 text-sm font-semibold text-zinc-800 transition hover:border-emerald-300 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/35 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:border-emerald-400/40 dark:hover:bg-emerald-500/10"
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
                  <ArrowRight className="h-4 w-4 shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
