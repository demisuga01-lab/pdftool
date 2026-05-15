import type { Metadata } from "next";
import { DocumentIcon } from "@/components/icons/SiteIcons";
import { DocumentSection, StaticPage } from "@/components/ui/StaticPage";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Terms of Service | PDFTools by WellFriend",
  description:
    "Review the terms that apply to using PDFTools by WellFriend, including acceptable use and service disclaimers.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <StaticPage
      description="Terms that apply to your use of PDFTools."
      eyebrow="Terms of Service"
      title="Terms of Service"
    >
      <div className="space-y-10">
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-5 dark:border-white/10 dark:bg-zinc-900">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-md bg-[#059669]/10 text-[#059669]">
              <DocumentIcon className="h-5 w-5" />
            </span>
            <div className="space-y-1 text-[15px] leading-7 text-slate-600 dark:text-zinc-300">
              <p><span className="font-semibold text-zinc-900 dark:text-zinc-100">Effective date:</span> April 25, 2026</p>
              <p><span className="font-semibold text-zinc-900 dark:text-zinc-100">Provider:</span> WellFriend, India</p>
              <p><span className="font-semibold text-zinc-900 dark:text-zinc-100">Contact:</span> contact@wellfriend.online</p>
            </div>
          </div>
        </div>

        <DocumentSection title="Service Scope">
          <p>
            PDFTools is provided as-is and without warranty of any kind. We may
            update, suspend, or change features at any time.
          </p>
        </DocumentSection>

        <DocumentSection title="Ownership of Your Files">
          <p>
            You retain full ownership and all rights to the files you upload. WellFriend does not
            claim ownership, license rights beyond processing, or any commercial interest in your
            uploaded files.
          </p>
        </DocumentSection>

        <DocumentSection title="Prohibited Uses">
          <p>
            You may not use the service to upload illegal content, malware, copyrighted material
            without rights, content intended to harm others, or to conduct automated abuse or rate
            limit circumvention.
          </p>
        </DocumentSection>

        <DocumentSection title="Abuse Prevention">
          <p>
            We reserve the right to block IP addresses that abuse the service or interfere with
            platform stability, availability, or security.
          </p>
        </DocumentSection>

        <DocumentSection title="Disclaimers and Liability">
          <p>
            WellFriend is not liable for file loss, processing errors, output inaccuracies, or any
            damages arising from use of this service.
          </p>
        </DocumentSection>

        <DocumentSection title="API Terms">
          <p>
            API usage, when available, will be governed by separate API Terms.
          </p>
        </DocumentSection>

        <DocumentSection title="Governing Law and Jurisdiction">
          <p>
            All disputes are governed by Indian law. Exclusive jurisdiction lies with the courts
            of India.
          </p>
        </DocumentSection>

        <DocumentSection title="Questions">
          <p>
            For questions about these Terms, contact
            {" "}
            <a className="font-medium text-[#059669] hover:text-[#047857]" href="mailto:contact@wellfriend.online">
              contact@wellfriend.online
            </a>
            .
          </p>
        </DocumentSection>
      </div>
    </StaticPage>
  );
}
