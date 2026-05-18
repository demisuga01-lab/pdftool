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
  Eraser,
  Expand,
  FileArchive,
  FileImage,
  Files,
  FileText,
  GitBranch,
  Image as ImageIcon,
  Info,
  Layers,
  Lock,
  RefreshCw,
  RotateCw,
  ScanSearch,
  Scissors,
  ShieldCheck,
  Stamp,
  Unlock,
  Upload,
} from "lucide-react";

import { PUBLIC_FILE_HANDLING_STATEMENT } from "@/lib/copy";
import { buildPageMetadata } from "@/lib/metadata";

const GITHUB_URL = "https://github.com/demisuga01-lab/pdftool";

export const metadata: Metadata = buildPageMetadata({
  title: "PDF and Image Workflows | PDFTools by WellFriend",
  description:
    "A practical open-source workspace for PDF and image jobs: merge, split, compress, convert, OCR, resize, crop, and watermark files without an account.",
  path: "/",
});

type ToolItem = {
  description: string;
  href: string;
  icon: LucideIcon;
  meta: string;
  name: string;
};

type ToolGroup = {
  description: string;
  id: string;
  title: string;
  tools: ToolItem[];
};

type LifecycleStep = {
  description: string;
  icon: LucideIcon;
  label: string;
  title: string;
};

const heroChips = ["No account", "Temporary processing", "25 MB/file"];

const commonJobs: ToolItem[] = [
  {
    name: "Compress a file",
    description: "Reduce file size for email, forms, and everyday sharing.",
    href: "/compress",
    icon: FileArchive,
    meta: "PDF, images, Office",
  },
  {
    name: "Convert formats",
    description: "Move between common document, image, text, and web formats.",
    href: "/convert",
    icon: RefreshCw,
    meta: "Shared converter",
  },
  {
    name: "OCR text",
    description: "Extract text from scans, screenshots, and PDF pages.",
    href: "/tools/ocr",
    icon: ScanSearch,
    meta: "PDF + image",
  },
  {
    name: "Merge PDFs",
    description: "Combine multiple PDF files into one organized document.",
    href: "/pdf/merge",
    icon: Files,
    meta: "PDF -> PDF",
  },
  {
    name: "Watermark files",
    description: "Add text or logo marks to PDF and image outputs.",
    href: "/pdf/watermark",
    icon: Stamp,
    meta: "PDF watermark",
  },
  {
    name: "Resize images",
    description: "Resize images for uploads, documents, and handoff.",
    href: "/image/resize",
    icon: Expand,
    meta: "Image output",
  },
];

