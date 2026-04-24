"use client";

import Link from "next/link";
import { GitBranch, Menu, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { imageTools, pdfTools } from "@/lib/tools";

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
        className="inline-flex items-center border border-transparent px-3 py-2 text-sm font-semibold uppercase tracking-[0.14em] text-slate-700 transition hover:border-slate-950 hover:text-slate-950 focus-visible:border-slate-950 focus-visible:outline-none dark:text-slate-300 dark:hover:border-slate-100 dark:hover:text-white dark:focus-visible:border-slate-100"
        onClick={toggleMenu}
        onFocus={openMenu}
        onMouseEnter={openMenu}
        onMouseLeave={closeMenu}
        type="button"
      >
        {label}
      </button>

      {open ? (
        <div
          className="absolute left-0 top-full z-50 mt-3 w-72 border border-slate-950 bg-white p-3 shadow-[8px_8px_0_0_rgba(0,0,0,1)] dark:border-slate-100 dark:bg-slate-950 dark:shadow-[8px_8px_0_0_rgba(255,255,255,0.14)]"
          onFocus={openMenu}
          onMouseEnter={openMenu}
          onMouseLeave={closeMenu}
        >
          <div className="space-y-1">
            {items.map((item) => (
              <Link
                className="block border border-transparent px-3 py-2 text-sm text-slate-700 transition hover:border-slate-950 hover:bg-slate-950 hover:text-white dark:text-slate-300 dark:hover:border-slate-100 dark:hover:bg-slate-100 dark:hover:text-slate-950"
                href={item.href}
                key={item.href}
                onClick={() => setOpen(false)}
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const mobileGroups = useMemo(
    () => [
      { label: "PDF Tools", items: pdfTools },
      { label: "Image Tools", items: imageTools },
    ],
    [],
  );

  return (
    <header className="sticky top-0 z-50 border-b-2 border-slate-950 bg-white dark:border-slate-100 dark:bg-slate-950">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <Link className="flex items-center gap-3" href="/">
          <span className="flex h-11 w-11 items-center justify-center border-2 border-slate-950 bg-slate-950 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-950">
            <GitBranch className="h-5 w-5 text-[#2563EB]" />
          </span>
          <span className="space-y-1">
            <span className="block text-base font-semibold tracking-tight text-slate-950 dark:text-white">
              PDFTools by WellFriend
            </span>
            <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2563EB]">
              Free &amp; Open Source
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          <NavDropdown
            items={pdfTools.map((tool) => ({ href: tool.href, name: tool.name }))}
            label="PDF Tools"
          />
          <NavDropdown
            items={imageTools.map((tool) => ({ href: tool.href, name: tool.name }))}
            label="Image Tools"
          />
          <Link
            className="inline-flex items-center gap-2 border border-slate-950 px-3 py-2 text-sm font-semibold uppercase tracking-[0.14em] text-slate-950 transition hover:bg-slate-950 hover:text-white dark:border-slate-100 dark:text-slate-100 dark:hover:bg-slate-100 dark:hover:text-slate-950"
            href="https://github.com/demisuga01-lab/pdftool"
            rel="noreferrer"
            target="_blank"
          >
            <GitBranch className="h-4 w-4" />
            GitHub
          </Link>
        </nav>

        <button
          aria-expanded={mobileOpen}
          aria-label="Toggle navigation"
          className="inline-flex h-11 w-11 items-center justify-center border-2 border-slate-950 bg-white text-slate-950 transition hover:bg-slate-950 hover:text-white dark:border-slate-100 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-100 dark:hover:text-slate-950 md:hidden"
          onClick={() => setMobileOpen((current) => !current)}
          type="button"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen ? (
        <div className="border-t-2 border-slate-950 px-4 py-4 dark:border-slate-100 md:hidden">
          <div className="space-y-5">
            {mobileGroups.map((group) => (
              <div className="space-y-2" key={group.label}>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2563EB]">
                  {group.label}
                </p>
                <div className="grid gap-1">
                  {group.items.map((tool) => (
                    <Link
                      className="border border-transparent px-3 py-2 text-sm text-slate-700 transition hover:border-slate-950 hover:bg-slate-950 hover:text-white dark:text-slate-300 dark:hover:border-slate-100 dark:hover:bg-slate-100 dark:hover:text-slate-950"
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
              className="inline-flex items-center gap-2 border border-slate-950 px-3 py-2 text-sm font-semibold uppercase tracking-[0.14em] text-slate-950 transition hover:bg-slate-950 hover:text-white dark:border-slate-100 dark:text-slate-100 dark:hover:bg-slate-100 dark:hover:text-slate-950"
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
