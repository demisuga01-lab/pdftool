import { MailIcon } from "@/components/icons/SiteIcons";
import { StaticPage } from "@/components/ui/StaticPage";

const reasons = [
  "General questions about PDFTools",
  "API access and early access requests",
  "Bug reports and feature suggestions",
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
    href: "mailto:contact@wellfriend.online?subject=Bug%20Report%20-%20PDFTools",
    label: "Bug Report",
  },
  {
    href: "mailto:contact@wellfriend.online?subject=Enterprise%20Pricing%20Inquiry",
    label: "Enterprise Pricing",
  },
];

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
            <span className="flex h-12 w-12 items-center justify-center rounded-md bg-[#2563EB]/10 text-[#2563EB]">
              <MailIcon className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-[#111827] dark:text-slate-100">Contact PDFTools by WellFriend</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Use email for product, API, and partnership questions.</p>
            </div>
          </div>

          <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-5 dark:border-white/10 dark:bg-slate-900">
            <ul className="space-y-3 text-[15px] leading-7 text-slate-600 dark:text-slate-300">
              {reasons.map((reason) => (
                <li className="flex gap-3" key={reason}>
                  <span className="mt-[10px] h-1.5 w-1.5 rounded-full bg-[#2563EB]" />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>

          <a
            className="inline-flex items-center gap-2 text-base font-semibold text-[#2563EB] hover:text-[#1D4ED8]"
            href="mailto:contact@wellfriend.online"
          >
            <MailIcon className="h-4 w-4" />
            contact@wellfriend.online
          </a>

          <div className="grid gap-3 sm:grid-cols-2">
            {contactButtons.map((button) => (
              <a className="secondary-button w-full" href={button.href} key={button.label}>
                {button.label}
              </a>
            ))}
          </div>

          <p className="text-sm leading-7 text-slate-500 dark:text-slate-400">
            Include your use case and expected monthly volume for API and enterprise inquiries.
          </p>
        </div>
      </div>
    </StaticPage>
  );
}
