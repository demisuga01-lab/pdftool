"use client";

import { useMemo, useState } from "react";

import {
  CalculatorIcon,
  ChevronDownIcon,
  DocumentIcon,
  GlobeIcon,
  MailIcon,
  StackIcon,
} from "@/components/icons/SiteIcons";
import { tools } from "@/lib/tools";
import { StaticPage } from "@/components/ui/StaticPage";

type OperationKey =
  | "pdf-compress"
  | "pdf-merge"
  | "pdf-split"
  | "pdf-rotate"
  | "pdf-extract-text"
  | "pdf-to-images"
  | "pdf-images-to-pdf"
  | "pdf-office-to-pdf"
  | "pdf-protect"
  | "pdf-decrypt"
  | "image-convert"
  | "image-resize"
  | "image-compress"
  | "image-crop"
  | "image-rotate"
  | "image-watermark"
  | "image-remove-background"
  | "image-ocr"
  | "image-batch-resize"
  | "image-info";

type CalculatorRow = {
  id: number;
  operation: OperationKey;
  quantity: number;
};

type Plan = {
  buttonDisabled?: boolean;
  buttonHref?: string;
  buttonLabel: string;
  comingSoon?: boolean;
  credits: number;
  price: number;
  usdPrice: string;
  rateLimit: string;
  fileSize?: string;
  label: string;
  notes: string[];
};

const operationCosts: Record<OperationKey, number> = {
  "pdf-compress": 2,
  "pdf-merge": 1,
  "pdf-split": 1,
  "pdf-rotate": 1,
  "pdf-extract-text": 2,
  "pdf-to-images": 5,
  "pdf-images-to-pdf": 1,
  "pdf-office-to-pdf": 5,
  "pdf-protect": 1,
  "pdf-decrypt": 1,
  "image-convert": 2,
  "image-resize": 2,
  "image-compress": 2,
  "image-crop": 1,
  "image-rotate": 1,
  "image-watermark": 2,
  "image-remove-background": 5,
  "image-ocr": 5,
  "image-batch-resize": 2,
  "image-info": 1,
};

const planCards: Plan[] = [
  {
    label: "Free Testing",
    price: 0,
    usdPrice: "$0",
    credits: 100,
    rateLimit: "10 requests per hour",
    buttonLabel: "Contact for Access",
    buttonHref: "mailto:contact@wellfriend.online?subject=Free%20API%20Testing%20Access",
    notes: [
      "100 credits, one time allocation, no monthly reset",
      "For integration testing only",
      "All tools available",
      "No SLA guarantee",
    ],
  },
  {
    label: "Starter",
    price: 799,
    usdPrice: "~$10/mo",
    credits: 1000,
    rateLimit: "100 requests per hour",
    buttonLabel: "Coming Soon",
    buttonDisabled: true,
    comingSoon: true,
    notes: [
      "1,000 credits per month, resets monthly",
      "Additional credits: ₹1 per credit beyond limit",
      "All tools available",
      "Email support",
    ],
  },
  {
    label: "Growth",
    price: 1999,
    usdPrice: "~$25/mo",
    credits: 2500,
    rateLimit: "300 requests per hour",
    buttonLabel: "Coming Soon",
    comingSoon: true,
    notes: [
      "2,500 credits per month, resets monthly",
      "Additional credits: ₹1 per credit beyond limit",
      "All tools available",
      "Priority email support",
    ],
  },
  {
    label: "Business",
    price: 5999,
    usdPrice: "~$80/mo",
    credits: 7000,
    rateLimit: "1,000 requests per hour",
    buttonLabel: "Coming Soon",
    buttonDisabled: true,
    comingSoon: true,
    notes: [
      "7,000 credits per month, resets monthly",
      "Additional credits: ₹1 per credit beyond limit",
      "All tools available",
      "Priority support with SLA",
    ],
  },
  {
    label: "Enterprise",
    price: 9000,
    usdPrice: "~$99/mo",
    credits: 10000,
    rateLimit: "Custom",
    buttonLabel: "Coming Soon",
    buttonDisabled: true,
    comingSoon: true,
    notes: [
      "10,000 credits per month, resets monthly",
      "Additional credits: ₹1 per credit beyond limit",
      "Dedicated processing queue",
      "Dedicated support with custom SLA",
    ],
  },
];

