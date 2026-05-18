import type { Metadata } from "next";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  CheckCircle2,
  Download,
  FileArchive,
  Files,
  Grid2x2,
  Image as ImageIcon,
  Plus,
  RefreshCw,
  ScanSearch,
  ShieldCheck,
  Upload,
} from "lucide-react";

import { buildPageMetadata } from "@/lib/metadata";

const GITHUB_URL = "https://github.com/demisuga01-lab/pdftool";

export const metadata: Metadata = buildPageMetadata({
  title: "PDF and Image Workflows | PDFTools by WellFriend",
  description:
    "A practical open-source workspace for PDF and image jobs: merge, split, compress, convert, OCR, resize, crop, and watermark files with temporary processing and no account required.",
  path: "/",
});

type FileBadgeTone = "pdf" | "jpg" | "png" | "zip" | "txt";

type WorkflowStep = {
  description: string;
  icon: LucideIcon;
  label: string;
  step: string;
};

type ToolGroup = {
  description: string;
  href: string;
  icon: LucideIcon;
  title: string;
};

const trustChips = [
  { icon: CheckCircle2, label: "No account" },
  { icon: RefreshCw, label: "Temporary processing" },
  { icon: FileArchive, label: "25 MB/file" },
];

const workflowSteps: WorkflowStep[] = [
  {
    step: "01",
    icon: Upload,
    label: "Upload",
    description: "Add your PDF or image files",
  },
  {
    step: "02",
    icon: ShieldCheck,
    label: "Validate",
    description: "File type, size, and path checks",
  },
  {
    step: "03",
    icon: RefreshCw,
    label: "Process",
    description: "Fast or heavy worker queue",
  },
  {
    step: "04",
    icon: Download,
    label: "Download",
    description: "PDF, ZIP, TXT, or image output",
  },
];

const toolGroups: ToolGroup[] = [
  {
    title: "Merge & Split",
    description: "Combine PDFs or extract pages with ease.",
    href: "/pdf/split",
    icon: Files,
  },
  {
    title: "Compress",
    description: "Reduce file size for PDFs, images, and archives.",
    href: "/compress",
    icon: FileArchive,
  },
  {
    title: "Convert",
    description: "Convert PDFs and images across formats.",
    href: "/convert",
    icon: RefreshCw,
  },
  {
    title: "OCR",
    description: "Extract text from scanned documents.",
    href: "/tools/ocr",
    icon: ScanSearch,
  },
  {
    title: "Resize Images",
    description: "Resize, crop, and optimize images.",
    href: "/image/resize",
    icon: ImageIcon,
  },
  {
    title: "...and more",
    description: "Rotate, protect, unlock, watermark, and more.",
    href: "/docs",
    icon: Grid2x2,
  },
];

function TrustChip({
  icon: Icon,
  label,
}: {
  icon: LucideIcon;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-600 shadow-[0_8px_24px_rgba(15,23,42,0.04)] dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
      <Icon className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-300" />
      {label}
    </span>
  );
}

function FileTypeBadge({
  label,
  tone,
}: {
  label: string;
  tone: FileBadgeTone;
}) {
  const toneClass: Record<FileBadgeTone, string> = {
    pdf: "border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200",
    jpg: "border-lime-200 bg-lime-50 text-lime-700 dark:border-lime-500/20 dark:bg-lime-500/10 dark:text-lime-200",
    png: "border-violet-200 bg-violet-50 text-violet-600 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-200",
    zip: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200",
    txt: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-200",
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <span className={["flex h-14 w-12 items-end justify-center rounded-2xl border pb-2 text-[11px] font-bold uppercase shadow-sm", toneClass[tone]].join(" ")}>
        {label}
      </span>
    </div>
  );
}

