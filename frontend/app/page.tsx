import Link from "next/link";

import { ToolCard } from "@/components/ui/ToolCard";
import { imageTools, pdfTools, sharedTools } from "@/lib/tools";

export default function HomePage() {
  const pdfCount = pdfTools.length;
  const imageCount = imageTools.length;
  const sharedCount = sharedTools.length;
  const totalCount = pdfCount + imageCount + sharedCount;

  return (
    <main className="bg-white dark:bg-zinc-950">
      <section className="border-b border-slate-200 dark:border-white/10">
        <div className="mx-auto flex max-w-5xl flex-col items-center px-4 py-14 text-center sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#059669] sm:text-[12px]">
            Unified Workspace · Open Source · No Signup
          </p>
          <h1 className="mt-4 max-w-4xl text-[28px] font-bold leading-[1.1] tracking-[-0.01em] text-zinc-900 dark:text-zinc-100 sm:mt-5 sm:text-[40px] sm:leading-[1.05] md:text-[46px] lg:text-[52px]">
            One coherent workspace for every PDF and image task
          </h1>
          <p className="mt-4 max-w-[560px] text-[15px] font-medium leading-7 text-slate-500 dark:text-zinc-300 sm:mt-5 sm:text-[18px] sm:leading-8">
            Upload once, adjust visually, process confidently, and download clean results without bouncing between mismatched tool screens.
          </p>

          <div className="mt-8 grid w-full max-w-xs grid-cols-1 gap-3 sm:mt-10 sm:flex sm:max-w-none sm:flex-row">
            <Link className="primary-button h-12 w-full sm:min-w-[168px]" href="#pdf-tools">
              PDF Tools
            </Link>
            <Link className="secondary-button h-12 w-full sm:min-w-[168px]" href="#image-tools">
              Image Tools
            </Link>
          </div>

          <p className="mt-6 text-xs font-medium text-zinc-400 dark:text-zinc-500 sm:text-sm">
            {totalCount} tools available · Files deleted after 24 hours · Open source
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
        <div className="space-y-10 sm:space-y-14">
          <div className="space-y-5" id="shared-tools">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h2 className="text-[22px] font-semibold text-zinc-900 dark:text-zinc-100">Shared Tools</h2>
                <span className="rounded-full bg-[#ECFDF5] px-2.5 py-1 text-[12px] font-semibold text-[#059669] dark:bg-emerald-500/10 dark:text-emerald-300">
                  {sharedCount} tools
                </span>
              </div>
              <p className="text-sm font-medium text-slate-500 dark:text-zinc-300">
                Conversion, compression, and OCR workspaces that adapt cleanly to PDFs, images, and mixed source files.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-5 md:grid-cols-3 xl:grid-cols-5">
              {sharedTools.map((tool) => (
                <ToolCard key={`${tool.category}-${tool.id}`} tool={tool} />
              ))}
            </div>
          </div>

          <div className="space-y-5" id="pdf-tools">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h2 className="text-[22px] font-semibold text-zinc-900 dark:text-zinc-100">PDF Tools</h2>
                <span className="rounded-full bg-[#ECFDF5] px-2.5 py-1 text-[12px] font-semibold text-[#059669] dark:bg-emerald-500/10 dark:text-emerald-300">
                  {pdfCount} tools
                </span>
              </div>
              <p className="text-sm font-medium text-slate-500 dark:text-zinc-300">
                Merge, split, rotate, protect, convert, watermark, and export PDFs from one consistent product flow.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-5 md:grid-cols-3 xl:grid-cols-5">
              {pdfTools.map((tool) => (
                <ToolCard key={`${tool.category}-${tool.id}`} tool={tool} />
              ))}
            </div>
          </div>

          <div className="space-y-5 border-t border-slate-200 pt-10 dark:border-white/10 sm:pt-14" id="image-tools">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h2 className="text-[22px] font-semibold text-zinc-900 dark:text-zinc-100">Image Tools</h2>
                <span className="rounded-full bg-[#ECFDF5] px-2.5 py-1 text-[12px] font-semibold text-[#059669] dark:bg-emerald-500/10 dark:text-emerald-300">
                  {imageCount} tools
                </span>
              </div>
              <p className="text-sm font-medium text-slate-500 dark:text-zinc-300">
                Resize, crop, rotate, watermark, remove backgrounds, and convert images with editor-first controls where they matter.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-5 md:grid-cols-3 xl:grid-cols-5">
              {imageTools.map((tool) => (
                <ToolCard key={`${tool.category}-${tool.id}`} tool={tool} />
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
