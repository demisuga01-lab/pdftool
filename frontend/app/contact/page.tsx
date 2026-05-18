import type { Metadata } from "next";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { AlertTriangle, ArrowRight, Bug, CheckCircle2, LifeBuoy, Mail, MessageCircle, ShieldAlert } from "lucide-react";

import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Contact PDFTools by WellFriend",
  description:
    "Get support for PDFTools processing issues, uploads, downloads, bugs, security reports, API questions, and business inquiries.",
  path: "/contact",
});

const supportUses = [
  "Broken tools or repeated processing failures",
  "Upload or download issues",
  "Abuse reports",
  "Security reports",
  "Failed jobs with an error or job ID",
];

const contactUses = [
  "General questions",
  "API questions or future API interest",
  "Feature suggestions",
  "Business and partnership inquiries",
];

const reportChecklist = [
  "Tool or route used",
  "File type",
  "Approximate file size",
  "Exact error text",
  "Job ID if shown",
  "Screenshot if helpful",
  "Whether it happens repeatedly",
];

function ContactCard({
  description,
  email,
  icon: Icon,
  items,
  label,
  subject,
  title,
}: {
  description: string;
  email: string;
  icon: LucideIcon;
  items: string[];
  label: string;
  subject: string;
  title: string;
}) {
  return (
    <section className="flex h-full flex-col rounded-3xl border border-zinc-200/90 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900">
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">{description}</p>
        </div>
      </div>
      <a className="mt-5 text-base font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200" href={`mailto:${email}`}>
        {email}
      </a>
      <div className="mt-5 grid gap-2">
        {items.map((item) => (
          <div className="flex gap-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300" key={item}>
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-300" />
            <span>{item}</span>
          </div>
        ))}
      </div>
      <a className="primary-button mt-6 h-12 rounded-2xl px-5 shadow-sm" href={`mailto:${email}?subject=${encodeURIComponent(subject)}`}>
        {label}
      </a>
    </section>
  );
}

export default function ContactPage() {
  return (
    <main className="overflow-x-hidden bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <section className="border-b border-zinc-200/80 bg-zinc-100/70 dark:border-white/10 dark:bg-zinc-950">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Contact</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl">
            Get help with files, tools, bugs, security, or API questions
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-zinc-600 dark:text-zinc-300 sm:text-lg">
            Send the right details to the right mailbox so we can understand the issue faster.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-2">
          <ContactCard
            description="Use this for anything that affects a file workflow, job result, safety report, or user-facing failure."
            email="support@wellfriend.online"
            icon={LifeBuoy}
            items={supportUses}
            label="Email support"
            subject="PDFTools support request"
            title="Support"
          />
          <ContactCard
            description="Use this for product questions, future API interest, business conversations, and non-urgent feedback."
            email="contact@wellfriend.online"
            icon={Mail}
            items={contactUses}
            label="Email contact"
            subject="PDFTools general inquiry"
            title="General & business"
          />
        </div>
      </section>

      <section className="border-y border-zinc-200/80 bg-white dark:border-white/10 dark:bg-zinc-900/45">
        <div className="mx-auto grid max-w-7xl gap-5 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.82fr)] lg:px-8">
          <section className="rounded-3xl border border-zinc-200/90 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900">
            <div className="flex items-start gap-4">
              <Bug className="mt-1 h-5 w-5 text-zinc-400" />
              <div>
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">What to include</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">A good report is specific.</h2>
                <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                  You do not need to over-explain. A few concrete details usually make support much faster.
                </p>
              </div>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {reportChecklist.map((item) => (
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-semibold text-zinc-700 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-200" key={item}>
                  {item}
                </div>
              ))}
            </div>
          </section>

          <aside className="space-y-5">
            <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-950 shadow-sm dark:border-amber-400/25 dark:bg-amber-500/10 dark:text-amber-100">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-1 h-5 w-5 shrink-0" />
                <div>
                  <h2 className="text-lg font-semibold">What not to send</h2>
                  <p className="mt-3 text-sm leading-7">
                    Do not send passwords, API keys, credentials, or unrelated private secrets. Avoid highly sensitive files unless explicitly requested and agreed.
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-zinc-200/90 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900">
              <div className="flex items-start gap-3">
                <MessageCircle className="mt-1 h-5 w-5 shrink-0 text-zinc-400" />
                <div>
                  <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">Community help</h2>
                  <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                    Discord is useful for community help, updates, and discussion. It is not a replacement for official support for abuse or security reports.
                  </p>
                  <a
                    className="secondary-button mt-5 h-11 rounded-2xl px-4 dark:bg-zinc-950"
                    href="https://discord.gg/ZQFmYaQbVu"
                    rel="noreferrer"
                    target="_blank"
                  >
                    Join Discord
                  </a>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="rounded-3xl border border-zinc-200/90 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900 sm:p-8">
          <div className="grid gap-5 md:grid-cols-4">
            {["Upload issue", "Processing issue", "Download issue", "Support with job ID"].map((step, index) => (
              <div className="relative rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-zinc-950" key={step}>
                <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">0{index + 1}</p>
                <p className="mt-3 text-sm font-semibold text-zinc-950 dark:text-zinc-50">{step}</p>
                {index < 3 ? <ArrowRight className="absolute right-4 top-4 hidden h-4 w-4 text-zinc-300 md:block" /> : <ShieldAlert className="absolute right-4 top-4 h-4 w-4 text-zinc-300" />}
              </div>
            ))}
          </div>
          <p className="mt-5 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
            Looking for self-serve help first? <Link className="font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200" href="/docs">Browse the help center</Link>.
          </p>
        </div>
      </section>
    </main>
  );
}