const calculatorOptions = [
  { value: "pdf-compress", label: "Compress PDF" },
  { value: "pdf-merge", label: "Merge PDFs" },
  { value: "pdf-split", label: "Split PDF" },
  { value: "pdf-rotate", label: "Rotate PDF" },
  { value: "pdf-extract-text", label: "Extract Text" },
  { value: "pdf-to-images", label: "PDF to Images" },
  { value: "pdf-images-to-pdf", label: "Images to PDF" },
  { value: "pdf-office-to-pdf", label: "Office to PDF" },
  { value: "pdf-protect", label: "Encrypt PDF" },
  { value: "pdf-decrypt", label: "Decrypt PDF" },
  { value: "image-convert", label: "Convert Image" },
  { value: "image-resize", label: "Resize Image" },
  { value: "image-compress", label: "Compress Image" },
  { value: "image-crop", label: "Crop Image" },
  { value: "image-rotate", label: "Rotate Image" },
  { value: "image-watermark", label: "Watermark Image" },
  { value: "image-remove-background", label: "Remove Background" },
  { value: "image-ocr", label: "OCR Image" },
  { value: "image-batch-resize", label: "Batch Resize" },
].map((option) => ({
  ...option,
  cost: operationCosts[option.value as OperationKey],
}));

const faqItems = [
  {
    question: "When will the API be available?",
    answer: "We are actively building the API. Email contact@wellfriend.online to join the waitlist.",
  },
  {
    question: "Can I use the free web tool while waiting for the API?",
    answer: "Yes. The web tool at tools.wellfriend.online is always free with no limits.",
  },
  {
    question: "Do unused credits roll over to the next month?",
    answer: "No. Credits reset at the start of each billing month.",
  },
  {
    question: "Can I get a refund?",
    answer: "Yes. We offer a full refund within 7 days if the API does not work for your use case.",
  },
  {
    question: "Is GST included in the prices shown?",
    answer: "No. Prices shown are exclusive of GST. 18% GST is applicable for Indian customers.",
  },
  {
    question: "Do you offer annual billing?",
    answer: "Contact us at contact@wellfriend.online for annual billing options with discount.",
  },
  {
    question: "What happens if I exceed my monthly credit limit?",
    answer: "Additional requests are charged at ₹1 per credit, billed at end of month.",
  },
  {
    question: "Can I use the API for commercial projects?",
    answer: "Yes. All paid plans allow commercial use.",
  },
];

function formatInr(value: number): string {
  return `₹${value.toLocaleString("en-IN")}`;
}

