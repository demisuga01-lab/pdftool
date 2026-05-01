import Link from "next/link";

import { GithubIcon, LinkArrowIcon, MailIcon } from "@/components/icons/SiteIcons";
import { Logo } from "@/components/ui/Logo";

const productLinks = [
  { href: "/pdf/compress", label: "All PDF Tools" },
  { href: "/image/resize", label: "All Image Tools" },
  { href: "/convert", label: "Convert" },
  { href: "/tools/ocr", label: "OCR" },
  { href: "/docs", label: "Documentation" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

const supportLinks = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
  { href: "https://github.com/demisuga01-lab/pdftool", label: "GitHub", external: true },
  { href: "https://discord.gg/ZQFmYaQbVu", label: "Discord", external: true },
];

export function Footer() {
  return (
    <footer className="border-t border-zinc-200/70 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.08),_transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.88)_0%,rgba(244,244,245,0.92)_100%)] text-zinc-900 dark:border-white/10 dark:bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.08),_transparent_32%),linear-gradient(180deg,rgba(9,9,11,0.96)_0%,rgba(17,17,19,0.98)_100%)] dark:text-white">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-3">
          <div className="space-y-4">
            <Logo
              className="text-zinc-950 dark:text-white"
              href="/"
              iconClassName="h-8 w-8"
            />
            <p className="text-sm text-zinc-600 dark:text-zinc-300">A focused workspace for PDFs, images, OCR, conversion, and export.</p>
          </div>

          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Product</h2>
            <div className="grid gap-2 text-sm text-zinc-600 dark:text-zinc-300">
              {productLinks.map((link) => (
                <Link className="transition hover:text-emerald-700 dark:hover:text-emerald-300" href={link.href} key={link.href}>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Legal and Support</h2>
            <div className="grid gap-2 text-sm text-zinc-600 dark:text-zinc-300">
              {supportLinks.map((link) => (
                <Link
                  className="inline-flex items-center gap-2 transition hover:text-emerald-700 dark:hover:text-emerald-300"
                  href={link.href}
                  key={link.href}
                  rel={link.external ? "noreferrer" : undefined}
                  target={link.external ? "_blank" : undefined}
                >
                  {link.label === "GitHub" ? <GithubIcon className="h-4 w-4" /> : null}
                  {link.label === "Discord" ? <LinkArrowIcon className="h-4 w-4" /> : null}
                  <span>{link.label}</span>
                </Link>
              ))}
              <a
                className="inline-flex items-center gap-2 transition hover:text-emerald-700 dark:hover:text-emerald-300"
                href="mailto:support@wellfriend.online"
              >
                <MailIcon className="h-4 w-4" />
                <span>support@wellfriend.online</span>
              </a>
              <a
                className="inline-flex items-center gap-2 transition hover:text-emerald-700 dark:hover:text-emerald-300"
                href="mailto:contact@wellfriend.online"
              >
                <MailIcon className="h-4 w-4" />
                <span>contact@wellfriend.online</span>
              </a>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Join Discord for community help, updates, and discussion.</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">API Coming Soon at api.wellfriend.online</p>
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-1 border-t border-zinc-200/70 pt-6 text-xs text-zinc-500 dark:border-white/10 dark:text-zinc-400 sm:grid-cols-3">
          <p>Maximum upload size: 25 MB</p>
          <p>Files deleted after 24 hours</p>
          <p>Rate limit: 200 requests per hour</p>
        </div>

        <div className="mt-6 flex flex-col gap-3 text-sm text-zinc-500 dark:text-zinc-400 sm:flex-row sm:items-center sm:justify-between">
          <p>2026 WellFriend. All rights reserved.</p>
          <p>Open source software. Free to use and self-host.</p>
        </div>
      </div>
    </footer>
  );
}