const toolGroups: ToolGroup[] = [
  {
    id: "pdf-tools",
    title: "Fix a PDF",
    description: "Page-level cleanup before you send, archive, or publish a document.",
    tools: [
      {
        name: "Merge PDFs",
        description: "Combine multiple PDFs into one file.",
        href: "/pdf/merge",
        icon: Files,
        meta: "PDF -> PDF",
      },
      {
        name: "Split PDF",
        description: "Split pages into smaller downloads.",
        href: "/pdf/split",
        icon: Scissors,
        meta: "Pages -> ZIP/PDF",
      },
      {
        name: "Rotate PDF",
        description: "Fix page orientation before sharing.",
        href: "/pdf/rotate",
        icon: RotateCw,
        meta: "PDF pages",
      },
      {
        name: "Watermark PDF",
        description: "Add text or logo marks to pages.",
        href: "/pdf/watermark",
        icon: Stamp,
        meta: "PDF -> PDF",
      },
      {
        name: "Protect PDF",
        description: "Add password protection for a document.",
        href: "/pdf/protect",
        icon: Lock,
        meta: "Password",
      },
      {
        name: "Decrypt PDF",
        description: "Open a protected PDF when you have the password.",
        href: "/pdf/decrypt",
        icon: Unlock,
        meta: "Password required",
      },
    ],
  },
  {
    id: "convert-tools",
    title: "Convert or extract",
    description: "Move content out of fixed files or turn source documents into delivery formats.",
    tools: [
      {
        name: "Universal Convert",
        description: "Convert common document and image formats.",
        href: "/convert",
        icon: RefreshCw,
        meta: "Shared workspace",
      },
      {
        name: "PDF to Images",
        description: "Export PDF pages as image files.",
        href: "/pdf/to-images",
        icon: FileImage,
        meta: "PDF -> PNG/JPG",
      },
      {
        name: "Images to PDF",
        description: "Build a PDF from one or more images.",
        href: "/pdf/images-to-pdf",
        icon: ImageIcon,
        meta: "JPG/PNG -> PDF",
      },
      {
        name: "Office to PDF",
        description: "Convert Word, Excel, and presentation files to PDF.",
        href: "/pdf/office-to-pdf",
        icon: FileText,
        meta: "DOCX/XLSX/PPTX",
      },
      {
        name: "Extract Text",
        description: "Pull selectable text from PDF documents.",
        href: "/pdf/extract-text",
        icon: FileText,
        meta: "PDF -> TXT/HTML",
      },
      {
        name: "OCR",
        description: "Run OCR on scans and screenshots.",
        href: "/tools/ocr",
        icon: ScanSearch,
        meta: "Scans -> text",
      },
    ],
  },
  {
    id: "image-tools",
    title: "Clean up images",
    description: "Prepare images for uploads, documents, product sheets, and quick handoffs.",
    tools: [
      {
        name: "Resize Image",
        description: "Resize images for forms, sites, or attachments.",
        href: "/image/resize",
        icon: Expand,
        meta: "Width x height",
      },
      {
        name: "Batch Resize",
        description: "Resize many images from one archive.",
        href: "/image/batch-resize",
        icon: Layers,
        meta: "ZIP -> ZIP",
      },
      {
        name: "Crop Image",
        description: "Trim to the exact area you need.",
        href: "/image/crop",
        icon: Crop,
        meta: "Pixel crop",
      },
      {
        name: "Rotate Image",
        description: "Correct photo or artwork orientation.",
        href: "/image/rotate",
        icon: RotateCw,
        meta: "JPG/PNG/WebP",
      },
      {
        name: "Watermark Image",
        description: "Add a text watermark before sharing.",
        href: "/image/watermark",
        icon: Stamp,
        meta: "Image -> image",
      },
      {
        name: "Remove Background",
        description: "Cut out a subject and export transparency.",
        href: "/image/remove-background",
        icon: Eraser,
        meta: "PNG output",
      },
      {
        name: "Image Info",
        description: "Inspect dimensions, format, bands, and file size.",
        href: "/image/info",
        icon: Info,
        meta: "Metadata",
      },
    ],
  },
  {
    id: "compress-tools",
    title: "Reduce file size",
    description: "Start here when the file is ready but too large for upload fields or handoff.",
    tools: [
      {
        name: "Universal Compressor",
        description: "Compress PDFs, images, Office files, text, and archives.",
        href: "/compress",
        icon: FileArchive,
        meta: "Shared workspace",
      },
      {
        name: "Compress PDF",
        description: "Reduce PDF size with the PDF compression path.",
        href: "/compress?type=pdf",
        icon: FileText,
        meta: "PDF -> PDF",
      },
      {
        name: "Compress Images",
        description: "Optimize image files for upload and delivery.",
        href: "/compress?type=image",
        icon: ImageIcon,
        meta: "Image -> image",
      },
    ],
  },
];

const workflowPanelSteps: LifecycleStep[] = [
  {
    label: "01",
    title: "Upload",
    description: "report.pdf and scan.jpg",
    icon: Upload,
  },
  {
    label: "02",
    title: "Validate",
    description: "File type, size, and path checks",
    icon: ShieldCheck,
  },
  {
    label: "03",
    title: "Process",
    description: "Fast or heavy worker queue",
    icon: RefreshCw,
  },
  {
    label: "04",
    title: "Download",
    description: "PDF, ZIP, TXT, or image output",
    icon: Download,
  },
];