function PricingPlanCard({ plan }: { plan: Plan }) {
  return (
    <div className="relative flex h-full min-w-[220px] flex-col rounded-xl border border-zinc-200 bg-white p-6 shadow-sm shadow-slate-900/[0.04] dark:border-white/10 dark:bg-zinc-900">
      {plan.comingSoon ? (
        <span className="absolute right-4 top-4 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-500 dark:bg-zinc-800 dark:text-zinc-300">
          Coming Soon
        </span>
      ) : null}

      <div className="flex h-full flex-col">
        <div className="space-y-4">
          <div className="pr-16">
            <h3 className="text-[16px] font-semibold text-gray-900 dark:text-zinc-100">{plan.label}</h3>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-end gap-1 text-gray-900 dark:text-zinc-100">
              <span className="text-[20px] font-semibold">₹</span>
              <span className="text-[48px] font-bold leading-none">{plan.price.toLocaleString("en-IN")}</span>
              <span className="pb-1 text-[14px] font-medium text-gray-400 dark:text-zinc-500">{plan.price === 0 ? "" : "/mo"}</span>
            </div>
            <p className="text-[14px] font-medium text-gray-400 dark:text-zinc-500">
              {plan.price === 0 ? "~$0" : plan.usdPrice}
            </p>
            <p className="text-[13px] font-medium text-gray-500 dark:text-zinc-400">{plan.credits.toLocaleString("en-IN")} credits</p>
          </div>
        </div>

        <div className="my-5 border-t border-zinc-200 dark:border-white/10" />

        <ul className="flex-1 space-y-3 text-[13px] font-medium leading-6 text-slate-600 dark:text-zinc-300">
          {plan.notes.map((note) => (
            <li className="flex gap-3" key={note}>
              <span className="mt-[2px] shrink-0 text-[#059669]">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3.5 8.5 6.3 11.3 12.5 5.1" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
                </svg>
              </span>
              <span>{note}</span>
            </li>
          ))}
          <li className="flex gap-3">
            <span className="mt-[2px] shrink-0 text-[#059669]">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                <path d="M3.5 8.5 6.3 11.3 12.5 5.1" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
              </svg>
            </span>
            <span>Rate limit: {plan.rateLimit}</span>
          </li>
          {plan.fileSize ? (
            <li className="flex gap-3">
              <span className="mt-[2px] shrink-0 text-[#059669]">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3.5 8.5 6.3 11.3 12.5 5.1" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
                </svg>
              </span>
              <span>Maximum file size: {plan.fileSize}</span>
            </li>
          ) : null}
        </ul>

        <div className="mt-6">
          {plan.buttonHref ? (
            <a className="primary-button h-10 w-full" href={plan.buttonHref}>
              {plan.buttonLabel}
            </a>
          ) : (
            <button
              className={[
                "h-10 w-full rounded-lg text-sm font-semibold transition",
                plan.buttonDisabled
                  ? "border border-zinc-300 bg-gray-100 text-gray-500 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-400"
                  : "bg-[#059669] text-white hover:bg-[#047857]",
              ].join(" ")}
              disabled={plan.buttonDisabled}
              type="button"
            >
              {plan.buttonLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function FAQItem({
  answer,
  open,
  question,
  toggle,
}: {
  answer: string;
  open: boolean;
  question: string;
  toggle: () => void;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white dark:border-white/10 dark:bg-zinc-900">
      <button
        className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left"
        onClick={toggle}
        type="button"
      >
        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{question}</span>
        <ChevronDownIcon className={["h-4 w-4 text-slate-400 transition", open ? "rotate-180" : ""].join(" ")} />
      </button>
      {open ? <div className="border-t border-zinc-200 px-4 py-4 text-sm leading-7 text-slate-600 dark:border-white/10 dark:text-zinc-300">{answer}</div> : null}
    </div>
  );
}

export default function PricingPage() {
  const [bannerVisible, setBannerVisible] = useState(true);
  const [rows, setRows] = useState<CalculatorRow[]>([{ id: 1, operation: "pdf-compress", quantity: 100 }]);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const totalCredits = useMemo(
    () => rows.reduce((sum, row) => sum + operationCosts[row.operation] * row.quantity, 0),
    [rows],
  );

  const recommendedPlan = useMemo(() => {
    const candidates = planCards.filter((plan) => plan.label !== "Free Testing");
    const match = candidates.find((plan) => totalCredits <= plan.credits);
    return match ?? planCards[planCards.length - 1];
  }, [totalCredits]);

  const overage = Math.max(0, totalCredits - recommendedPlan.credits);
  const totalEstimated = recommendedPlan.price + overage;

  const toolReference = useMemo(
    () =>
      tools.map((tool) => {
        const key = `${tool.category}-${tool.id}` as OperationKey;
        const credits = operationCosts[key] ?? 1;
        return {
          name: tool.name,
          category: tool.category === "pdf" ? "PDF" : "Image",
          credits,
          starter: 799 + Math.max(0, credits * 100 - 1000),
          growth: 1999 + Math.max(0, credits * 100 - 2500),
        };
      }),
    [],
  );

  return (
    <StaticPage
      description="Indicative API pricing and credit planning for PDFTools."
      eyebrow="Pricing"
      title="Simple web usage today, API pricing in progress"
      width="wide"
    >
      <div className="space-y-10">
        {bannerVisible ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-7 text-amber-950 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-100">
            <div className="flex items-start justify-between gap-4">
              <p>
                API integration is currently in development. Prices listed are indicative and subject
                to change at launch. For early access or custom requirements, contact
                {" "}
                <a className="font-semibold underline underline-offset-2" href="mailto:contact@wellfriend.online">
                  contact@wellfriend.online
                </a>
                .
              </p>
              <button className="text-sm font-semibold" onClick={() => setBannerVisible(false)} type="button">
                Dismiss
              </button>
            </div>
          </div>
        ) : null}

        <section className="tool-panel space-y-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#059669]/10 text-[#059669]">
              <GlobeIcon className="h-5 w-5" />
            </span>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Free Web Tool</h2>
          </div>
          <ul className="grid gap-3 text-sm leading-7 text-slate-600 dark:text-zinc-300 sm:grid-cols-2">
            <li>Always free, no signup required</li>
            <li>All 20 PDF and image tools</li>
            <li>Maximum upload size: 25 MB per file</li>
            <li>Files deleted within 24 hours</li>
            <li>Public launch rate limit: 100 requests per hour</li>
            <li>No API access on free tier</li>
          </ul>
        </section>

        <section className="tool-panel space-y-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#059669]/10 text-[#059669]">
              <StackIcon className="h-5 w-5" />
            </span>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">How Credits Work</h2>
          </div>
          <div className="grid gap-6 lg:grid-cols-4">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-zinc-950">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Simple operations</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">1 credit each</p>
              <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-zinc-300">
                Merge PDFs, Split PDF, Rotate PDF, Encrypt PDF, Decrypt PDF, Crop Image, Rotate Image, Images to PDF
              </p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-zinc-950">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Standard operations</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">2 credits each</p>
              <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-zinc-300">
                Compress PDF, Extract Text, Convert Image, Resize Image, Compress Image, Watermark Image
              </p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-zinc-950">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Heavy operations</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">5 credits each</p>
              <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-zinc-300">
                PDF to Images, Office to PDF, OCR Image, Remove Background
              </p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-zinc-950">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Batch operations</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">Per file multiplier</p>
              <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-zinc-300">
                Credits are multiplied by the number of files in the batch.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#059669]/10 text-[#059669]">
              <DocumentIcon className="h-5 w-5" />
            </span>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">API Plans</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2 min-[1200px]:grid-cols-5">
            {planCards.map((plan) => (
              <PricingPlanCard key={plan.label} plan={plan} />
            ))}
          </div>
          <p className="text-sm leading-7 text-slate-500 dark:text-zinc-400">
            Public web usage is currently capped at 25 MB per file. API-specific file limits will be finalized before
            api.wellfriend.online launches.
          </p>
          <div className="tool-panel">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Need more than 10,000 credits or a white-label setup?</h3>
            <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-zinc-300">
              Contact: contact@wellfriend.online
            </p>
            <a
              className="primary-button mt-5"
              href="mailto:contact@wellfriend.online?subject=Custom%20Plan%20Inquiry"
            >
              Request Custom Pricing
            </a>
          </div>
        </section>

        <section className="tool-panel space-y-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#059669]/10 text-[#059669]">
              <CalculatorIcon className="h-5 w-5" />
            </span>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Credit Calculator</h2>
          </div>

          <div className="space-y-4">
            {rows.map((row) => {
              const subtotal = operationCosts[row.operation] * row.quantity;

              return (
                <div className="grid gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-zinc-950 md:grid-cols-[1.6fr_0.7fr_0.7fr_auto] md:items-end" key={row.id}>
                  <label className="space-y-2">
                    <span className="field-label">Operation</span>
                    <select
                      className="field-input"
                      onChange={(event) =>
                        setRows((current) =>
                          current.map((item) =>
                            item.id === row.id
                              ? { ...item, operation: event.target.value as OperationKey }
                              : item,
                          ),
                        )
                      }
                      value={row.operation}
                    >
                      {calculatorOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label} ({option.cost} credits)
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="field-label">Quantity</span>
                    <input
                      className="field-input"
                      min={1}
                      onChange={(event) =>
                        setRows((current) =>
                          current.map((item) =>
                            item.id === row.id
                              ? { ...item, quantity: Math.max(1, Number(event.target.value) || 1) }
                              : item,
                          ),
                        )
                      }
                      type="number"
                      value={row.quantity}
                    />
                  </label>

                  <div className="space-y-2">
                    <span className="field-label">Subtotal</span>
                    <div className="field-input flex items-center">{subtotal.toLocaleString("en-IN")} credits</div>
                  </div>

                  <button
                    className="secondary-button"
                    onClick={() =>
                      setRows((current) => (current.length === 1 ? current : current.filter((item) => item.id !== row.id)))
                    }
                    type="button"
                  >
                    Remove
                  </button>
                </div>
              );
            })}

            <button
              className="secondary-button"
              onClick={() =>
                setRows((current) => [
                  ...current,
                  {
                    id: Date.now(),
                    operation: "pdf-merge",
                    quantity: 1,
                  },
                ])
              }
              type="button"
            >
              Add Operation
            </button>
          </div>

          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-5 dark:border-white/10 dark:bg-zinc-950">
              <p className="text-sm text-slate-500 dark:text-zinc-400">Total credits</p>
              <p className="mt-2 text-4xl font-semibold text-zinc-900 dark:text-zinc-100">{totalCredits.toLocaleString("en-IN")}</p>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-white/10 dark:bg-zinc-900">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Recommended plan: {recommendedPlan.label}</h3>
              <div className="mt-4 space-y-2 text-sm leading-7 text-slate-600 dark:text-zinc-300">
                <p>Plan cost: {formatInr(recommendedPlan.price)}</p>
                <p>Credits included: {recommendedPlan.credits.toLocaleString("en-IN")}</p>
                <p>Your usage: {totalCredits.toLocaleString("en-IN")} credits</p>
                <p>Overage: {overage.toLocaleString("en-IN")} credits at ₹1 each = {formatInr(overage)}</p>
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">Total estimated monthly cost: {formatInr(totalEstimated)}</p>
              </div>
              <a
                className="primary-button mt-5"
                href={`mailto:contact@wellfriend.online?subject=API%20Plan%20Inquiry%20-%20${encodeURIComponent(String(totalCredits))}%20credits%20per%20month`}
              >
                Contact for this plan
              </a>
            </div>
          </div>
        </section>

        <section className="tool-panel space-y-6">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Per Tool Reference Table</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-slate-500 dark:border-white/10 dark:text-zinc-400">
                  <th className="pb-3 pr-4 font-medium">Tool</th>
                  <th className="pb-3 pr-4 font-medium">Category</th>
                  <th className="pb-3 pr-4 font-medium">Credits per Request</th>
                  <th className="pb-3 pr-4 font-medium">Est. Monthly cost at Starter</th>
                  <th className="pb-3 font-medium">Est. Monthly cost at Growth</th>
                </tr>
              </thead>
              <tbody>
                {toolReference.map((tool) => (
                  <tr className="border-b border-[#F1F5F9] dark:border-white/10" key={`${tool.category}-${tool.name}`}>
                    <td className="py-3 pr-4 text-zinc-900 dark:text-zinc-100">{tool.name}</td>
                    <td className="py-3 pr-4 text-slate-600 dark:text-zinc-300">{tool.category}</td>
                    <td className="py-3 pr-4 text-slate-600 dark:text-zinc-300">{tool.credits}</td>
                    <td className="py-3 pr-4 text-slate-600 dark:text-zinc-300">{formatInr(tool.starter)}</td>
                    <td className="py-3 text-slate-600 dark:text-zinc-300">{formatInr(tool.growth)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-slate-500 dark:text-zinc-400">Batch operations multiply credits by file count.</p>
        </section>

        <section className="tool-panel space-y-6">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">FAQ</h2>
          <div className="space-y-3">
            {faqItems.map((item, index) => (
              <FAQItem
                answer={item.answer}
                key={item.question}
                open={openFaq === index}
                question={item.question}
                toggle={() => setOpenFaq((current) => (current === index ? null : index))}
              />
            ))}
          </div>
        </section>
      </div>
    </StaticPage>
  );
}
