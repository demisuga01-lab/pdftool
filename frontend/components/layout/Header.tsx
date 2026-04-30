"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GitBranch } from "lucide-react";

import { ChevronDownIcon, CloseIcon, MenuIcon } from "@/components/icons/SiteIcons";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useTheme, type ThemeMode } from "@/components/theme/ThemeProvider";
import { HomeLink } from "@/components/ui/HomeLink";
import { Logo } from "@/components/ui/Logo";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";

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
      { href: "/pdf/watermark", name: "Watermark PDF" },
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
        className="inline-flex h-10 items-center rounded-xl px-3 text-sm font-semibold text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/35 dark:text-zinc-300 dark:hover:bg-white/5 dark:hover:text-emerald-300 dark:focus-visible:ring-emerald-400/35"
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
        <div className="grid grid-cols-4 gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/10 dark:border-white/10 dark:bg-zinc-900 dark:shadow-black/30">
          {toolSections.map((section) => (
            <div className="min-w-0" key={section.label}>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-zinc-500">{section.label}</p>
              <div className="grid gap-1">
                {section.items.map((item) => (
                  <Link
                    className="rounded-xl px-3 py-2 text-sm font-medium leading-5 text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-700 dark:text-zinc-200 dark:hover:bg-white/5 dark:hover:text-emerald-300"
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

function MobileThemeSelector({ onSelect }: { onSelect?: () => void }) {
  const { resolvedTheme, setTheme, theme } = useTheme();

  const options: Array<{ label: string; value: ThemeMode }> = [
    { label: "Light", value: "light" },
    { label: "Dark", value: "dark" },
    { label: "System", value: "system" },
  ];

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-zinc-50 p-3 dark:border-white/10 dark:bg-zinc-900/70">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Theme</p>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            {theme === "system" ? `Following system (${resolvedTheme})` : `Using ${theme}`}
          </p>
        </div>
      </div>
      <div className="grid gap-2">
        {options.map((option) => {
          const selected = theme === option.value;
          return (
            <button
              aria-pressed={selected}
              className={[
                "flex min-h-11 items-center justify-between rounded-xl border px-3 text-sm font-medium transition",
                selected
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-500/10 dark:text-emerald-300"
                  : "border-slate-200 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-white/5",
              ].join(" ")}
              key={option.value}
              onClick={() => {
                setTheme(option.value);
                onSelect?.();
              }}
              type="button"
            >
              <span>{option.label}</span>
              <span className="text-xs font-semibold">{selected ? "Selected" : ""}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const mobileGroups = useMemo(() => toolSections, []);

  const closeMobile = useCallback(() => {
    setMobileOpen(false);
    setOpenGroup(null);
  }, []);

  useBodyScrollLock(mobileOpen);

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMobile();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeMobile, mobileOpen]);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-white/10 dark:bg-zinc-950/85">
      <div className="mx-auto flex h-14 max-w-[1560px] items-center justify-between gap-2 px-3 sm:h-16 sm:px-6 xl:px-8">
        <Logo className="gap-2 sm:gap-3" iconClassName="h-9 w-9 sm:h-10 sm:w-10" onNavigate={closeMobile} />

        <nav className="hidden items-center gap-1 md:flex">
          <HomeLink className="inline-flex h-10 items-center rounded-xl px-3 text-sm font-semibold text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/35 dark:text-zinc-300 dark:hover:bg-white/5 dark:hover:text-emerald-300 dark:focus-visible:ring-emerald-400/35">
            Home
          </HomeLink>
          <ToolsDropdown />
          <Link className="inline-flex h-10 items-center rounded-xl px-3 text-sm font-semibold text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-700 dark:text-zinc-300 dark:hover:bg-white/5 dark:hover:text-emerald-300" href="/pricing">
            Pricing
          </Link>
          <Link className="inline-flex h-10 items-center rounded-xl px-3 text-sm font-semibold text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-700 dark:text-zinc-300 dark:hover:bg-white/5 dark:hover:text-emerald-300" href="/about">
            About
          </Link>
          <Link className="inline-flex h-10 items-center rounded-xl px-3 text-sm font-semibold text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-700 dark:text-zinc-300 dark:hover:bg-white/5 dark:hover:text-emerald-300" href="/contact">
            Contact
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            className="hidden h-10 items-center gap-2 rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 dark:border-white/10 dark:text-zinc-200 dark:hover:bg-white/5 dark:hover:text-emerald-300 md:inline-flex"
            href="https://github.com/demisuga01-lab/pdftool"
            rel="noreferrer"
            target="_blank"
          >
            <GitBranch className="h-4 w-4" />
            GitHub
          </Link>
          <button
            aria-expanded={mobileOpen}
            aria-label="Toggle navigation menu"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-700 dark:border-white/10 dark:text-zinc-200 dark:hover:bg-white/5 dark:hover:text-emerald-300 md:hidden"
            onClick={() => setMobileOpen((current) => !current)}
            type="button"
          >
            {mobileOpen ? <CloseIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <>
          <div
            className="fixed inset-0 top-14 z-40 bg-black/55 backdrop-blur-sm sm:top-16 md:hidden"
            onClick={closeMobile}
          />
          <div className="fixed inset-x-0 top-14 z-50 max-h-[calc(100dvh-3.5rem)] overflow-y-auto overscroll-contain border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] sm:top-16 sm:max-h-[calc(100dvh-4rem)] md:hidden dark:border-white/10 dark:bg-zinc-950">
            <div className="space-y-4 px-4 py-4">
              {mobileGroups.map((group) => (
                <div className="border-b border-slate-100 dark:border-white/10 last:border-b-0" key={group.label}>
                  <button
                    className="flex min-h-11 w-full items-center justify-between px-1 py-3 text-sm font-semibold text-slate-700 dark:text-zinc-100"
                    onClick={() => setOpenGroup(openGroup === group.label ? null : group.label)}
                    type="button"
                  >
                    {group.label}
                    <ChevronDownIcon
                      className={[
                        "h-4 w-4 text-slate-400 transition-transform dark:text-zinc-500",
                        openGroup === group.label ? "rotate-180" : "",
                      ].join(" ")}
                    />
                  </button>
                  {openGroup === group.label ? (
                    <div className="pb-3">
                      {group.items.map((tool) => (
                        <Link
                          className="block rounded-xl px-3 py-3 text-sm font-medium text-zinc-600 transition hover:bg-emerald-50 hover:text-emerald-700 active:bg-emerald-50 dark:text-zinc-300 dark:hover:bg-white/5 dark:hover:text-emerald-300 dark:active:bg-white/5"
                          href={tool.href}
                          key={tool.href}
                          onClick={closeMobile}
                        >
                          {tool.name}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}

              <MobileThemeSelector />

              <div className="border-t border-slate-200 py-3 dark:border-white/10">
                <HomeLink
                  className="block rounded-xl px-3 py-3 text-sm font-medium text-zinc-600 transition hover:bg-emerald-50 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/35 dark:text-zinc-300 dark:hover:bg-white/5 dark:hover:text-emerald-300 dark:focus-visible:ring-emerald-400/35"
                  onNavigate={closeMobile}
                >
                  Home
                </HomeLink>
                {[
                  { href: "/pricing", name: "Pricing" },
                  { href: "/about", name: "About" },
                  { href: "/contact", name: "Contact" },
                ].map((item) => (
                  <Link
                    className="block rounded-xl px-3 py-3 text-sm font-medium text-zinc-600 transition hover:bg-emerald-50 hover:text-emerald-700 dark:text-zinc-300 dark:hover:bg-white/5 dark:hover:text-emerald-300"
                    href={item.href}
                    key={item.href}
                    onClick={closeMobile}
                  >
                    {item.name}
                  </Link>
                ))}
                <Link
                  className="mt-1 inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 px-3 text-sm font-semibold text-zinc-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 dark:border-white/10 dark:text-zinc-200 dark:hover:bg-white/5 dark:hover:text-emerald-300"
                  href="https://github.com/demisuga01-lab/pdftool"
                  rel="noreferrer"
                  target="_blank"
                  onClick={closeMobile}
                >
                  <GitBranch className="h-4 w-4" />
                  GitHub
                </Link>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </header>
  );
}