const lifecycleSteps: LifecycleStep[] = [
  {
    label: "01",
    title: "Upload",
    description: "Choose the file or archive for the selected tool. No account is required.",
    icon: Upload,
  },
  {
    label: "02",
    title: "Validate",
    description: "The backend checks type, size, paths, and tool-specific inputs before a job runs.",
    icon: ShieldCheck,
  },
  {
    label: "03",
    title: "Queue",
    description: "Short jobs and heavier OCR or conversion work are routed through workers.",
    icon: Layers,
  },
  {
    label: "04",
    title: "Process",
    description: "The worker writes the selected output into temporary result storage.",
    icon: RefreshCw,
  },
  {
    label: "05",
    title: "Download",
    description: "Download a single output or a ZIP when a workflow creates multiple files.",
    icon: Download,
  },
  {
    label: "06",
    title: "Cleanup",
    description: "Outputs are temporary and cleaned up after the configured retention period.",
    icon: Clock3,
  },
];

const transparencyItems = [
  {
    title: "25 MB per file",
    description: "The public workspace is tuned for everyday files, not massive archives.",
  },
  {
    title: "100 MB batch/archive total",
    description: "Batch limits keep shared processing predictable for everyone.",
  },
  {
    title: "Temporary processing",
    description: PUBLIC_FILE_HANDLING_STATEMENT,
  },
  {
    title: "No account required",
    description: "Pick a tool, upload a file, process it, and download the result.",
  },
  {
    title: "Use judgment",
    description: "Avoid highly sensitive files unless you trust the deployment and its operators.",
  },
];

function SectionHeader({
  eyebrow,
  title,
  description,
  align = "left",
}: {
  align?: "left" | "center";
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl">{title}</h2>
      <p className="mt-4 text-base leading-7 text-zinc-600 dark:text-zinc-300">{description}</p>
    </div>
  );
}

