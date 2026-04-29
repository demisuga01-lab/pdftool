import Link from "next/link";

import {
  DocumentIcon,
  GlobeIcon,
  LinkArrowIcon,
  MailIcon,
  StackIcon,
} from "@/components/icons/SiteIcons";
import { StaticPage } from "@/components/ui/StaticPage";

const techList = [
  "Ghostscript",
  "MuPDF",
  "libvips",
  "Tesseract",
  "ImageMagick",
  "QPDF",
  "LibreOffice",
  "Cairo",
];

export default function AboutPage() {
  return (
    <StaticPage
      description="PDFTools is an open-source workspace for processing PDFs and images without signup friction."
      eyebrow="About"
      title="Built for developers, designers, and anyone who works with files"
      width="wide"
    >
      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-8">
          <section className="tool-panel space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#059669]/10 text-[#059669]">
                <StackIcon className="h-5 w-5" />
              </span>
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">What we built</h2>
            </div>
            <div className="space-y-4 text-[15px] leading-8 text-slate-600 dark:text-zinc-300">
              <p>20 tools across PDF and image processing.</p>
              <p>Built with Next.js 16 and FastAPI.</p>
              <p>Runs on open source software including {techList.join(", ")}.</p>
              <p>Self-hostable so anyone can run their own instance.</p>
              <Link
                className="inline-flex items-center gap-2 font-medium text-[#059669] hover:text-[#047857]"
                href="https://github.com/demisuga01-lab/pdftool"
                rel="noreferrer"
                target="_blank"
              >
                <LinkArrowIcon className="h-4 w-4" />
                https://github.com/demisuga01-lab/pdftool
              </Link>
            </div>
          </section>

          <section className="tool-panel space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#059669]/10 text-[#059669]">
                <DocumentIcon className="h-5 w-5" />
              </span>
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Why we built it</h2>
            </div>
            <div className="space-y-4 text-[15px] leading-8 text-slate-600 dark:text-zinc-300">
              <p>Most PDF tools are paywalled, ad-heavy, or require accounts.</p>
              <p>We believe file processing should be fast, private, and free.</p>
              <p>Your files stay on our server for processing and are deleted within 24 hours.</p>
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <section className="tool-panel space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#059669]/10 text-[#059669]">
                <GlobeIcon className="h-5 w-5" />
              </span>
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">API</h2>
            </div>
            <div className="space-y-4 text-[15px] leading-8 text-slate-600 dark:text-zinc-300">
              <p>API integration is currently in development.</p>
              <p>
                Developers will be able to integrate our processing tools directly into their
                applications.
              </p>
              <p>
                Contact for early access:
                {" "}
                <a className="font-medium text-[#059669] hover:text-[#047857]" href="mailto:contact@wellfriend.online">
                  contact@wellfriend.online
                </a>
              </p>
            </div>
          </section>

          <section className="tool-panel space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#059669]/10 text-[#059669]">
                <MailIcon className="h-5 w-5" />
              </span>
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Contact</h2>
            </div>
            <div className="space-y-4 text-[15px] leading-8 text-slate-600 dark:text-zinc-300">
              <p>Email: contact@wellfriend.online</p>
              <p>Response time: within 48 hours</p>
              <p>For bug reports, feature requests, enterprise pricing, and API early access.</p>
            </div>
          </section>
        </div>
      </div>
    </StaticPage>
  );
}
