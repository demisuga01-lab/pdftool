import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  FileImage,
  FileText,
  HelpCircle,
  Image as ImageIcon,
  ScanSearch,
  Settings2,
  Sparkles,
  Wand2,
} from "lucide-react";

import { ToolCard } from "@/components/ui/ToolCard";
import { PUBLIC_FILE_HANDLING_STATEMENT } from "@/lib/copy";
import { buildPageMetadata } from "@/lib/metadata";
import { imageTools, pdfTools, sharedTools } from "@/lib/tools";

export const metadata: Metadata = buildPageMetadata({
  title: "PDF and Image Tools | PDFTools by WellFriend",
  description:
    "Use one polished workspace to compress, convert, merge, split, watermark, OCR, and export PDFs and images.",
  path: "/",
});

const popularTools = [
  {
    name: "Compress PDF",
    description: "Reduce file size while keeping documents ready to share.",
    href: "/compress?type=pdf",
    icon: FileText,
  },
  {
    name: "Merge PDF",
    description: "Combine pages and documents into one clean output.",
    href: "/pdf/merge",
    icon: FileText,
  },
  {
    name: "Convert PDF",
    description: "Move from PDF to Office, images, and other export targets.",
    href: "/convert?from=pdf&to=docx",
    icon: ArrowRight,
  },
  {
    name: "OCR PDF",
    description: "Extract readable text from scanned PDFs and images.",
    href: "/pdf/ocr",
    icon: ScanSearch,
  },
  {
    name: "Resize Image",
    description: "Prepare images for web, print, and document layouts.",
    href: "/image/resize",
    icon: ImageIcon,
  },
  {
    name: "Remove Background",
    description: "Cut out subjects for product shots and transparent exports.",
    href: "/image/remove-background",
    icon: Wand2,
  },
  {
    name: "Watermark PDF",
    description: "Apply text or logo marks before publishing files.",
    href: "/pdf/watermark",
    icon: Sparkles,
  },
  {
    name: "Watermark Image",
    description: "Add branded overlays to images in a consistent workflow.",
    href: "/image/watermark",
    icon: FileImage,
  },
];

const workflowSteps = [
  {
    title: "Upload",
    description: "Start with PDFs, images, or mixed source files in the same product shell.",
  },
  {
    title: "Adjust settings",
    description: "Choose compression, conversion, watermark, OCR, or export options with clear controls.",
  },
  {
    title: "Preview when available",
    description: "Review pages, layouts, and image edits before you process the final result.",
  },
  {
    title: "Process and download",
    description: "Run the selected tool, then download a clean output without switching products.",
  },
];

const categories = [
  {
    title: "PDF tools",
    description: "Merge, split, rotate, protect, watermark, and reorganize documents from one interface.",
    href: "#pdf-tools",
  },
  {
    title: "Image tools",
    description: "Resize, crop, rotate, watermark, remove backgrounds, and inspect image files with editor-first controls.",
    href: "#image-tools",
  },
  {
    title: "Convert and compress",
    description: "Handle common transformations, file size reduction, and cross-format workflows in shared workspaces.",
    href: "#shared-tools",
  },
  {
    title: "OCR and extraction",
    description: "Turn scans into searchable text and export structured content when source files are not already editable.",
    href: "/tools/ocr",
  },
];

function SectionHeader({
  eyebrow,
  title,
  description,
  titleId,
}: {
  eyebrow: string;
  title: string;
  description: string;
  titleId?: string;
}) {
  return (
    <div className="max-w-2xl space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">{eyebrow}</p>
      <h2 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-3xl" id={titleId}>
        {title}
      </h2>
      <p className="text-sm leading-7 text-zinc-600 dark:text-zinc-300 sm:text-base">{description}</p>
    </div>
  );
}