function WorkflowStepCard({
  description,
  icon: Icon,
  isLast,
  label,
  step,
}: WorkflowStep & {
  isLast: boolean;
}) {
  return (
    <div className="relative">
      {!isLast ? (
        <div className="absolute left-7 top-[calc(100%+0.2rem)] hidden h-7 border-l border-dashed border-emerald-300/80 lg:block dark:border-emerald-900/80" />
      ) : null}
      <div className="rounded-[26px] border border-zinc-200/90 bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-zinc-900 dark:shadow-[0_12px_36px_rgba(0,0,0,0.22)]">
        <div className="flex items-start gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-700 text-white shadow-[0_10px_22px_rgba(5,150,105,0.18)] dark:bg-emerald-800 dark:shadow-none">
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1 pt-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">{label}</p>
                <p className="mt-1 text-sm leading-6 text-zinc-500 dark:text-zinc-400">{description}</p>
              </div>
              <span className="shrink-0 text-xs font-semibold tracking-[0.14em] text-zinc-400 dark:text-zinc-500">{step}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroWorkflowPanel() {
  return (
    <div className="relative overflow-hidden rounded-[32px] border border-zinc-200/90 bg-[#f8f5ef] p-4 shadow-[0_28px_80px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-[#12110f] dark:shadow-[0_28px_80px_rgba(0,0,0,0.32)] sm:p-5 lg:p-6">
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-70 dark:opacity-35"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(24,24,27,0.09) 1.05px, transparent 0)",
          backgroundSize: "18px 18px",
        }}
      />
      <div className="relative grid gap-4 lg:grid-cols-[112px_minmax(0,1fr)_112px]">
        <div className="rounded-[28px] border border-zinc-200/80 bg-white/88 p-4 backdrop-blur dark:border-white/10 dark:bg-zinc-950/88">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">Input</p>
          <div className="mt-5 flex flex-row items-end justify-between gap-3 lg:flex-col lg:items-center lg:justify-start">
            <FileTypeBadge label="PDF" tone="pdf" />
            <FileTypeBadge label="JPG" tone="jpg" />
            <FileTypeBadge label="PNG" tone="png" />
            <div className="flex h-16 w-14 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 text-center text-[11px] font-semibold text-zinc-600 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
              <Plus className="mb-1 h-4 w-4" />
              Add files
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {workflowSteps.map((step, index) => (
            <WorkflowStepCard
              description={step.description}
              icon={step.icon}
              isLast={index === workflowSteps.length - 1}
              key={step.step}
              label={step.label}
              step={step.step}
            />
          ))}
        </div>

        <div className="rounded-[28px] border border-zinc-200/80 bg-white/88 p-4 backdrop-blur dark:border-white/10 dark:bg-zinc-950/88">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">Output</p>
          <div className="mt-5 flex flex-row items-end justify-between gap-3 lg:flex-col lg:items-center lg:justify-start">
            <FileTypeBadge label="PDF" tone="pdf" />
            <FileTypeBadge label="ZIP" tone="zip" />
            <FileTypeBadge label="TXT" tone="txt" />
            <div className="flex h-16 w-14 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 text-center text-[11px] font-semibold text-zinc-600 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
              <Download className="mb-1 h-4 w-4" />
              Get results
            </div>
          </div>
        </div>
      </div>

      <div className="relative mt-4 flex items-center justify-center rounded-2xl border border-zinc-200/80 bg-white/70 px-4 py-3 text-xs font-semibold text-zinc-500 dark:border-white/10 dark:bg-zinc-950/70 dark:text-zinc-400">
        Temporary outputs / No account / 25 MB/file
      </div>
    </div>
  );
}

function ToolGroupTile({
  description,
  href,
  icon: Icon,
  title,
}: ToolGroup) {
  return (
    <Link
      className="group flex min-h-[210px] flex-col justify-between rounded-[28px] border border-zinc-200/90 bg-white p-5 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/35 dark:border-white/10 dark:bg-zinc-950 dark:hover:border-emerald-700"
      href={href}
    >
      <div>
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-emerald-700 transition group-hover:border-emerald-200 group-hover:bg-emerald-50 dark:border-white/10 dark:bg-zinc-900 dark:text-emerald-300 dark:group-hover:border-emerald-800 dark:group-hover:bg-emerald-950/40">
          <Icon className="h-5 w-5" />
        </span>
        <h3 className="mt-5 text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">{title}</h3>
        <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-300">{description}</p>
      </div>
      <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 transition group-hover:gap-3 dark:text-emerald-300">
        Learn more
        <ArrowRight className="h-4 w-4" />
      </span>
    </Link>
  );
}

