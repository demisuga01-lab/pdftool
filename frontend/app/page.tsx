import type { Metadata } from "next";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Crop,
  Download,
  Expand,
  FileArchive,
  FileImage,
  Files,
  FileText,
  GitBranch,
  Image as ImageIcon,
  Layers,
  LifeBuoy,
  Lock,
  RefreshCw,
  RotateCw,
  ScanSearch,
  Scissors,
  Settings2,
  ShieldCheck,
  Sparkles,
  Stamp,
  Upload,
  Wand2,
} from "lucide-react";

import { PUBLIC_FILE_HANDLING_STATEMENT } from "@/lib/copy";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Fast PDF and Image Tools | PDFTools by WellFriend",
  description:
    "Merge, split, compress, convert, OCR, resize, crop, and watermark files in a clean browser workspace. No account required.",
  path: "/",
});

type ToolLink = {
  description?: string;
  href: string;
  icon: LucideIcon;
  name: string;
};

type ToolCategory = {
  description: string;
  eyebrow: string;
  id: string;
  tools: ToolLink[];
};

const quickActions: ToolLink[] = [
  {
    name: "Compress",
    description: "Reduce PDF, image, Office, text, and archive file sizes for easier sharing.",
    href: "/compress",
    icon: FileArchive,
  },
  {
    name: "Convert",
    description: "Move files between common PDF, image, Office, spreadsheet, text, and web formats.",
    href: "/convert",
    icon: RefreshCw,
  },
  {
    name: "OCR",
    description: "Extract text from PDFs and images when the source is a scan or screenshot.",
    href: "/tools/ocr",
    icon: ScanSearch,
  },
  {
    name: "Merge PDF",
    description: "Combine multiple PDFs into one organized document with a clear output.",
    href: "/pdf/merge",
    icon: Files,
  },
  {
    name: "Watermark",
    description: "Add text or logo marks to PDF files before publishing or sharing.",
    href: "/pdf/watermark",
    icon: Stamp,
  },
  {
    name: "Resize Image",
    description: "Resize images for uploads, documents, web pages, and everyday delivery.",
    href: "/image/resize",
    icon: Expand,
  },
];

const toolCategories: ToolCategory[] = [
  {
    id: "pdf-tools",
    eyebrow: "PDF tools",
    description: "Document workflows for combining, protecting, extracting, converting, and exporting PDF files.",
    tools: [
      { name: "Compress PDF", href: "/compress?type=pdf", icon: FileArchive },
      { name: "Merge PDF", href: "/pdf/merge", icon: Files },
      { name: "Split PDF", href: "/pdf/split", icon: Scissors },
      { name: "Rotate PDF", href: "/pdf/rotate", icon: RotateCw },
      { name: "Watermark PDF", href: "/pdf/watermark", icon: Stamp },
      { name: "Protect PDF", href: "/pdf/protect", icon: Lock },
      { name: "Decrypt PDF", href: "/pdf/decrypt", icon: ShieldCheck },
      { name: "Extract Text", href: "/pdf/extract-text", icon: FileText },
      { name: "PDF to Images", href: "/pdf/to-images", icon: FileImage },
      { name: "Images to PDF", href: "/pdf/images-to-pdf", icon: ImageIcon },
      { name: "Office to PDF", href: "/pdf/office-to-pdf", icon: FileText },
      { name: "OCR PDF", href: "/tools/ocr?input=pdf", icon: ScanSearch },
    ],
  },
  {
    id: "image-tools",
    eyebrow: "Image tools",
    description: "Editor-style tools for resizing, cleaning, inspecting, converting, and preparing images.",
    tools: [
      { name: "Compress Image", href: "/compress?type=image", icon: FileArchive },
      { name: "Convert Image", href: "/convert?from=image", icon: RefreshCw },
      { name: "Resize Image", href: "/image/resize", icon: Expand },
      { name: "Batch Resize", href: "/image/batch-resize", icon: Layers },
      { name: "Crop Image", href: "/image/crop", icon: Crop },
      { name: "Rotate Image", href: "/image/rotate", icon: RotateCw },
      { name: "Watermark Image", href: "/image/watermark", icon: Stamp },
      { name: "Remove Background", href: "/image/remove-background", icon: Wand2 },
      { name: "Image Info", href: "/image/info", icon: ImageIcon },
      { name: "OCR Image", href: "/tools/ocr?input=image", icon: ScanSearch },
    ],
  },
  {
    id: "shared-tools",
    eyebrow: "Shared tools",
    description: "General workspaces for mixed file processing across document and image workflows.",
    tools: [
      { name: "Compress", href: "/compress", icon: FileArchive },
      { name: "Convert", href: "/convert", icon: RefreshCw },
      { name: "OCR Workspace", href: "/tools/ocr", icon: ScanSearch },
    ],
  },
];

