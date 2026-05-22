import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileArchive,
  GitBranch,
  HelpCircle,
  KeyRound,
  Layers,
  ShieldCheck,
} from "lucide-react";

import { PUBLIC_FILE_HANDLING_STATEMENT } from "@/lib/copy";
import { buildPageMetadata } from "@/lib/metadata";

const GITHUB_URL = "https://github.com";

export const metadata: Metadata = buildPageMetadata({
  title: "Pricing and Limits | PDFTools by WellFriend",
  description:
    "Current PDFTools public web tools are free to use with clear upload limits, temporary processing, and no account required.",
  path: "/pricing",
});

const publicPlanItems = [
  "No account required",
  "25 MB per file",
  "100 MB batch/archive total",
  "Temporary processing",
  "PDF, image, compression, conversion, and OCR workflows",
  "Rate limits apply to keep the public service available",
];

const limits = [
  {
    title: "25 MB",
    label: "Max file size",
    description: "Each uploaded file is limited to 25 MB on the public web workspace.",
  },
  {
    title: "100 MB",
    label: "Batch uploads",
    description: "Batch uploads and archive workflows are capped at 100 MB total.",
  },
  {
    title: "100 MB",
    label: "Extracted archives",
    description: "Archive extraction is bounded to avoid runaway storage and processing.",
  },
  {
    title: "200 files",
    label: "Archive file count",
    description: "Extracted archives are limited to 200 files.",
  },
];

const faqs = [
  {
    question: "Do I need an account?",
    answer: "No. The public web tools are available without creating an account.",
  },
  {
    question: "Are the tools free?",
    answer: "Yes. The public web workspace is currently free to use with the published file and rate limits.",
  },
  {
    question: "What are the upload limits?",
    answer: "The public limits are 25 MB per file and 100 MB for batch or archive workflows.",
  },
  {
    question: "Is the API available?",
    answer: "No. An authenticated API platform is planned, but API keys and paid plans are not live today.",
  },
  {
    question: "Can I self-host?",
    answer: "Yes. PDFTools is open-source and self-hostable for teams that need their own infrastructure or custom limits.",
  },
];

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

export default function PricingPage() {
  return (
    <main className="overflow-x-hidden bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <section className="border-b border-zinc-200/80 bg-zinc-100/70 dark:border-white/10 dark:bg-zinc-950">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.52fr)] lg:items-center">
            <div>
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Pricing & limits</p>
              <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl">
                Free public tools today. Clear limits, no account required.
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-zinc-600 dark:text-zinc-300 sm:text-lg">
                PDFTools is currently available as a free public web workspace for common PDF and image tasks. Upload files, process them temporarily, and download results without creating an account.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link className="primary-button h-12 rounded-2xl px-5 shadow-sm" href="/">
                  Start with a tool
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <Link className="secondary-button h-12 rounded-2xl px-5 dark:bg-zinc-950" href="/contact">
                  Contact us
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-zinc-200/90 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">Public web tools</p>
                  <p className="mt-2 text-5xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">Free</p>
                </div>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                  Current
                </span>
              </div>
              <div className="mt-6 grid gap-3">
                {publicPlanItems.map((item) => (
                  <div className="flex gap-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300" key={item}>
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-300" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              <Link className="primary-button mt-7 h-12 w-full rounded-2xl shadow-sm" href="/">
                Browse tools
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <SectionHeader
          eyebrow="Public limits"
          title="Limits help keep the public service stable for everyone."
          description="PDFTools is meant for everyday document and image work. Large OCR, compression, and conversion jobs can take longer depending on source quality and file complexity."
        />
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {limits.map((limit) => (
            <div className="rounded-3xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900" key={limit.label}>
              <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">{limit.label}</p>
              <p className="mt-3 text-3xl font-semibold text-zinc-950 dark:text-zinc-50">{limit.title}</p>
              <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300">{limit.description}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-3xl border border-zinc-200/90 bg-white p-5 text-sm leading-7 text-zinc-600 shadow-sm dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
          <Clock3 className="mb-3 h-5 w-5 text-zinc-400" />
          Temporary file retention is controlled by runtime cleanup. {PUBLIC_FILE_HANDLING_STATEMENT}
        </div>
      </section>

      <section className="border-y border-zinc-200/80 bg-white dark:border-white/10 dark:bg-zinc-900/45">
        <div className="mx-auto grid max-w-7xl gap-5 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-2 lg:px-8">
          <div className="rounded-3xl border border-zinc-200/90 bg-zinc-50 p-6 shadow-sm dark:border-white/10 dark:bg-zinc-950">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
              <KeyRound className="h-5 w-5" />
            </div>
            <h2 className="mt-6 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">Future API platform</h2>
            <p className="mt-4 text-base leading-7 text-zinc-600 dark:text-zinc-300">
              An authenticated API platform with API keys, quotas, webhooks, and usage-based plans is planned, but it is not live yet.
            </p>
            <div className="mt-5 inline-flex rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-600 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
              Planned, not current
            </div>
            <Link className="secondary-button mt-6 h-12 rounded-2xl px-5 dark:bg-zinc-900" href="/contact">
              Ask about API access
            </Link>
          </div>

          <div className="rounded-3xl border border-zinc-200/90 bg-zinc-950 p-6 text-white shadow-sm dark:border-white/10 dark:bg-zinc-900">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-400/25 bg-emerald-400/10 text-emerald-200">
              <GitBranch className="h-5 w-5" />
            </div>
            <h2 className="mt-6 text-3xl font-semibold tracking-tight">Open-source and self-hostable</h2>
            <p className="mt-4 text-base leading-7 text-zinc-300">
              Teams that need private infrastructure, custom limits, or deployment control can run their own PDFTools instance.
            </p>
            <div className="mt-6 grid gap-2 text-sm text-zinc-300 sm:grid-cols-2">
              {["Next.js frontend", "FastAPI backend", "Celery workers", "Redis queue"].map((item) => (
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2" key={item}>
                  {item}
                </div>
              ))}
            </div>
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
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <SectionHeader
          eyebrow="FAQ"
          title="Straight answers before you upload."
          description="No fake pricing tiers, no hidden account requirement, and no current API key flow."
        />
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {faqs.map((item) => (
            <div className="rounded-3xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900" key={item.question}>
              <HelpCircle className="h-5 w-5 text-zinc-400" />
              <h3 className="mt-4 text-base font-semibold text-zinc-950 dark:text-zinc-50">{item.question}</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">{item.answer}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 rounded-3xl border border-zinc-200/90 bg-white p-5 text-sm leading-7 text-zinc-600 shadow-sm dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
          <ShieldCheck className="mb-3 h-5 w-5 text-zinc-400" />
          Avoid highly sensitive files unless you trust the deployment and its operators.
        </div>
      </section>
    </main>
  );
}