function FileWorkflowPanel() {
  return (
    <div className="rounded-3xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-base font-semibold text-zinc-950 dark:text-zinc-50">File workflow</p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Upload, process, download</p>
        </div>
        <div className="hidden gap-2 sm:flex">
          {["PDF", "JPG", "DOCX"].map((type) => (
            <span
              className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-semibold text-zinc-600 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-300"
              key={type}
            >
              {type}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {workflowPanelSteps.map((step, index) => {
          const Icon = step.icon;

          return (
            <div className="relative" key={step.title}>
              {index > 0 ? <div className="absolute -top-3 left-[1.35rem] h-3 border-l border-dashed border-zinc-300 dark:border-zinc-700" /> : null}
              <div className="flex gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-zinc-950">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-200">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">{step.title}</h3>
                    <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">{step.label}</span>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-300">{step.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs font-semibold text-zinc-500 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-400">
        <span>No account</span>
        <span className="text-zinc-300 dark:text-zinc-700">/</span>
        <span>Temporary outputs</span>
        <span className="text-zinc-300 dark:text-zinc-700">/</span>
        <span>25 MB/file</span>
      </div>
    </div>
  );
}

function CommonJobCard({ tool }: { tool: ToolItem }) {
  const Icon = tool.icon;

  return (
    <Link
      className="group flex min-h-[152px] flex-col rounded-3xl border border-zinc-200/90 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/35 dark:border-white/10 dark:bg-zinc-900 dark:hover:border-emerald-400/40"
      href={tool.href}
    >
      <div className="flex items-start justify-between gap-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-700 transition group-hover:border-emerald-200 group-hover:text-emerald-700 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-300 dark:group-hover:border-emerald-400/30 dark:group-hover:text-emerald-300">
          <Icon className="h-4 w-4" />
        </span>
        <ArrowRight className="h-4 w-4 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-emerald-600 dark:group-hover:text-emerald-300" />
      </div>
      <h3 className="mt-5 text-lg font-semibold text-zinc-950 dark:text-zinc-50">{tool.name}</h3>
      <p className="mt-2 flex-1 text-sm leading-6 text-zinc-600 dark:text-zinc-300">{tool.description}</p>
      <p className="mt-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400">{tool.meta}</p>
    </Link>
  );
}

function CompactToolLink({ tool }: { tool: ToolItem }) {
  const Icon = tool.icon;

  return (
    <Link
      className="group flex min-h-[70px] items-center gap-3 rounded-2xl border border-zinc-200/80 bg-zinc-50 px-3.5 py-3 transition hover:border-emerald-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/35 dark:border-white/10 dark:bg-zinc-950 dark:hover:border-emerald-400/40 dark:hover:bg-zinc-900"
      href={tool.href}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 transition group-hover:border-emerald-200 group-hover:text-emerald-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300 dark:group-hover:border-emerald-400/30 dark:group-hover:text-emerald-300">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-3">
          <span className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{tool.name}</span>
          <span className="hidden shrink-0 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 sm:inline">{tool.meta}</span>
        </span>
        <span className="mt-1 line-clamp-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">{tool.description}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400 transition group-hover:text-emerald-600 dark:group-hover:text-emerald-300" />
    </Link>
  );
}

function ToolGroupPanel({ group }: { group: ToolGroup }) {
  return (
    <section className="rounded-3xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900" id={group.id}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">{group.title}</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">{group.description}</p>
        </div>
        <span className="w-fit rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-500 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-400">
          {group.tools.length} tools
        </span>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {group.tools.map((tool) => (
          <CompactToolLink key={`${group.id}-${tool.href}-${tool.name}`} tool={tool} />
        ))}
      </div>
    </section>
  );
}

function LifecycleStepper() {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
      {lifecycleSteps.map((step, index) => {
        const Icon = step.icon;

        return (
          <div className="relative rounded-3xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900" key={step.title}>
            {index < lifecycleSteps.length - 1 ? (
              <div className="absolute left-8 top-full h-3 border-l border-dashed border-zinc-300 dark:border-zinc-700 md:hidden" />
            ) : null}
            <div className="flex items-center justify-between gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-300">
                <Icon className="h-4 w-4" />
              </span>
              <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">{step.label}</span>
            </div>
            <h3 className="mt-5 text-base font-semibold text-zinc-950 dark:text-zinc-50">{step.title}</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">{step.description}</p>
          </div>
        );
      })}
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="overflow-hidden bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <section className="border-b border-zinc-200/80 bg-zinc-100/70 dark:border-white/10 dark:bg-zinc-950">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[minmax(0,0.95fr)_minmax(390px,0.78fr)] lg:items-center lg:px-8 lg:py-16">
          <div className="max-w-3xl">
            <div className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-600 shadow-sm dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
              Open-source PDF & image workspace
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.07] tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl lg:text-[3.45rem]">
              Everyday PDF and image tools, without the clutter
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-zinc-600 dark:text-zinc-300 sm:text-lg">
              Upload a file, choose a tool, adjust settings, and download the result. Merge PDFs, compress files, convert formats, run OCR, resize images, and more with no account required.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link className="primary-button h-12 rounded-2xl px-5" href="#tools">
                Start with a tool
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link className="secondary-button h-12 rounded-2xl px-5 dark:bg-zinc-950" href="/docs">
                View docs
              </Link>
              <Link
                className="inline-flex h-12 items-center justify-center rounded-2xl px-2 text-sm font-semibold text-zinc-600 transition hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/35 dark:text-zinc-300 dark:hover:text-emerald-200"
                href="#lifecycle"
              >
                See file lifecycle
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {heroChips.map((chip) => (
                <span
                  className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-600 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300"
                  key={chip}
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>

          <FileWorkflowPanel />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8" id="tools">
        <SectionHeader
          eyebrow="Start with common jobs"
          title="The work people usually came here to finish."
          description="The fastest paths are kept visible first. Each card leads to an existing workspace route."
        />

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {commonJobs.map((tool) => (
            <CommonJobCard key={tool.href} tool={tool} />
          ))}
        </div>
      </section>

      <section className="border-y border-zinc-200/80 bg-white dark:border-white/10 dark:bg-zinc-900/45">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <SectionHeader
            eyebrow="Choose by workflow"
            title="Grouped by the job in front of you."
            description="Compact groups keep the full tool set available without making every route compete for attention."
          />
          <div className="mt-8 grid gap-5">
            {toolGroups.map((group) => (
              <ToolGroupPanel group={group} key={group.id} />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8" id="lifecycle">
        <SectionHeader
          align="center"
          eyebrow="File lifecycle"
          title="Built around upload, queue, output, and cleanup."
          description="PDFTools keeps the real processing path visible without turning the product into an operations dashboard."
        />
        <div className="mt-9">
          <LifecycleStepper />
        </div>
        <div className="mt-5 rounded-3xl border border-zinc-200/90 bg-white p-5 text-sm leading-7 text-zinc-600 shadow-sm dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
          Results depend on file complexity. When a job fails, the app keeps the message clear; include the job ID when available if you contact <a className="font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-200 dark:hover:text-emerald-100" href="mailto:support@wellfriend.online">support@wellfriend.online</a>.
        </div>
      </section>

      <section className="border-y border-zinc-200/80 bg-zinc-100/70 dark:border-white/10 dark:bg-zinc-900/45">
        <div className="mx-auto grid max-w-7xl gap-5 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.82fr)] lg:px-8">
          <div className="rounded-3xl border border-zinc-200/90 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900 sm:p-7">
            <SectionHeader
              eyebrow="Clear limits"
              title="No surprises before you upload."
              description="The hosted workspace is intentionally bounded: useful for everyday files, not permanent storage."
            />
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {transparencyItems.map((item) => (
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-zinc-950" key={item.title}>
                  <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">{item.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-200/90 bg-zinc-950 p-6 text-white shadow-sm dark:border-white/10 dark:bg-zinc-900 sm:p-7">
            <div className="flex h-full flex-col">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-900/70 bg-emerald-950/40 text-emerald-200">
                <GitBranch className="h-5 w-5" />
              </div>
              <h2 className="mt-6 text-3xl font-semibold tracking-tight">Open-source and self-hostable.</h2>
              <p className="mt-4 text-base leading-7 text-zinc-300">
                PDFTools is built as an open-source, self-hostable workspace using Next.js, FastAPI, Celery, and Redis. The public hosted version is available at tools.wellfriend.online.
              </p>
              <div className="mt-6 grid gap-2 text-sm text-zinc-300 sm:grid-cols-2">
                {["Next.js frontend", "FastAPI backend", "Celery workers", "Redis queue"].map((item) => (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2" key={item}>
                    {item}
                  </div>
                ))}
              </div>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row lg:mt-auto lg:pt-8">
                <Link
                  className="inline-flex h-12 items-center justify-center rounded-2xl bg-white px-5 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                  href={GITHUB_URL}
                  rel="noreferrer"
                  target="_blank"
                >
                  View GitHub
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <Link
                  className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/15 px-5 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                  href="/docs"
                >
                  Read docs
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="rounded-3xl border border-zinc-200/90 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900 sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_1.05fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Next file</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">Pick a tool and process your next file.</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {[
                { href: "/compress", label: "Compress" },
                { href: "/convert", label: "Convert" },
                { href: "/tools/ocr", label: "OCR" },
                { href: "#pdf-tools", label: "PDF tools" },
                { href: "#image-tools", label: "Image tools" },
              ].map((item) => (
                <Link
                  className="inline-flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 text-sm font-semibold text-zinc-800 transition hover:border-emerald-300 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/35 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:border-emerald-900 dark:hover:bg-emerald-950/30"
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