const trustChips = ["No account needed", "Temporary processing", "25 MB/file", "PDF + image workflows"];

const workflowSteps = [
  {
    title: "Upload",
    description: "Choose a supported PDF, image, Office file, text file, or archive for the selected tool.",
    icon: Upload,
  },
  {
    title: "Adjust settings",
    description: "Set page order, compression, output format, OCR, watermark, crop, or resize options where available.",
    icon: Settings2,
  },
  {
    title: "Process securely on the backend",
    description: "Jobs run server-side with validation, rate limits, safe error handling, and temporary file handling.",
    icon: ShieldCheck,
  },
  {
    title: "Download result",
    description: "When processing finishes, download the output file or a generated archive for multi-file results.",
    icon: Download,
  },
];

const reasons = [
  {
    title: "Unified workspace",
    description: "A consistent upload-to-download flow keeps common document tasks easy to repeat.",
    icon: Sparkles,
  },
  {
    title: "PDF + image tools",
    description: "Switch between documents, scans, and image edits without jumping into separate products.",
    icon: FileImage,
  },
  {
    title: "Mobile-friendly interface",
    description: "Responsive layouts keep tool choices, settings, and downloads clear on smaller screens.",
    icon: ImageIcon,
  },
  {
    title: "Open-source/self-hostable",
    description: "Use the public workspace or review and run the project in your own environment.",
    icon: GitBranch,
  },
  {
    title: "Clear support path",
    description: "Safe errors, docs, and support@wellfriend.online give users a practical place to turn.",
    icon: LifeBuoy,
  },
  {
    title: "Everyday document work",
    description: "Built for practical everyday document work, from quick cleanup to repeatable exports.",
    icon: CheckCircle2,
  },
];

const limits = [
  {
    title: "25 MB max file size",
    description: "Each uploaded file is limited to 25 MB on the public workspace.",
  },
  {
    title: "100 MB batch/archive total",
    description: "Batch and archive workflows are capped to keep shared processing predictable.",
  },
  {
    title: "Temporary processing",
    description: PUBLIC_FILE_HANDLING_STATEMENT,
  },
  {
    title: "Use judgment for sensitive files",
    description: "Avoid highly sensitive files unless you trust the deployment and its operators.",
  },
];

function SectionHeader({
  align = "left",
  eyebrow,
  title,
  description,
}: {
  align?: "left" | "center";
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-semibold text-zinc-950 dark:text-zinc-50 sm:text-4xl">{title}</h2>
      <p className="mt-4 text-base leading-7 text-zinc-600 dark:text-zinc-300">{description}</p>
    </div>
  );
}

