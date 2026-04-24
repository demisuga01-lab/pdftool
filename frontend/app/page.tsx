import { ArrowRight, GitBranch } from "lucide-react";
import Link from "next/link";

import { ToolCard } from "@/components/ui/ToolCard";
import { imageTools, pdfTools } from "@/lib/tools";

export default function HomePage() {
  return (
    <main className="bg-white text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <section className="border-b-2 border-slate-950 dark:border-slate-100">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.35fr_0.85fr] lg:px-8 lg:py-20">
          <div className="space-y-10">
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#2563EB]">
                PDFTools by WellFriend
              </p>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-600 dark:text-slate-400">
                Free &amp; Open Source
              </p>
            </div>

            <div className="max-w-4xl space-y-6">
              <h1 className="max-w-5xl text-5xl font-semibold uppercase leading-none text-slate-950 dark:text-white sm:text-7xl lg:text-[5.5rem]">
                Process PDFs &amp; Images. No signup. No BS.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-700 dark:text-slate-300 sm:text-lg">
                A sharp, browser-first toolbox for file conversion, compression, extraction, and cleanup.
                Built to feel more like a utility belt than a marketing page.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                className="inline-flex items-center gap-2 border-2 border-slate-950 bg-slate-950 px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-white hover:text-slate-950 dark:border-slate-100 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-950 dark:hover:text-slate-100"
                href="#pdf-tools"
              >
                Browse PDF tools
                <ArrowRight className="h-4 w-4 text-[#2563EB]" />
              </Link>
              <Link
                className="inline-flex items-center gap-2 border-2 border-slate-950 px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-slate-950 transition hover:bg-slate-950 hover:text-white dark:border-slate-100 dark:text-slate-100 dark:hover:bg-slate-100 dark:hover:text-slate-950"
                href="https://github.com/demisuga01-lab/pdftool"
                rel="noreferrer"
                target="_blank"
              >
                <GitBranch className="h-4 w-4 text-[#2563EB]" />
                View source
              </Link>
            </div>

            <dl className="grid max-w-2xl grid-cols-2 gap-4 border-t-2 border-slate-950 pt-6 dark:border-slate-100 sm:grid-cols-4">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  Brand
                </dt>
                <dd className="mt-2 text-lg font-semibold">PDFTools by WellFriend</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  Subtitle
                </dt>
                <dd className="mt-2 text-lg font-semibold">Free &amp; Open Source</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  PDF
                </dt>
                <dd className="mt-2 text-lg font-semibold">{pdfTools.length} tools</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  Image
                </dt>
                <dd className="mt-2 text-lg font-semibold">{imageTools.length} tools</dd>
              </div>
            </dl>
          </div>

          <div className="lg:pt-10">
            <div className="border-2 border-slate-950 bg-slate-950 text-slate-50 shadow-[12px_12px_0_0_rgba(37,99,235,1)] dark:border-slate-100 dark:shadow-[12px_12px_0_0_rgba(255,255,255,0.2)]">
              <div className="flex items-center justify-between border-b border-white/20 px-5 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                <span>Terminal</span>
                <span className="text-[#60A5FA]">ready</span>
              </div>
              <div className="space-y-4 px-5 py-5 font-mono text-sm leading-7">
                <p>
                  <span className="text-[#60A5FA]">$</span> compress invoice-pack.pdf --quality balanced
                </p>
                <p>
                  <span className="text-[#60A5FA]">$</span> merge q1-report.pdf q2-report.pdf -o h1-report.pdf
                </p>
                <p>
                  <span className="text-[#60A5FA]">$</span> convert hero.png --format webp --width 1600
                </p>
                <p>
                  <span className="text-[#60A5FA]">$</span> extract-text contract.pdf --pages 2-5
                </p>
                <div className="border-t border-white/20 pt-4 text-xs uppercase tracking-[0.16em] text-slate-400">
                  Upload in the browser. Get the output. Keep moving.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-16 px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="space-y-6" id="pdf-tools">
          <div className="max-w-3xl space-y-3 border-l-4 border-[#2563EB] pl-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2563EB]">PDF Tools</p>
            <h2 className="text-3xl font-semibold uppercase tracking-tight text-slate-950 dark:text-white sm:text-4xl">
              Built for the ugly file chores you actually do every day
            </h2>
            <p className="text-base leading-7 text-slate-700 dark:text-slate-300">
              Compression, merging, conversion, extraction, and security tools without the usual detour
              through signup forms and soft-focus product copy.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {pdfTools.map((tool) => (
              <ToolCard key={`${tool.category}-${tool.id}`} tool={tool} />
            ))}
          </div>
        </div>

        <div className="space-y-6 border-t-2 border-slate-950 pt-16 dark:border-slate-100" id="image-tools">
          <div className="max-w-3xl space-y-3 border-l-4 border-[#2563EB] pl-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2563EB]">Image Tools</p>
            <h2 className="text-3xl font-semibold uppercase tracking-tight text-slate-950 dark:text-white sm:text-4xl">
              Image workflows with less ceremony and more signal
            </h2>
            <p className="text-base leading-7 text-slate-700 dark:text-slate-300">
              Resize, convert, crop, inspect, watermark, and batch process images in a layout that feels
              more like a dev console than a brochure.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {imageTools.map((tool) => (
              <ToolCard key={`${tool.category}-${tool.id}`} tool={tool} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