export default function HomePage() {
  const pdfCount = pdfTools.length;
  const imageCount = imageTools.length;
  const sharedCount = sharedTools.length;
  const totalCount = pdfCount + imageCount + sharedCount;

  return (
    <main className="bg-transparent">
      <section className="border-b border-zinc-200/80 dark:border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-8">
          <div className="grid gap-6 xl:min-h-[calc(100svh-8.5rem)] xl:grid-cols-[minmax(0,1.08fr)_minmax(300px,0.82fr)] xl:items-center xl:gap-8">
            <div className="max-w-3xl xl:max-w-[42rem]">
              <div className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                PDFTools by WellFriend
              </div>
              <div className="mt-4 space-y-4 sm:mt-5 sm:space-y-5">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                  Unified workspace, open source, no signup
                </p>
                <h1 className="max-w-3xl text-[2.5rem] font-semibold tracking-[-0.03em] text-zinc-950 dark:text-zinc-50 sm:text-[3.2rem] sm:leading-[0.98] lg:max-w-[11.5ch] lg:text-[3.75rem] lg:leading-[0.94]">
                  One clean workspace for PDF and image jobs.
                </h1>
                <p className="max-w-2xl text-[15px] leading-7 text-zinc-600 dark:text-zinc-300 sm:text-base sm:leading-7 lg:max-w-[36rem]">
                  Upload, adjust, process, and download in one polished WellFriend workspace for PDFs, images, OCR, and export tasks.
                </p>
              </div>

              <div className="mt-6 grid gap-3 sm:max-w-xl sm:grid-cols-2">
                <Link
                  className="primary-button h-12 rounded-2xl px-5 text-sm shadow-[0_16px_32px_rgba(5,150,105,0.18)] focus-visible:ring-4 focus-visible:ring-emerald-500/25 sm:h-[52px]"
                  href="#pdf-tools"
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="text-left">
                      <span className="block">PDF Tools</span>
                      <span className="block text-[11px] font-medium text-emerald-50/90">Merge, split, watermark, protect</span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0" />
                  </span>
                </Link>
                <Link
                  className="secondary-button h-12 rounded-2xl border-zinc-300 px-5 text-sm shadow-[0_14px_28px_rgba(15,23,42,0.06)] focus-visible:ring-4 focus-visible:ring-emerald-500/20 dark:border-white/10 dark:bg-zinc-900 sm:h-[52px]"
                  href="#image-tools"
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="text-left">
                      <span className="block font-semibold">Image Tools</span>
                      <span className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Resize, crop, remove backgrounds</span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0" />
                  </span>
                </Link>
              </div>

              <div className="mt-5 rounded-[26px] border border-zinc-200/80 bg-white p-4 shadow-[0_16px_38px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-zinc-900/95 dark:shadow-[0_20px_48px_rgba(0,0,0,0.22)] sm:p-5">
                <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200/80 pb-3 dark:border-white/10">
                  <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-700 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-200">
                    {totalCount} tools
                  </span>
                  <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-700 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-200">
                    Open source workspace
                  </span>
                  <Link
                    className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-700 transition hover:border-emerald-300 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/35 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-emerald-400/40 dark:hover:text-emerald-300"
                    href="/docs"
                  >
                    Help center
                  </Link>
                </div>
                <div className="grid gap-3 pt-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">File handling</p>
                    <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">{PUBLIC_FILE_HANDLING_STATEMENT}</p>
                  </div>
                  <div className="space-y-2 lg:border-l lg:border-zinc-200/80 lg:pl-4 dark:lg:border-white/10">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">Support</p>
                    <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                      Join the{" "}
                      <a
                        className="font-semibold text-emerald-700 transition hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200"
                        href="https://discord.gg/ZQFmYaQbVu"
                        rel="noreferrer"
                        target="_blank"
                      >
                        WellFriend Discord
                      </a>{" "}
                      or email <a className="font-semibold text-emerald-700 transition hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200" href="mailto:support@wellfriend.online">support@wellfriend.online</a>.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <aside className="rounded-[30px] border border-zinc-200/80 bg-white p-4 shadow-[0_18px_42px_rgba(15,23,42,0.07)] dark:border-white/10 dark:bg-zinc-900/95 dark:shadow-[0_24px_54px_rgba(0,0,0,0.24)] sm:p-5 xl:self-center">
              <div className="flex items-center justify-between gap-3 border-b border-zinc-200/80 pb-3 dark:border-white/10">
                <div>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">What the workspace covers</p>
                  <p className="mt-1 text-sm leading-6 text-zinc-500 dark:text-zinc-400">Common document and image tasks in one calm interface.</p>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-2.5 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                  <Settings2 className="h-[18px] w-[18px]" />
                </div>
              </div>
              <div className="mt-4 grid gap-2.5">
                {[
                  "PDF conversion, merge, split, rotate, protect, and watermark flows",
                  "Image resize, crop, rotate, background removal, and watermark tools",
                  "Shared OCR and compression workspaces for mixed upload types",
                  "A consistent upload, adjust, process, and download experience",
                ].map((item) => (
                  <div
                    className="flex items-start gap-3 rounded-2xl border border-zinc-200/80 bg-zinc-50 px-3.5 py-3 dark:border-white/10 dark:bg-zinc-950"
                    key={item}
                  >
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-300" />
                    <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">{item}</p>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="space-y-12 sm:space-y-16">
          <section aria-labelledby="popular-tools-heading" className="space-y-6">
            <SectionHeader
              eyebrow="Popular tools"
              title="Start with the tasks people reach for most."
              description="Quick entry points for common PDF and image jobs, each linked to the existing destination users already rely on."
              titleId="popular-tools-heading"
            />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {popularTools.map((tool) => {
                const Icon = tool.icon;
                const labelId = `popular-tool-${tool.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

                return (
                  <Link
                    aria-labelledby={labelId}
                    className="group rounded-[26px] border border-zinc-200/80 bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-[0_18px_42px_rgba(15,23,42,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/35 dark:border-white/10 dark:bg-zinc-900/95 dark:shadow-[0_20px_48px_rgba(0,0,0,0.22)] dark:hover:border-emerald-400/40"
                    href={tool.href}
                    key={tool.name}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                        <Icon className="h-5 w-5" />
                      </div>
                      <ArrowRight className="h-4 w-4 text-zinc-400 transition group-hover:text-emerald-600 dark:group-hover:text-emerald-300" />
                    </div>
                    <h3 className="mt-5 text-lg font-semibold text-zinc-950 dark:text-zinc-50" id={labelId}>
                      {tool.name}
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-300">{tool.description}</p>
                  </Link>
                );
              })}
            </div>
          </section>

          <section aria-labelledby="workflow-heading" className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start">
            <SectionHeader
              eyebrow="One workspace, many tasks"
              title="A consistent flow keeps the product simple even when the jobs change."
              description="Whether you are compressing a PDF, cleaning an image, or extracting text, the same product structure helps you move from upload to finished download with less friction."
              titleId="workflow-heading"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              {workflowSteps.map((step, index) => (
                <div
                  className="rounded-[26px] border border-zinc-200/80 bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)] dark:border-white/10 dark:bg-zinc-900/95 dark:shadow-[0_20px_48px_rgba(0,0,0,0.22)]"
                  key={step.title}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">Step {index + 1}</p>
                  <h3 className="mt-3 text-lg font-semibold text-zinc-950 dark:text-zinc-50">{step.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-300">{step.description}</p>
                </div>
              ))}
            </div>
          </section>

          <section aria-labelledby="tool-categories-heading" className="space-y-6">
            <SectionHeader
              eyebrow="Tool categories"
              title="Browse by workflow instead of hunting through one long list."
              description="The homepage keeps categories short, scannable, and linked to the same routes already used across PDFTools."
              titleId="tool-categories-heading"
            />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {categories.map((category) => (
                <Link
                  className="rounded-[24px] border border-zinc-200/80 bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)] transition hover:border-emerald-300 hover:shadow-[0_18px_42px_rgba(15,23,42,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/35 dark:border-white/10 dark:bg-zinc-900/95 dark:shadow-[0_20px_48px_rgba(0,0,0,0.22)] dark:hover:border-emerald-400/40"
                  href={category.href}
                  key={category.title}
                >
                  <h3 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">{category.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-300">{category.description}</p>
                  <p className="mt-4 text-sm font-semibold text-emerald-700 dark:text-emerald-300">Explore section</p>
                </Link>
              ))}
            </div>
          </section>

          <section aria-labelledby="help-center-heading" className="rounded-[32px] border border-zinc-200/80 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-zinc-900/95 dark:shadow-[0_24px_56px_rgba(0,0,0,0.24)] sm:p-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-600 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-300">
                  <HelpCircle className="h-3.5 w-3.5" />
                  Help center
                </div>
                <h2 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50" id="help-center-heading">
                  Need setup notes, workflow guidance, or deployment details?
                </h2>
                <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-300 sm:text-base">
                  Visit the docs for tool guides, implementation details, deployment help, and product information for PDFTools by WellFriend.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link className="primary-button h-12 rounded-2xl px-5" href="/docs">
                  Open help center
                </Link>
                <Link className="secondary-button h-12 rounded-2xl px-5 dark:bg-zinc-950" href="/contact">
                  Contact support
                </Link>
              </div>
            </div>
          </section>

          <div className="space-y-10 sm:space-y-14">
            <section className="space-y-5" id="shared-tools">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h2 className="text-[22px] font-semibold text-zinc-950 dark:text-zinc-50">Shared Tools</h2>
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[12px] font-semibold text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                      {sharedCount} tools
                    </span>
                  </div>
                  <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
                    Conversion, compression, and OCR workspaces that adapt to PDFs, images, and mixed source files.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                {sharedTools.map((tool) => (
                  <ToolCard key={`${tool.category}-${tool.id}`} tool={tool} />
                ))}
              </div>
            </section>

            <section className="space-y-5" id="pdf-tools">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h2 className="text-[22px] font-semibold text-zinc-950 dark:text-zinc-50">PDF Tools</h2>
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[12px] font-semibold text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                      {pdfCount} tools
                    </span>
                  </div>
                  <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
                    Merge, split, rotate, protect, convert, watermark, and export PDFs from one consistent product flow.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                {pdfTools.map((tool) => (
                  <ToolCard key={`${tool.category}-${tool.id}`} tool={tool} />
                ))}
              </div>
            </section>

            <section className="space-y-5 border-t border-zinc-200/80 pt-10 dark:border-white/10 sm:pt-14" id="image-tools">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h2 className="text-[22px] font-semibold text-zinc-950 dark:text-zinc-50">Image Tools</h2>
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[12px] font-semibold text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                      {imageCount} tools
                    </span>
                  </div>
                  <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
                    Resize, crop, rotate, watermark, remove backgrounds, and convert images with editor-first controls where they matter.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                {imageTools.map((tool) => (
                  <ToolCard key={`${tool.category}-${tool.id}`} tool={tool} />
                ))}
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