function HeroVisual() {
  const flowItems = [
    { label: "Upload", detail: "report.pdf", icon: Upload },
    { label: "Process", detail: "Backend job", icon: RefreshCw },
    { label: "Download", detail: "optimized.pdf", icon: Download },
  ];

  return (
    <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
      <div className="relative rounded-3xl border border-zinc-200/80 bg-white/90 p-3 shadow-[0_24px_70px_rgba(15,23,42,0.13)] ring-1 ring-black/[0.03] backdrop-blur dark:border-white/10 dark:bg-zinc-900/90 dark:shadow-[0_30px_80px_rgba(0,0,0,0.35)] dark:ring-white/[0.04] sm:p-4">
        <div className="rounded-[1.35rem] border border-zinc-200/80 bg-zinc-50 dark:border-white/10 dark:bg-zinc-950">
          <div className="flex items-center justify-between border-b border-zinc-200/80 px-4 py-3 dark:border-white/10">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </div>
            <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-600 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
              tools.wellfriend.online
            </span>
          </div>

          <div className="grid gap-4 p-4 sm:p-5">
            <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/80 p-4 dark:border-emerald-400/20 dark:bg-emerald-500/10">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">Universal workspace</p>
                  <p className="mt-1 text-xs leading-5 text-emerald-700/80 dark:text-emerald-100/75">
                    Upload, adjust, process, and download from one flow.
                  </p>
                </div>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-emerald-700 shadow-sm dark:bg-zinc-950 dark:text-emerald-300">
                  No account
                </span>
              </div>
            </div>

            <div className="grid gap-3">
              {flowItems.map((item, index) => {
                const Icon = item.icon;
                const complete = index < 2;

                return (
                  <div
                    className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-zinc-900"
                    key={item.label}
                  >
                    <div
                      className={[
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border",
                        complete
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300"
                          : "border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-300",
                      ].join(" ")}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{item.label}</p>
                        {complete ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-300" /> : null}
                      </div>
                      <p className="mt-1 truncate text-xs text-zinc-500 dark:text-zinc-400">{item.detail}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_0.75fr]">
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-white/10 dark:bg-zinc-900">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Job progress</p>
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Processing</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div className="h-2 w-2/3 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                </div>
                <p className="mt-3 text-xs leading-5 text-zinc-500 dark:text-zinc-400">Large OCR and compression jobs can take longer depending on file complexity.</p>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-white/10 dark:bg-zinc-900">
                <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Limits</p>
                <p className="mt-2 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">25 MB</p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">per file</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickActionCard({ tool }: { tool: ToolLink }) {
  const Icon = tool.icon;

  return (
    <Link
      className="group flex h-full min-h-[178px] flex-col rounded-3xl border border-zinc-200/80 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)] transition hover:-translate-y-1 hover:border-emerald-300 hover:shadow-[0_22px_52px_rgba(15,23,42,0.1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 dark:border-white/10 dark:bg-zinc-900/95 dark:shadow-[0_20px_52px_rgba(0,0,0,0.24)] dark:hover:border-emerald-400/40"
      href={tool.href}
    >
      <div className="flex items-start justify-between gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700 transition group-hover:scale-[1.04] dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300">
          <Icon className="h-5 w-5" />
        </span>
        <ArrowRight className="h-5 w-5 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-emerald-600 dark:group-hover:text-emerald-300" />
      </div>
      <div className="mt-5">
        <h3 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">{tool.name}</h3>
        <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">{tool.description}</p>
      </div>
    </Link>
  );
}

function ToolCategoryPanel({ category }: { category: ToolCategory }) {
  return (
    <section
      className="rounded-3xl border border-zinc-200/80 bg-white p-5 shadow-[0_16px_42px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-zinc-900/95 dark:shadow-[0_22px_56px_rgba(0,0,0,0.24)] sm:p-6"
      id={category.id}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{category.eyebrow}</p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">{category.description}</p>
        </div>
        <span className="inline-flex w-fit rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-600 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-300">
          {category.tools.length} tools
        </span>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {category.tools.map((tool) => {
          const Icon = tool.icon;

          return (
            <Link
              className="group flex min-h-12 items-center gap-3 rounded-2xl border border-zinc-200/70 bg-zinc-50 px-3.5 py-3 transition hover:border-emerald-300 hover:bg-emerald-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/35 dark:border-white/10 dark:bg-zinc-950 dark:hover:border-emerald-400/40 dark:hover:bg-emerald-500/10"
              href={tool.href}
              key={`${category.id}-${tool.href}-${tool.name}`}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 transition group-hover:border-emerald-200 group-hover:text-emerald-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300 dark:group-hover:border-emerald-400/30 dark:group-hover:text-emerald-300">
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">{tool.name}</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400 transition group-hover:text-emerald-600 dark:group-hover:text-emerald-300" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <main className="overflow-hidden bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <section className="border-b border-zinc-200/80 bg-gradient-to-b from-zinc-100/80 via-zinc-50 to-white dark:border-white/10 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900/70">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 sm:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.86fr)] lg:items-center lg:px-8 lg:py-20 xl:gap-14">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-sm font-semibold text-emerald-800 shadow-sm dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-200">
              <Sparkles className="h-4 w-4" />
              PDFTools by WellFriend
            </div>

            <h1 className="mt-6 max-w-4xl text-4xl font-semibold leading-[1.06] text-zinc-950 dark:text-zinc-50 sm:text-5xl lg:text-6xl">
              Fast PDF and image tools in one clean workspace
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-zinc-600 dark:text-zinc-300 sm:text-lg">
              Merge, split, compress, convert, OCR, resize, crop, and watermark files directly in your browser. No account needed.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link className="primary-button h-12 rounded-2xl px-5 shadow-[0_18px_34px_rgba(5,150,105,0.22)]" href="#quick-actions">
                Start with a tool
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link className="secondary-button h-12 rounded-2xl px-5 dark:bg-zinc-950" href="/docs">
                View docs
              </Link>
              <Link
                className="inline-flex h-12 items-center justify-center rounded-2xl px-2 text-sm font-semibold text-zinc-600 transition hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/35 dark:text-zinc-300 dark:hover:text-emerald-300"
                href="#tools"
              >
                Browse all tools
              </Link>
            </div>

            <div className="mt-7 flex flex-wrap gap-2.5">
              {trustChips.map((chip) => (
                <span
                  className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3.5 py-2 text-sm font-semibold text-zinc-700 shadow-sm dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200"
                  key={chip}
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                  {chip}
                </span>
              ))}
            </div>
          </div>

          <HeroVisual />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8" id="quick-actions">
        <SectionHeader
          eyebrow="Quick actions"
          title="Start with the tool you need most."
          description="The most common PDF and image workflows are one click away, each linked to an existing workspace."
        />
        <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {quickActions.map((tool) => (
            <QuickActionCard key={tool.href} tool={tool} />
          ))}
        </div>
      </section>

      <section className="border-y border-zinc-200/80 bg-white dark:border-white/10 dark:bg-zinc-900/45" id="tools">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <SectionHeader
            align="center"
            eyebrow="Tool categories"
            title="Browse PDF, image, and shared workflows."
            description="Clean route groups keep the homepage scannable without hiding the tools people use for everyday document work."
          />
          <div className="mt-9 grid gap-5">
            {toolCategories.map((category) => (
              <ToolCategoryPanel category={category} key={category.id} />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="grid gap-9 lg:grid-cols-[0.78fr_1fr] lg:items-start">
          <SectionHeader
            eyebrow="How it works"
            title="A clear upload-to-download workflow."
            description="PDFTools keeps each job understandable: choose a file, tune the available options, let the backend process it, then download the result."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            {workflowSteps.map((step, index) => {
              const Icon = step.icon;

              return (
                <div
                  className="rounded-3xl border border-zinc-200/80 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-zinc-900/95 dark:shadow-[0_22px_52px_rgba(0,0,0,0.24)]"
                  key={step.title}
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="text-sm font-semibold text-zinc-400 dark:text-zinc-500">0{index + 1}</span>
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-zinc-950 dark:text-zinc-50">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">{step.description}</p>
                </div>
              );
            })}
          </div>
        </div>
        <p className="mt-5 rounded-2xl border border-zinc-200/80 bg-white px-4 py-3 text-sm leading-6 text-zinc-600 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
          Results depend on file complexity, source quality, and the selected workflow.
        </p>
      </section>

      <section className="border-y border-zinc-200/80 bg-zinc-100/70 dark:border-white/10 dark:bg-zinc-900/55">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <SectionHeader
            align="center"
            eyebrow="Why use PDFTools"
            title="Polished enough for daily work, practical enough to self-host."
            description="The product is built for common PDF and image tasks, with trustworthy limits and a calm interface instead of exaggerated enterprise claims."
          />
          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reasons.map((reason) => {
              const Icon = reason.icon;

              return (
                <div
                  className="rounded-3xl border border-zinc-200/80 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)] dark:border-white/10 dark:bg-zinc-950/80 dark:shadow-[0_22px_52px_rgba(0,0,0,0.22)]"
                  key={reason.title}
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold text-zinc-950 dark:text-zinc-50">{reason.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">{reason.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="grid gap-8 rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-[0_20px_56px_rgba(15,23,42,0.07)] dark:border-white/10 dark:bg-zinc-900/95 dark:shadow-[0_26px_64px_rgba(0,0,0,0.28)] sm:p-8 lg:grid-cols-[0.8fr_1fr] lg:items-start">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-sm font-semibold text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-200">
              <Clock3 className="h-4 w-4" />
              Limits and transparency
            </div>
            <h2 className="mt-5 text-3xl font-semibold text-zinc-950 dark:text-zinc-50">Clear constraints make the workspace easier to trust.</h2>
            <p className="mt-4 text-base leading-7 text-zinc-600 dark:text-zinc-300">
              PDFTools is designed for practical public web use. Limits, temporary processing, and rate limiting help keep the service predictable.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {limits.map((item) => (
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-zinc-950" key={item.title}>
                <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 sm:pb-20 lg:px-8">
        <div className="overflow-hidden rounded-3xl border border-emerald-200/80 bg-emerald-950 p-6 text-white shadow-[0_24px_70px_rgba(6,95,70,0.24)] dark:border-emerald-400/20 dark:bg-emerald-950 sm:p-8 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.82fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold text-emerald-200">Ready to process a file?</p>
              <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">Pick a tool and keep moving.</h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-emerald-50/85">
                Start with compression, conversion, OCR, or browse the PDF and image categories for the workflow that fits your file.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { href: "/compress", label: "Compress" },
                { href: "/convert", label: "Convert" },
                { href: "/tools/ocr", label: "OCR" },
                { href: "#pdf-tools", label: "PDF tools" },
                { href: "#image-tools", label: "Image tools" },
              ].map((item) => (
                <Link
                  className="inline-flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
