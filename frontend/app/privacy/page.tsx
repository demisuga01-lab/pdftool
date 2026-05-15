import type { Metadata } from "next";
import { ShieldIcon } from "@/components/icons/SiteIcons";
import { DocumentSection, StaticPage } from "@/components/ui/StaticPage";
import { PUBLIC_FILE_HANDLING_STATEMENT } from "@/lib/copy";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Privacy Policy | PDFTools by WellFriend",
  description:
    "Read how PDFTools handles uploaded files, rate-limiting data, and support contact for privacy questions.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <StaticPage
      description="How PDFTools handles files, network information, and privacy questions."
      eyebrow="Privacy Policy"
      title="Privacy Policy"
    >
      <div className="space-y-10">
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-5 dark:border-white/10 dark:bg-zinc-900">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-md bg-[#059669]/10 text-[#059669]">
              <ShieldIcon className="h-5 w-5" />
            </span>
            <div className="space-y-1 text-[15px] leading-7 text-slate-600 dark:text-zinc-300">
              <p><span className="font-semibold text-zinc-900 dark:text-zinc-100">Effective date:</span> April 25, 2026</p>
              <p><span className="font-semibold text-zinc-900 dark:text-zinc-100">Company:</span> WellFriend, India</p>
              <p><span className="font-semibold text-zinc-900 dark:text-zinc-100">Contact:</span> contact@wellfriend.online</p>
            </div>
          </div>
        </div>

        <DocumentSection title="What We Collect">
          <p>
            We process uploaded files in order to complete the tool action you start on
            PDFTools. {PUBLIC_FILE_HANDLING_STATEMENT}
          </p>
          <p>
            We also process IP addresses for rate limiting and abuse prevention only. We do not
            use cookies, analytics tracking, advertising trackers, or third-party behavioral
            profiling tools.
          </p>
        </DocumentSection>

        <DocumentSection title="How We Use Data">
          <p>
            We use uploaded files solely to process the file request you submit. We do not use
            files for model training, profiling, advertising, resale, or secondary analysis.
          </p>
        </DocumentSection>

        <DocumentSection title="Data Storage and Retention">
          <p>
            Files are processed on infrastructure used to run the selected tool. They may pass
            through temporary server-side storage while a job is running, but the service is not
            intended to provide permanent file storage.
          </p>
          <p>
            Because the service does not require user accounts, no long-term personal profile or
            account data is stored.
          </p>
        </DocumentSection>

        <DocumentSection title="What We Do Not Do">
          <p>
            We do not sell, share, or retain personal data beyond what is technically required to
            process the request and enforce rate limits. We do not use third-party analytics or
            advertising services.
          </p>
        </DocumentSection>

        <DocumentSection title="Your Rights">
          <p>
            If you have a privacy concern, contact us and include the tool name, file type,
            approximate size, any job ID shown, and the exact issue you experienced so we can
            investigate responsibly.
          </p>
        </DocumentSection>

        <DocumentSection title="Children">
          <p>
            This service is not intended for users under 13 years of age.
          </p>
        </DocumentSection>

        <DocumentSection title="Legal Basis and Governing Law">
          <p>
            This Privacy Policy is governed by Indian law, including the Information Technology
            Act, 2000.
          </p>
        </DocumentSection>

        <DocumentSection title="Contact">
          <p>
            For privacy concerns or questions about this policy, contact
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
