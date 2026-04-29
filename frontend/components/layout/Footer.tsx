import Link from "next/link";

import { FlagIndiaIcon, GithubIcon, MailIcon } from "@/components/icons/SiteIcons";
import { Logo } from "@/components/ui/Logo";

const productLinks = [
  { href: "/pdf/compress", label: "All PDF Tools" },
  { href: "/image/resize", label: "All Image Tools" },
  { href: "/convert", label: "Convert" },
  { href: "/tools/ocr", label: "OCR" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

const supportLinks = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
  { href: "https://github.com/demisuga01-lab/pdftool", label: "GitHub", external: true },
];

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-950 text-white dark:border-white/10">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-3">
          <div className="space-y-4">
            <Logo
              className="text-white"
              href="/"
              iconClassName="h-8 w-8"
            />
            <p className="text-sm text-slate-300">Free, open-source PDF and image processing</p>
            <div className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
              <FlagIndiaIcon className="h-4 w-4" />
              <span>Made in India</span>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-white">Product</h2>
            <div className="grid gap-2 text-sm text-slate-300">
              {productLinks.map((link) => (
                <Link className="transition hover:text-white" href={link.href} key={link.href}>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-white">Legal and Support</h2>
            <div className="grid gap-2 text-sm text-slate-300">
              {supportLinks.map((link) => (
                <Link
                  className="inline-flex items-center gap-2 transition hover:text-white"
                  href={link.href}
                  key={link.href}
                  rel={link.external ? "noreferrer" : undefined}
                  target={link.external ? "_blank" : undefined}
                >
                  {link.label === "GitHub" ? <GithubIcon className="h-4 w-4" /> : null}
                  <span>{link.label}</span>
                </Link>
              ))}
              <a
                className="inline-flex items-center gap-2 transition hover:text-white"
                href="mailto:contact@wellfriend.online"
              >
                <MailIcon className="h-4 w-4" />
                <span>contact@wellfriend.online</span>
              </a>
              <p className="text-sm text-slate-400">API Coming Soon</p>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>2026 WellFriend. All rights reserved.</p>
          <p>Open source software. Free to use and self-host.</p>
        </div>
      </div>
    </footer>
  );
}
