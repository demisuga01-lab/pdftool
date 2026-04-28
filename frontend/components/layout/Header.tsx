"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  ChevronDownIcon,
  CloseIcon,
  MenuIcon,
} from "@/components/icons/SiteIcons";
import { Logo } from "@/components/ui/Logo";
import { imageTools, pdfTools } from "@/lib/tools";
import { GitBranch } from "lucide-react";

function NavDropdown({
  label,
  items,
}: {
  label: string;
  items: Array<{ href: string; name: string }>;
}) {
  const [open, setOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const openMenu = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setOpen(true);
  };

  const closeMenu = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = setTimeout(() => {
      setOpen(false);
      closeTimerRef.current = null;
    }, 150);
  };

  const toggleMenu = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setOpen((current) => !current);
  };

  return (
    <div
      className="relative"
      onMouseEnter={openMenu}
      onMouseLeave={closeMenu}
    >
      <button
        aria-expanded={open}
        className="inline-flex h-9 items-center rounded-lg px-3 text-sm font-semibold text-slate-600 transition hover:bg-[#F9FAFB] hover:text-[#111827] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/20"
        onClick={toggleMenu}
        onFocus={openMenu}
        type="button"
      >
        <span>{label}</span>
        <ChevronDownIcon className="ml-1 h-4 w-4" />
      </button>

      <div
        className={[
          "absolute left-0 top-full z-50 w-64 origin-top-left pt-2 transition duration-150",
          open ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-1 opacity-0",
        ].join(" ")}
        onFocus={openMenu}
      >
        <div className="space-y-1 rounded-lg border border-[#E5E7EB] bg-white p-2 shadow-lg shadow-slate-900/8">
          {items.map((item) => (
            <Link
              className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-[#F9FAFB] hover:text-[#111827]"
              href={item.href}
              key={item.href}
              onClick={() => setOpen(false)}
            >
              {item.name}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const desktopPdfTools = useMemo(() => pdfTools, []);
  const desktopImageTools = useMemo(() => imageTools, []);
  const convertItems = useMemo(
    () => [
      { href: "/convert", name: "Converter Workspace" },
      { href: "/convert?from=pdf&to=docx", name: "PDF to Word" },
      { href: "/convert?from=pdf&to=xlsx", name: "PDF to Excel" },
      { href: "/convert?from=pdf&to=png", name: "PDF to Images" },
      { href: "/convert?from=pdf&to=txt", name: "PDF to Text" },
      { href: "/convert?from=pdf&to=html", name: "PDF to HTML" },
      { href: "/convert?from=image&to=pdf", name: "Images to PDF" },
      { href: "/convert?from=docx&to=pdf", name: "Word to PDF" },
      { href: "/convert?from=xlsx&to=pdf", name: "Excel to PDF" },
      { href: "/convert?from=pptx&to=pdf", name: "PowerPoint to PDF" },
      { href: "/convert?from=csv&to=xlsx", name: "CSV to Excel" },
      { href: "/convert?from=image&to=webp", name: "Image to WebP" },
      { href: "/convert?from=svg&to=pdf", name: "SVG to PDF" },
    ],
    [],
  );
  const compressItems = useMemo(
    () => [
      { href: "/compress?type=pdf", name: "Compress PDF" },
      { href: "/compress?type=image", name: "Compress Image" },
      { href: "/compress?type=office", name: "Compress Office File" },
      { href: "/compress?type=text", name: "Compress Text / Code" },
      { href: "/compress?type=archive", name: "Compress Archive" },
      { href: "/compress", name: "Universal Compressor" },
    ],
    [],
  );
  const ocrItems = useMemo(
    () => [
      { href: "/tools/ocr", name: "OCR Workspace" },
      { href: "/tools/ocr?input=pdf", name: "PDF OCR" },
      { href: "/tools/ocr?input=image", name: "Image OCR" },
      { href: "/tools/ocr?input=pdf&output=searchable_pdf", name: "Searchable PDF" },
      { href: "/tools/ocr?output=txt", name: "OCR to TXT" },
      { href: "/tools/ocr?output=docx", name: "OCR to DOCX" },
      { href: "/tools/ocr?output=json", name: "OCR to JSON" },
      { href: "/tools/ocr?output=hocr", name: "OCR to HOCR" },
    ],
    [],
  );

  const mobileGroups = useMemo(
    () => [
      { label: "PDF Tools", items: desktopPdfTools },
      { label: "Image Tools", items: desktopImageTools },
      { label: "Convert", items: convertItems.map((item) => ({ href: item.href, name: item.name })) },
      { label: "Compress", items: compressItems.map((item) => ({ href: item.href, name: item.name })) },
      { label: "OCR", items: ocrItems.map((item) => ({ href: item.href, name: item.name })) },
    ],
    [compressItems, convertItems, desktopImageTools, desktopPdfTools, ocrItems],
  );

  return (
    <header className="sticky top-0 z-50 border-b border-[#E5E7EB] bg-white/95 backdrop-blur">
      <div className="mx-auto grid h-20 max-w-[1560px] grid-cols-[1fr_auto_1fr] items-center px-10 xl:px-14">
        <div className="justify-self-start pl-2">
          <Logo />
        </div>

        <nav className="hidden items-center justify-center gap-6 justify-self-center md:flex">
          <NavDropdown
            items={desktopPdfTools.map((tool) => ({ href: tool.href, name: tool.name }))}
            label="PDF Tools"
          />
          <NavDropdown
            items={desktopImageTools.map((tool) => ({ href: tool.href, name: tool.name }))}
            label="Image Tools"
          />
          <NavDropdown items={convertItems} label="Convert" />
          <NavDropdown items={compressItems} label="Compress" />
          <NavDropdown items={ocrItems} label="OCR" />
          <Link
            className="inline-flex h-9 items-center rounded-lg px-3 text-sm font-semibold text-slate-600 transition hover:bg-[#F9FAFB] hover:text-[#111827]"
            href="/pricing"
          >
            Pricing
          </Link>
          <Link
            className="inline-flex h-9 items-center rounded-lg px-3 text-sm font-semibold text-slate-600 transition hover:bg-[#F9FAFB] hover:text-[#111827]"
            href="/about"
          >
            About
          </Link>
        </nav>

        <div className="hidden justify-self-end pr-2 md:flex md:items-center md:justify-end">
          <Link
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#D1D5DB] px-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-[#F9FAFB] hover:text-[#111827]"
            href="https://github.com/demisuga01-lab/pdftool"
            rel="noreferrer"
            target="_blank"
          >
            <GitBranch className="h-4 w-4" />
            GitHub
          </Link>
        </div>

        <button
          aria-expanded={mobileOpen}
          aria-label="Toggle navigation"
          className="inline-flex h-9 w-9 items-center justify-center justify-self-end rounded-lg border border-[#D1D5DB] text-slate-600 transition hover:bg-[#F9FAFB] hover:text-[#111827] md:hidden"
          onClick={() => setMobileOpen((current) => !current)}
          type="button"
        >
          {mobileOpen ? <CloseIcon className="h-4 w-4" /> : <MenuIcon className="h-4 w-4" />}
        </button>
      </div>

      {mobileOpen ? (
        <div className="border-t border-[#E5E7EB] bg-white px-4 py-4 md:hidden">
          <div className="space-y-5">
            {mobileGroups.map((group) => (
              <div className="space-y-2" key={group.label}>
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
                  {group.label}
                </p>
                <div className="grid gap-1">
                  {group.items.map((tool) => (
                    <Link
                      className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-[#F9FAFB] hover:text-[#111827]"
                      href={tool.href}
                      key={tool.href}
                      onClick={() => setMobileOpen(false)}
                    >
                      {tool.name}
                    </Link>
                  ))}
                </div>
              </div>
            ))}

            <Link
              className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-[#F9FAFB] hover:text-[#111827]"
              href="/pricing"
              onClick={() => setMobileOpen(false)}
            >
              Pricing
            </Link>
            <Link
              className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-[#F9FAFB] hover:text-[#111827]"
              href="/about"
              onClick={() => setMobileOpen(false)}
            >
              About
            </Link>
            <Link
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#D1D5DB] px-3 text-sm font-semibold text-slate-600 transition hover:bg-[#F9FAFB] hover:text-[#111827]"
              href="https://github.com/demisuga01-lab/pdftool"
              rel="noreferrer"
              target="_blank"
            >
              <GitBranch className="h-4 w-4" />
              GitHub
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
