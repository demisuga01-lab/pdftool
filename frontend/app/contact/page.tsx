import type { Metadata } from "next";
import Link from "next/link";

import { MailIcon } from "@/components/icons/SiteIcons";
import { StaticPage } from "@/components/ui/StaticPage";
import { PUBLIC_FILE_HANDLING_STATEMENT } from "@/lib/copy";
import { buildPageMetadata } from "@/lib/metadata";

const reasons = [
  "General questions about PDFTools",
  "API access and early access requests (api.wellfriend.online coming soon)",
  "Feature suggestions and feedback",
  "Enterprise and custom pricing",
  "Partnership inquiries",
];

const contactButtons = [
  {
    href: "mailto:contact@wellfriend.online?subject=General%20Inquiry",
    label: "General Inquiry",
  },
  {
    href: "mailto:contact@wellfriend.online?subject=API%20Early%20Access%20Request",
    label: "API Early Access Request",
  },
  {
    href: "mailto:support@wellfriend.online?subject=Bug%20Report%20-%20PDFTools",
    label: "Bug Report (support@)",
  },
  {
    href: "mailto:contact@wellfriend.online?subject=Enterprise%20Pricing%20Inquiry",
    label: "Enterprise Pricing",
  },
];

export const metadata: Metadata = buildPageMetadata({
  title: "Contact PDFTools by WellFriend",
  description:
    "Get support for processing issues, ask product questions, or reach the team about API, business, and partnerships.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <StaticPage
      description="We respond within 48 hours"
      eyebrow="Contact"
      title="Get in Touch"
    >
      <div className="mx-auto max-w-[600px]">
        <div className="tool-panel space-y-6">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-md bg-[#059669]/10 text-[#059669]">
              <MailIcon className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Contact PDFTools</h2>
              <p className="text-sm text-slate-500 dark:text-zinc-400">Use email for product, API, and partnership questions.</p>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200/70 bg-zinc-50 p-5 dark:border-white/10 dark:bg-zinc-900">
            <ul className="space-y-3 text-[15px] leading-7 text-slate-600 dark:text-zinc-300">
              {reasons.map((reason) => (
                <li className="flex gap-3" key={reason}>
                  <span className="mt-[10px] h-1.5 w-1.5 rounded-full bg-[#059669]" />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid gap-2 text-sm">
            <a
              className="inline-flex items-center gap-2 text-base font-semibold text-[#059669] hover:text-[#047857]"
              href="mailto:contact@wellfriend.online"
            >
              <MailIcon className="h-4 w-4" />
              contact@wellfriend.online
              <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">(general, API, partnerships, suggestions)</span>
            </a>
            <a
              className="inline-flex items-center gap-2 text-base font-semibold text-[#059669] hover:text-[#047857]"
              href="mailto:support@wellfriend.online"
            >
              <MailIcon className="h-4 w-4" />
              support@wellfriend.online
              <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">(bugs, processing failures, abuse reports)</span>
            </a>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950">
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-emerald-800 dark:text-emerald-200">Join our Discord community</h3>
              <p className="text-sm leading-7 text-emerald-700/90 dark:text-emerald-100/90">
                Join the WellFriend Corp Discord for community help, updates, and discussion. Email remains the
                official support path for bugs, processing failures, security issues, and abuse reports.
              </p>
            </div>
            <a
              className="primary-button mt-4 inline-flex"
              href="https://discord.gg/ZQFmYaQbVu"
              rel="noreferrer"
              target="_blank"
            >
              Join Discord
            </a>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {contactButtons.map((button) => (
              <a className="secondary-button w-full" href={button.href} key={button.label}>
                {button.label}
              </a>
            ))}
          </div>

          <p className="text-sm leading-7 text-slate-500 dark:text-zinc-400">
            Include your use case and expected monthly volume for API and enterprise inquiries. Maximum upload size is
            25 MB. {PUBLIC_FILE_HANDLING_STATEMENT}
          </p>
          <p className="text-sm leading-7 text-slate-500 dark:text-zinc-400">
            Looking for help with uploads, settings, downloads, or troubleshooting first?{" "}
            <Link className="font-semibold text-[#059669] hover:text-[#047857]" href="/docs">
              Browse the help center
            </Link>
            .
          </p>
        </div>
      </div>
    </StaticPage>
  );
}
