"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { GitBranch } from "lucide-react";

import { ChevronDownIcon, CloseIcon, MenuIcon } from "@/components/icons/SiteIcons";
import { Logo } from "@/components/ui/Logo";

type ToolSection = {
  label: string;
  items: Array<{ href: string; name: string }>;
};

const toolSections: ToolSection[] = [
  {
    label: "Core Workspaces",
    items: [
      { href: "/convert", name: "Universal Converter" },
      { href: "/compress", name: "Universal Compressor" },
      { href: "/tools/ocr", name: "OCR Workspace" },
    ],
  },
  {
    label: "PDF Tools",
    items: [
      { href: "/compress?type=pdf", name: "Compress PDF" },
      { href: "/pdf/merge", name: "Merge PDF" },
      { href: "/pdf/split", name: "Split PDF" },
      { href: "/pdf/rotate", name: "Rotate PDF" },
      { href: "/pdf/protect", name: "Protect PDF" },
      { href: "/pdf/decrypt", name: "Decrypt PDF" },
      { href: "/pdf/images-to-pdf", name: "Images to PDF" },
    ],
  },
  {
    label: "Image Tools",
    items: [
      { href: "/compress?type=image", name: "Compress Image" },
      { href: "/image/resize", name: "Resize Image" },
      { href: "/image/crop", name: "Crop Image" },
      { href: "/image/rotate", name: "Rotate Image" },
      { href: "/image/watermark", name: "Watermark Image" },
      { href: "/image/remove-background", name: "Remove Background" },
      { href: "/image/info", name: "Image Info" },
    ],
  },
  {
    label: "Popular Conversions",
    items: [
      { href: "/convert?from=pdf&to=docx", name: "PDF to Word" },
      { href: "/convert?from=pdf&to=xlsx", name: "PDF to Excel" },
      { href: "/convert?from=docx&to=pdf", name: "Word to PDF" },
      { href: "/convert?from=xlsx&to=pdf", name: "Excel to PDF" },
      { href: "/convert?from=image&to=webp", name: "Image to WebP" },
      { href: "/convert?from=svg&to=pdf", name: "SVG to PDF" },
    ],
  },
];

function ToolsDropdown() {
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
    }, 180);
  };

  return (
    <div className="relative" onBlur={closeMenu} onFocus={openMenu} onMouseEnter={openMenu} onMouseLeave={closeMenu}>
      <button
        aria-expanded={open}
        className="inline-flex h-9 items-center rounded-lg px-3 text-sm font-semibold text-slate-600 transition hover:bg-[#F9FAFB] hover:text-[#111827] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/20"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        Tools
        <ChevronDownIcon className="ml-1 h-4 w-4" />
      </button>

      <div
        className={[
          "absolute left-1/2 top-full z-50 w-[760px] max-w-[calc(100vw-48px)] -translate-x-1/2 pt-3 transition duration-150",
          open ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-1 opacity-0",
        ].join(" ")}
      >
        <div className="grid grid-cols-4 gap-5 rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-xl shadow-slate-900/10">
          {toolSections.map((section) => (
            <div className="min-w-0" key={section.label}>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{section.label}</p>
              <div className="grid gap-1">
                {section.items.map((item) => (
                  <Link
                    className="rounded-lg px-2 py-2 text-sm font-medium leading-5 text-slate-600 transition hover:bg-[#F9FAFB] hover:text-[#111827]"
                    href={item.href}
                    key={item.href}
                    onClick={() => setOpen(false)}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileGroups = useMemo(() => toolSections, []);

  return (
    <header className="sticky top-0 z-50 border-b border-[#E5E7EB] bg-white/95 backdrop-blur">
      <div className="mx-auto grid h-20 max-w-[1560px] grid-cols-[1fr_auto_1fr] items-center px-6 sm:px-10 xl:px-14">
        <div className="justify-self-start">
          <Logo />
        </div>

        <nav className="hidden items-center justify-center gap-5 justify-self-center md:flex">
          <ToolsDropdown />
          <Link className="inline-flex h-9 items-center rounded-lg px-3 text-sm font-semibold text-slate-600 transition hover:bg-[#F9FAFB] hover:text-[#111827]" href="/pricing">
            Pricing
          </Link>
          <Link className="inline-flex h-9 items-center rounded-lg px-3 text-sm font-semibold text-slate-600 transition hover:bg-[#F9FAFB] hover:text-[#111827]" href="/about">
            About
          </Link>
          <Link className="inline-flex h-9 items-center rounded-lg px-3 text-sm font-semibold text-slate-600 transition hover:bg-[#F9FAFB] hover:text-[#111827]" href="/contact">
            Contact
          </Link>
        </nav>

        <div className="hidden justify-self-end md:flex md:items-center md:justify-end">
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
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">{group.label}</p>
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

            {[
              { href: "/pricing", name: "Pricing" },
              { href: "/about", name: "About" },
              { href: "/contact", name: "Contact" },
            ].map((item) => (
              <Link
                className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-[#F9FAFB] hover:text-[#111827]"
                href={item.href}
                key={item.href}
                onClick={() => setMobileOpen(false)}
              >
                {item.name}
              </Link>
            ))}
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
