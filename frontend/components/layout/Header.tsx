"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { GithubIcon } from "@/components/icons/SiteIcons";
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

const universalTools = [
  { href: "/compress", name: "Compress" },
  { href: "/convert", name: "Convert" },
];

const pdfToolSections: ToolSection[] = [
  {
    label: "Organize",
    items: [
      { href: "/pdf/merge", name: "Merge PDFs" },
      { href: "/pdf/split", name: "Split PDF" },
      { href: "/pdf/rotate", name: "Rotate PDF" },
    ],
  },
  {
    label: "Convert",
    items: [
      { href: "/pdf/to-images", name: "PDF to Images" },
      { href: "/pdf/images-to-pdf", name: "Images to PDF" },
      { href: "/pdf/office-to-pdf", name: "Office to PDF" },
    ],
  },
  {
    label: "Edit",
    items: [
      { href: "/pdf/watermark", name: "Watermark PDF" },
      { href: "/pdf/extract-text", name: "Extract Text" },
    ],
  },
  {
    label: "Security",
    items: [
      { href: "/pdf/protect", name: "Protect PDF" },
      { href: "/pdf/decrypt", name: "Decrypt PDF" },
    ],
  },
];

const imageToolSections: ToolSection[] = [
  {
    label: "Edit",
    items: [
      { href: "/image/resize", name: "Resize Image" },
      { href: "/image/crop", name: "Crop Image" },
      { href: "/image/rotate", name: "Rotate Image" },
      { href: "/image/watermark", name: "Watermark Image" },
    ],
  },
  {
    label: "Process",
    items: [
      { href: "/image/remove-background", name: "Remove Background" },
      { href: "/image/batch-resize", name: "Batch Resize" },
      { href: "/image/info", name: "Image Info" },
    ],
  },
];

const ocrToolSections: ToolSection[] = [
  {
    label: "PDF OCR",
    items: [
      { href: "/pdf/ocr", name: "OCR Scanned PDF" },
      { href: "/pdf/ocr-to-searchable", name: "Make PDF Searchable" },
    ],
  },
  {
    label: "Image OCR",
    items: [
      { href: "/image/ocr", name: "Extract Text from Image" },
    ],
  },
  {
    label: "Universal OCR",
    items: [
      { href: "/tools/ocr", name: "OCR Workspace" },
    ],
  },
];

const privacyToolSections: ToolSection[] = [
  {
    label: "Metadata",
    items: [
      { href: "/file/metadata-view", name: "File Metadata Viewer" },
      { href: "/file/metadata-clean", name: "Metadata Cleaner" },
      { href: "/file/office-metadata-clean", name: "Office Metadata Cleaner" },
    ],
  },
  {
    label: "File Privacy",
    items: [
      { href: "/file/filename-sanitize", name: "Filename Sanitizer" },
      { href: "/file/filename-check", name: "Secure File Shred Guide" },
    ],
  },
  {
    label: "Scanning",
    items: [
      { href: "/file/virus-scan", name: "Virus Scanner" },
      { href: "/file/archive-safety", name: "Archive Safety Check" },
      { href: "/file/macro-check", name: "Macro Checker" },
    ],
  },
];

const fileToolSections: ToolSection[] = [
  {
    label: "Hash & Integrity",
    items: [
      { href: "/file/hash", name: "Hash Checker" },
      { href: "/file/checksum-verify", name: "Checksum Verifier" },
      { href: "/file/hash-batch", name: "Batch Hash Generator" },
      { href: "/file/duplicate-find", name: "Duplicate Finder" },
    ],
  },
  {
    label: "File Inspection",
    items: [
      { href: "/file/file-type", name: "File Type Detector" },
      { href: "/file/extension-check", name: "Extension Mismatch" },
      { href: "/file/metadata-view", name: "File Metadata" },
      { href: "/file/file-compare", name: "File Compare" },
      { href: "/file/filename-check", name: "Filename Checker" },
      { href: "/file/archive-safety", name: "Archive Safety Check" },
    ],
  },
  {
    label: "Archives",
    items: [
      { href: "/file/archive-create", name: "Create Archive" },
      { href: "/file/archive-extract", name: "Extract Archive" },
      { href: "/file/archive-inspect", name: "Archive Inspector" },
    ],
  },
  {
    label: "Rename & Organize",
    items: [
      { href: "/file/batch-rename", name: "Batch Rename" },
      { href: "/file/filename-sanitize", name: "Filename Sanitizer" },
      { href: "/file/inventory-report", name: "File Inventory Report" },
    ],
  },
  {
    label: "Split & Join",
    items: [
      { href: "/file/file-split", name: "Split File" },
      { href: "/file/file-join", name: "Join File Parts" },
    ],
  },
  {
    label: "Text Files",
    items: [
      { href: "/file/text-encoding-convert", name: "Text Encoding Convert" },
    ],
  },
];

