import Link from "next/link";

import { ToolCard } from "@/components/ui/ToolCard";
import { imageTools, pdfTools, sharedTools } from "@/lib/tools";

export default function HomePage() {
  const pdfCount = pdfTools.length;
  const imageCount = imageTools.length;
  const sharedCount = sharedTools.length;
  const totalCount = pdfCount + imageCount + sharedCount;

  return (
    <main className="bg-white">
      <section className="border-b border-[#E5E7EB]">
        <div className="mx-auto flex max-w-5xl flex-col items-center px-4 py-20 text-center sm:px-6 lg:px-8 lg:py-24">
          <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-[#2563EB]">
            Free · Open Source · No Signup
          </p>
          <h1 className="mt-5 max-w-4xl text-[38px] font-bold leading-[1.05] text-[#111827] sm:text-[46px] lg:text-[52px]">
            Every PDF and Image tool you need
          </h1>
          <p className="mt-5 max-w-[560px] text-[18px] font-medium leading-8 text-slate-500">
            Compress, convert, merge, split, OCR, resize and more. Free forever, no account needed.
          </p>

          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
            <Link className="primary-button min-w-[168px]" href="#pdf-tools">
              PDF Tools
            </Link>
            <Link className="secondary-button min-w-[168px]" href="#image-tools">
              Image Tools
            </Link>
          </div>

          <p className="mt-6 text-sm font-medium text-slate-400">
            {totalCount} tools available · Files deleted after 24 hours · Open source
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="space-y-14">
          <div className="space-y-5" id="shared-tools">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h2 className="text-[22px] font-semibold text-[#111827]">Shared Tools</h2>
                <span className="rounded-full bg-[#EFF6FF] px-2.5 py-1 text-[12px] font-semibold text-[#2563EB]">
                  {sharedCount} tools
                </span>
              </div>
              <p className="text-sm font-medium text-slate-500">
                Universal conversion and OCR for PDFs, Office files, spreadsheets, text, and images.
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
                <h2 className="text-[22px] font-semibold text-[#111827]">PDF Tools</h2>
                <span className="rounded-full bg-[#EFF6FF] px-2.5 py-1 text-[12px] font-semibold text-[#2563EB]">
                  {pdfCount} tools
                </span>
              </div>
              <p className="text-sm font-medium text-slate-500">
                Compress, convert, merge, split, protect, and extract from PDFs.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-5 md:grid-cols-3 xl:grid-cols-5">
              {pdfTools.map((tool) => (
                <ToolCard key={`${tool.category}-${tool.id}`} tool={tool} />
              ))}
            </div>
          </div>

          <div className="space-y-5 border-t border-[#E5E7EB] pt-14" id="image-tools">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h2 className="text-[22px] font-semibold text-[#111827]">Image Tools</h2>
                <span className="rounded-full bg-[#EFF6FF] px-2.5 py-1 text-[12px] font-semibold text-[#2563EB]">
                  {imageCount} tools
                </span>
              </div>
              <p className="text-sm font-medium text-slate-500">
                Convert, resize, compress, crop, watermark, and enhance images.
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