export default function HomePage() {
  return (
    <main className="overflow-hidden bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.92),rgba(245,245,244,0.94)_38%,rgba(244,244,245,0.98)_100%)] text-zinc-950 dark:bg-[radial-gradient(circle_at_top,rgba(26,26,26,0.78),rgba(10,10,10,1)_42%,rgba(9,9,11,1)_100%)] dark:text-zinc-50">
      <section className="border-b border-zinc-200/80 dark:border-white/10">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-14 pt-10 sm:px-6 sm:pb-16 sm:pt-14 lg:grid-cols-[minmax(0,1.02fr)_minmax(520px,0.98fr)] lg:items-center lg:gap-12 lg:px-8 lg:pb-20 lg:pt-16">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-600 shadow-[0_10px_28px_rgba(15,23,42,0.04)] dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
              <span className="h-2 w-2 rounded-full bg-emerald-600 dark:bg-emerald-400" />
              Open-source PDF & image workspace
            </div>

            <h1 className="mt-6 max-w-4xl text-[3rem] font-semibold leading-[0.98] tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-[4.1rem] lg:text-[5.15rem]">
              Everyday PDF and image tools, without the clutter.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-600 dark:text-zinc-300 sm:text-lg">
              Upload a file, choose a tool, adjust settings, and download the result. Merge PDFs, compress files, convert formats, run OCR, resize images, and more — no account required.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Link className="primary-button h-12 rounded-2xl px-5 text-sm shadow-[0_14px_32px_rgba(5,150,105,0.16)] dark:shadow-none" href="#tools">
                Start with a tool
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link className="secondary-button h-12 rounded-2xl px-5 dark:bg-zinc-950" href="/docs">
                Explore all tools
              </Link>
            </div>

            <div className="mt-7 flex flex-wrap gap-2.5">
              {trustChips.map((chip) => (
                <TrustChip icon={chip.icon} key={chip.label} label={chip.label} />
              ))}
            </div>
          </div>

          <HeroWorkflowPanel />
        </div>
      </section>

      <section className="border-b border-zinc-200/80 bg-white/72 dark:border-white/10 dark:bg-zinc-950/45" id="tools">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] lg:gap-10 lg:px-8">
          <div className="max-w-md">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
              All the tools you need
            </p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-[3.2rem]">
              One workspace. Endless possibilities.
            </h2>
            <p className="mt-5 text-base leading-8 text-zinc-600 dark:text-zinc-300">
              Everything you need to work with PDFs and images in one lightweight workspace.
            </p>
            <div className="mt-8 rounded-[28px] border border-zinc-200/90 bg-[#f7f6f3] p-5 dark:border-white/10 dark:bg-[#131311]">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Open-source and self-hostable</p>
              <p className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                Use the hosted workspace or run PDFTools on your own infrastructure when you need deployment control.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link className="secondary-button h-11 rounded-2xl px-4 dark:bg-zinc-950" href={GITHUB_URL} rel="noreferrer" target="_blank">
                  View GitHub
                </Link>
                <Link className="secondary-button h-11 rounded-2xl px-4 dark:bg-zinc-950" href="/about">
                  About the stack
                </Link>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {toolGroups.map((group) => (
              <ToolGroupTile
                description={group.description}
                href={group.href}
                icon={group.icon}
                key={group.title}
                title={group.title}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <div className="rounded-[32px] border border-zinc-200/90 bg-white px-6 py-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-zinc-900 dark:shadow-[0_18px_44px_rgba(0,0,0,0.22)] sm:px-8">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div>
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Clear boundaries</p>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                Downloads are temporary, processing time depends on file complexity, and the public workspace is tuned for everyday files up to 25 MB each.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { href: "/compress", label: "Compress" },
                { href: "/convert", label: "Convert" },
                { href: "/tools/ocr", label: "OCR" },
                { href: "/pdf/merge", label: "PDF tools" },
              ].map((item) => (
                <Link
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 px-4 text-sm font-semibold text-zinc-800 transition hover:border-emerald-300 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/35 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/40"
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