function DropdownLinkGrid({
  sections,
  onItemClick,
}: {
  sections: ToolSection[];
  onItemClick: () => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-5 rounded-2xl border border-zinc-200 bg-white p-5 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
      {sections.map((section) => (
        <div className="min-w-0" key={section.label}>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">{section.label}</p>
          <div className="grid gap-1">
            {section.items.map((item) => (
              <Link
                className="rounded-2xl px-3 py-2.5 text-sm font-medium leading-5 text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/35 dark:text-zinc-200 dark:hover:bg-zinc-950 dark:hover:text-white dark:focus-visible:ring-emerald-400/35"
                href={item.href}
                key={item.href}
                onClick={onItemClick}
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ToolsDropdown({
  active,
  align = "center",
  label,
  sections,
}: {
  active: boolean;
  align?: "center" | "left";
  label: string;
  sections: ToolSection[];
}) {
  const [open, setOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelPositionClass =
    align === "left"
      ? "left-0 w-[680px] max-w-[calc(100vw-24px)] translate-x-0"
      : "left-1/2 w-[760px] max-w-[calc(100vw-48px)] -translate-x-1/2";

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
        aria-haspopup="menu"
        className={[
          "inline-flex h-11 items-center border-b-2 px-1 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/35 dark:focus-visible:ring-emerald-400/35",
          active
            ? "border-emerald-600 text-zinc-950 dark:border-emerald-400 dark:text-zinc-50"
            : "border-transparent text-zinc-600 hover:border-emerald-300 hover:text-zinc-950 dark:text-zinc-300 dark:hover:border-emerald-800 dark:hover:text-white",
        ].join(" ")}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        {label}
        <ChevronDownIcon className="ml-1 h-4 w-4" />
      </button>

      <div
        className={[
          "absolute top-full z-[110] pt-4 transition duration-150",
          panelPositionClass,
          open ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-1 opacity-0",
        ].join(" ")}
      >
        <DropdownLinkGrid sections={sections} onItemClick={() => setOpen(false)} />
      </div>
    </div>
  );
}

function UniversalToolsDropdown() {
  const [open, setOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();
  const active = pathname === "/compress" || pathname === "/convert";

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
        aria-haspopup="menu"
        className={[
          "inline-flex h-11 items-center border-b-2 px-1 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/35 dark:focus-visible:ring-emerald-400/35",
          active
            ? "border-emerald-600 text-zinc-950 dark:border-emerald-400 dark:text-zinc-50"
            : "border-transparent text-zinc-600 hover:border-emerald-300 hover:text-zinc-950 dark:text-zinc-300 dark:hover:border-emerald-800 dark:hover:text-white",
        ].join(" ")}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        Tools
        <ChevronDownIcon className="ml-1 h-4 w-4" />
      </button>

      <div
        className={[
          "absolute left-1/2 top-full z-[110] w-[760px] max-w-[calc(100vw-48px)] -translate-x-1/2 pt-4 transition duration-150",
          open ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-1 opacity-0",
        ].join(" ")}
      >
        <div className="grid gap-1 rounded-2xl border border-zinc-200 bg-white p-5 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
          {universalTools.map((item) => (
            <Link
              className="rounded-2xl px-3 py-2.5 text-sm font-medium leading-5 text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/35 dark:text-zinc-200 dark:hover:bg-zinc-950 dark:hover:text-white dark:focus-visible:ring-emerald-400/35"
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

function FileToolsDropdown() {
  const [open, setOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();
  const active = pathname.startsWith("/file");

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
        aria-haspopup="menu"
        className={[
          "inline-flex h-11 items-center border-b-2 px-1 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/35 dark:focus-visible:ring-emerald-400/35",
          active
            ? "border-emerald-600 text-zinc-950 dark:border-emerald-400 dark:text-zinc-50"
            : "border-transparent text-zinc-600 hover:border-emerald-300 hover:text-zinc-950 dark:text-zinc-300 dark:hover:border-emerald-800 dark:hover:text-white",
        ].join(" ")}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        File Tools
        <ChevronDownIcon className="ml-1 h-4 w-4" />
      </button>

      <div
        className={[
          "absolute left-1/2 top-full z-[110] w-[920px] max-w-[calc(100vw-48px)] -translate-x-1/2 pt-4 transition duration-150",
          open ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-1 opacity-0",
        ].join(" ")}
      >
        <DropdownLinkGrid sections={fileToolSections} onItemClick={() => setOpen(false)} />
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
    <div className="space-y-3 rounded-[24px] border border-zinc-200/80 bg-zinc-50 p-3 dark:border-white/10 dark:bg-zinc-900">
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
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
                  : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900",
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
  const mobileToolGroups = useMemo(
    () => [
      { label: "PDF Tools", sections: pdfToolSections },
      { label: "Image Tools", sections: imageToolSections },
      { label: "OCR Tools", sections: ocrToolSections },
      { label: "Privacy Tools", sections: privacyToolSections },
      { label: "File Tools", sections: fileToolSections },
    ],
    [],
  );
  const pathname = usePathname();

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

  const navLinkClass = (active: boolean) =>
    [
      "inline-flex h-11 items-center border-b-2 px-1 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/35 dark:focus-visible:ring-emerald-400/35",
      active
        ? "border-emerald-600 text-zinc-950 dark:border-emerald-400 dark:text-zinc-50"
        : "border-transparent text-zinc-600 hover:border-emerald-300 hover:text-zinc-950 dark:text-zinc-300 dark:hover:border-emerald-800 dark:hover:text-white",
    ].join(" ");

  return (
    <header className="sticky top-0 z-[90] border-b border-zinc-200/80 bg-white/92 shadow-[0_1px_0_rgba(15,23,42,0.03)] backdrop-blur dark:border-white/10 dark:bg-zinc-950/88">
      <div className="mx-auto flex h-16 max-w-[1560px] items-center justify-between gap-2 px-3 sm:h-[4.4rem] sm:px-6 xl:px-8">
        <Logo className="gap-2 sm:gap-3" iconClassName="h-9 w-9 sm:h-10 sm:w-10" onNavigate={closeMobile} />

        <nav className="hidden items-center gap-6 md:flex">
          <HomeLink className={navLinkClass(pathname === "/")}>
            Home
          </HomeLink>
          <ToolsDropdown active={pathname.startsWith("/pdf")} align="left" label="PDF Tools" sections={pdfToolSections} />
          <ToolsDropdown active={pathname.startsWith("/image")} align="left" label="Image Tools" sections={imageToolSections} />
          <ToolsDropdown
            active={pathname === "/tools/ocr" || pathname === "/pdf/ocr" || pathname === "/pdf/ocr-to-searchable" || pathname === "/image/ocr"}
            align="left"
            label="OCR Tools"
            sections={ocrToolSections}
          />
          <ToolsDropdown
            active={[
              "/file/metadata-view",
              "/file/metadata-clean",
              "/file/office-metadata-clean",
              "/file/filename-sanitize",
              "/file/filename-check",
              "/file/virus-scan",
              "/file/archive-safety",
              "/file/macro-check",
            ].includes(pathname)}
            label="Privacy Tools"
            sections={privacyToolSections}
          />
          <FileToolsDropdown />
          <UniversalToolsDropdown />
          <Link className={navLinkClass(pathname === "/pricing")} href="/pricing">
            Pricing
          </Link>
          <Link className={navLinkClass(pathname === "/about")} href="/about">
            About
          </Link>
          <Link className={navLinkClass(pathname.startsWith("/docs"))} href="/docs">
            Docs
          </Link>
          <Link className={navLinkClass(pathname === "/contact")} href="/contact">
            Contact
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            className="hidden h-10 items-center gap-2 rounded-full border border-zinc-300 bg-white px-3.5 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/35 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900 dark:hover:text-white dark:focus-visible:ring-emerald-400/35 md:inline-flex"
            href="https://github.com/demisuga01-lab/pdftool"
            rel="noreferrer"
            target="_blank"
          >
            <GithubIcon className="h-4 w-4" />
            GitHub
          </Link>
          <button
            aria-expanded={mobileOpen}
            aria-label="Toggle navigation menu"
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-300 bg-white text-zinc-700 transition hover:bg-zinc-50 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/35 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900 dark:hover:text-white dark:focus-visible:ring-emerald-400/35 md:hidden"
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
            className="fixed inset-0 top-16 z-40 bg-black/45 sm:top-[4.4rem] md:hidden"
            onClick={closeMobile}
          />
          <div className="fixed inset-x-0 top-16 z-50 max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain border-t border-zinc-200/80 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_24px_60px_rgba(15,23,42,0.12)] sm:top-[4.4rem] sm:max-h-[calc(100dvh-4.4rem)] md:hidden dark:border-white/10 dark:bg-zinc-950 dark:shadow-[0_30px_70px_rgba(0,0,0,0.35)]">
            <div className="space-y-4 px-4 py-4">
              {mobileToolGroups.map((group) => (
                <div className="rounded-[24px] border border-zinc-200/80 bg-zinc-50 px-3 dark:border-white/10 dark:bg-zinc-900" key={group.label}>
                  <button
                    className="flex min-h-11 w-full items-center justify-between px-1 py-3 text-sm font-semibold text-zinc-800 dark:text-zinc-100"
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
                    <div className="space-y-3 pb-3">
                      {group.sections.map((section) => (
                        <div key={section.label}>
                          <p className="mb-2 px-4 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{section.label}</p>
                          <div className="grid gap-1">
                            {section.items.map((tool) => (
                              <Link
                                className="block rounded-2xl px-4 py-2 text-sm font-medium text-zinc-700 transition hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/35 dark:text-zinc-300 dark:focus-visible:ring-emerald-400/35"
                                href={tool.href}
                                key={tool.href}
                                onClick={closeMobile}
                              >
                                {tool.name}
                              </Link>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}

              <div className="rounded-[24px] border border-zinc-200/80 bg-zinc-50 px-3 dark:border-white/10 dark:bg-zinc-900">
                <button
                  className="flex min-h-11 w-full items-center justify-between px-1 py-3 text-sm font-semibold text-zinc-800 dark:text-zinc-100"
                  onClick={() => setOpenGroup(openGroup === "Tools" ? null : "Tools")}
                  type="button"
                >
                  Tools
                  <ChevronDownIcon
                    className={[
                      "h-4 w-4 text-slate-400 transition-transform dark:text-zinc-500",
                      openGroup === "Tools" ? "rotate-180" : "",
                    ].join(" ")}
                  />
                </button>
                {openGroup === "Tools" ? (
                  <div className="grid gap-1 pb-3">
                    {universalTools.map((tool) => (
                      <Link
                        className="block rounded-2xl px-4 py-2 text-sm font-medium text-zinc-700 transition hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/35 dark:text-zinc-300 dark:focus-visible:ring-emerald-400/35"
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

              <MobileThemeSelector />

              <div className="rounded-[24px] border border-zinc-200/80 bg-zinc-50 px-3 py-3 dark:border-white/10 dark:bg-zinc-900">
                <HomeLink
                  className="block rounded-2xl px-3 py-3 text-sm font-medium text-zinc-600 transition hover:bg-white hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/35 dark:text-zinc-300 dark:hover:bg-zinc-950 dark:hover:text-white dark:focus-visible:ring-emerald-400/35"
                  onNavigate={closeMobile}
                >
                  Home
                </HomeLink>
                {[
                  { href: "/pricing", name: "Pricing" },
                  { href: "/about", name: "About" },
                  { href: "/docs", name: "Docs" },
                  { href: "/contact", name: "Contact" },
                ].map((item) => (
                  <Link
                    className="block rounded-2xl px-3 py-3 text-sm font-medium text-zinc-600 transition hover:bg-white hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/35 dark:text-zinc-300 dark:hover:bg-zinc-950 dark:hover:text-white dark:focus-visible:ring-emerald-400/35"
                    href={item.href}
                    key={item.href}
                    onClick={closeMobile}
                  >
                    {item.name}
                  </Link>
                ))}
                <Link
                  className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-2xl border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/35 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900 dark:hover:text-white dark:focus-visible:ring-emerald-400/35"
                  href="https://github.com/demisuga01-lab/pdftool"
                  rel="noreferrer"
                  target="_blank"
                  onClick={closeMobile}
                >
                  <GithubIcon className="h-4 w-4" />
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
