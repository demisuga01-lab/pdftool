"use client";

import { useMemo, useState } from "react";

import {
  CalculatorIcon,
  ChevronDownIcon,
  DocumentIcon,
  GlobeIcon,
  StackIcon,
} from "@/components/icons/SiteIcons";
import { StaticPage } from "@/components/ui/StaticPage";
import { PUBLIC_FILE_HANDLING_STATEMENT } from "@/lib/copy";

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
  credits: number;
  label: string;
  monthlyPriceInr: number;
  notes: string[];
  rateLimit: string;
  status?: "live" | "coming-soon";
  usdPrice: string;
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

const calculatorOptions: Array<{ cost: number; label: string; value: OperationKey }> = [
  { value: "pdf-compress", label: "Compress PDF", cost: 2 },
  { value: "pdf-merge", label: "Merge PDFs", cost: 1 },
  { value: "pdf-split", label: "Split PDF", cost: 1 },
  { value: "pdf-rotate", label: "Rotate PDF", cost: 1 },
  { value: "pdf-extract-text", label: "Extract Text", cost: 2 },
  { value: "pdf-to-images", label: "PDF to Images", cost: 5 },
  { value: "pdf-images-to-pdf", label: "Images to PDF", cost: 1 },
  { value: "pdf-office-to-pdf", label: "Office to PDF", cost: 5 },
  { value: "pdf-protect", label: "Encrypt PDF", cost: 1 },
  { value: "pdf-decrypt", label: "Decrypt PDF", cost: 1 },
  { value: "image-convert", label: "Convert Image", cost: 2 },
  { value: "image-resize", label: "Resize Image", cost: 2 },
  { value: "image-compress", label: "Compress Image", cost: 2 },
  { value: "image-crop", label: "Crop Image", cost: 1 },
  { value: "image-rotate", label: "Rotate Image", cost: 1 },
  { value: "image-watermark", label: "Watermark Image", cost: 2 },
  { value: "image-remove-background", label: "Remove Background", cost: 5 },
  { value: "image-ocr", label: "OCR Image", cost: 5 },
  { value: "image-batch-resize", label: "Batch Resize", cost: 2 },
  { value: "image-info", label: "Image Info", cost: 1 },
];

const planCards: Plan[] = [
  {
    label: "Free Testing",
    monthlyPriceInr: 0,
    usdPrice: "$0",
    credits: 100,
    rateLimit: "10 requests per hour",
    buttonLabel: "Contact for Access",
    buttonHref: "mailto:contact@wellfriend.online?subject=Free%20API%20Testing%20Access",
    status: "live",
    notes: [
      "One-time credit allocation for integration testing",
      "Good for trying the API before launch",
      "All current tools included",
      "No SLA guarantee",
    ],
  },
  {
    label: "Starter",
    monthlyPriceInr: 799,
    usdPrice: "~$10/mo",
    credits: 1000,
    rateLimit: "100 requests per hour",
    buttonLabel: "Coming Soon",
    buttonDisabled: true,
    status: "coming-soon",
    notes: [
      "1,000 credits per month",
      "All current tools included",
      "Email support",
      "Additional usage billed at INR 1 per credit",
    ],
  },
  {
    label: "Growth",
    monthlyPriceInr: 1999,
    usdPrice: "~$25/mo",
    credits: 2500,
    rateLimit: "300 requests per hour",
    buttonLabel: "Coming Soon",
    buttonDisabled: true,
    status: "coming-soon",
    notes: [
      "2,500 credits per month",
      "All current tools included",
      "Priority email support",
      "Additional usage billed at INR 1 per credit",
    ],
  },
  {
    label: "Business",
    monthlyPriceInr: 5999,
    usdPrice: "~$80/mo",
    credits: 7000,
    rateLimit: "1,000 requests per hour",
    buttonLabel: "Coming Soon",
    buttonDisabled: true,
    status: "coming-soon",
    notes: [
      "7,000 credits per month",
      "Priority support expectations",
      "Best for larger product teams",
      "Additional usage billed at INR 1 per credit",
    ],
  },
  {
    label: "Enterprise",
    monthlyPriceInr: 9000,
    usdPrice: "~$99/mo",
    credits: 10000,
    rateLimit: "Custom",
    buttonLabel: "Coming Soon",
    buttonDisabled: true,
    status: "coming-soon",
    notes: [
      "10,000 credits per month",
      "Custom queue and support planning",
      "Best for high-volume workflows",
      "Additional usage billed at INR 1 per credit",
    ],
  },
];

const faqItems = [
  {
    question: "Is the public website still free to use?",
    answer: "Yes. The website is currently free to use with the published upload and rate-limit policies.",
  },
  {
    question: "Is the API available right now?",
    answer: "API access is still in progress. Contact contact@wellfriend.online if you want early access or launch updates.",
  },
  {
    question: "Do credits roll over?",
    answer: "The indicative paid plans shown here assume monthly credits reset each billing cycle.",
  },
  {
    question: "What happens if I exceed my monthly credit limit?",
    answer: "The current pricing draft assumes additional usage is billed at INR 1 per credit.",
  },
  {
    question: "What should I send with an API inquiry?",
    answer: "Include your use case, expected monthly volume, likely file types, and any output requirements.",
  },
];

function formatInr(value: number) {
  return `INR ${value.toLocaleString("en-IN")}`;
}

function PlanCard({ plan }: { plan: Plan }) {
  return (
    <div className="relative flex h-full flex-col rounded-xl border border-zinc-200 bg-white p-6 shadow-sm shadow-slate-900/[0.04] dark:border-white/10 dark:bg-zinc-900">
      {plan.status === "coming-soon" ? (
        <span className="absolute right-4 top-4 rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300">
          Coming Soon
        </span>
      ) : null}

      <div className="space-y-4">
        <div className="pr-16">
          <h3 className="text-[16px] font-semibold text-zinc-900 dark:text-zinc-100">{plan.label}</h3>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-end gap-2 text-zinc-900 dark:text-zinc-100">
            <span className="text-[18px] font-semibold">INR</span>
            <span className="text-[44px] font-bold leading-none">{plan.monthlyPriceInr.toLocaleString("en-IN")}</span>
            <span className="pb-1 text-[14px] font-medium text-zinc-400 dark:text-zinc-500">
              {plan.monthlyPriceInr === 0 ? "" : "/mo"}
            </span>
          </div>
          <p className="text-[14px] font-medium text-zinc-400 dark:text-zinc-500">{plan.usdPrice}</p>
          <p className="text-[13px] font-medium text-zinc-500 dark:text-zinc-400">
            {plan.credits.toLocaleString("en-IN")} credits
          </p>
        </div>
      </div>

      <div className="my-5 border-t border-zinc-200 dark:border-white/10" />

      <ul className="flex-1 space-y-3 text-[13px] font-medium leading-6 text-slate-600 dark:text-zinc-300">
        {plan.notes.map((note) => (
          <li className="flex gap-3" key={note}>
            <span className="mt-[2px] shrink-0 text-[#059669]">+</span>
            <span>{note}</span>
          </li>
        ))}
        <li className="flex gap-3">
          <span className="mt-[2px] shrink-0 text-[#059669]">+</span>
          <span>Rate limit: {plan.rateLimit}</span>
        </li>
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
                ? "border border-zinc-300 bg-zinc-100 text-zinc-500 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-400"
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
      <button className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left" onClick={toggle} type="button">
        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{question}</span>
        <ChevronDownIcon className={["h-4 w-4 text-slate-400 transition", open ? "rotate-180" : ""].join(" ")} />
      </button>
      {open ? (
        <div className="border-t border-zinc-200 px-4 py-4 text-sm leading-7 text-slate-600 dark:border-white/10 dark:text-zinc-300">
          {answer}
        </div>
      ) : null}
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
    return candidates.find((plan) => totalCredits <= plan.credits) ?? candidates[candidates.length - 1];
  }, [totalCredits]);

  const overage = Math.max(0, totalCredits - recommendedPlan.credits);
  const totalEstimated = recommendedPlan.monthlyPriceInr + overage;

  return (
    <StaticPage
      description="Indicative API pricing and planning guidance for PDFTools."
      eyebrow="Pricing"
      title="Simple web usage today, API pricing in progress"
      width="wide"
    >
      <div className="space-y-10">
        {bannerVisible ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-7 text-amber-950 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-100">
            <div className="flex items-start justify-between gap-4">
              <p>
                API pricing is still being finalized. The numbers on this page are planning guidance, not a launch
                guarantee. Contact{" "}
                <a className="font-semibold underline underline-offset-2" href="mailto:contact@wellfriend.online">
                  contact@wellfriend.online
                </a>{" "}
                if you want early access or a custom discussion.
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
            <li>All current PDF and image tools</li>
            <li>Maximum upload size: 25 MB per file</li>
            <li>{PUBLIC_FILE_HANDLING_STATEMENT}</li>
            <li>Public launch rate limit: 200 requests per hour</li>
            <li>No API access on the public free tier</li>
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
                Merge PDFs, split PDFs, rotate PDFs, protect PDFs, decrypt PDFs, crop images, rotate images, and images to PDF.
              </p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-zinc-950">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Standard operations</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">2 credits each</p>
              <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-zinc-300">
                Compress PDF, extract text, convert image, resize image, compress image, and watermark image.
              </p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-zinc-950">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Heavy operations</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">5 credits each</p>
              <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-zinc-300">
                PDF to images, office to PDF, OCR image, and remove background.
              </p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-zinc-950">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Batch operations</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">Per file multiplier</p>
              <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-zinc-300">
                Batch jobs multiply credit usage by the number of files included in the request.
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
              <PlanCard key={plan.label} plan={plan} />
            ))}
          </div>
          <p className="text-sm leading-7 text-slate-500 dark:text-zinc-400">
            Public web usage is currently capped at 25 MB per file. API-specific file limits may differ at launch.
          </p>
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
                            item.id === row.id ? { ...item, operation: event.target.value as OperationKey } : item,
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
                    onClick={() => setRows((current) => (current.length === 1 ? current : current.filter((item) => item.id !== row.id)))}
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
                <p>Plan cost: {formatInr(recommendedPlan.monthlyPriceInr)}</p>
                <p>Credits included: {recommendedPlan.credits.toLocaleString("en-IN")}</p>
                <p>Your usage: {totalCredits.toLocaleString("en-IN")} credits</p>
                <p>Overage: {overage.toLocaleString("en-IN")} credits at INR 1 each = {formatInr(overage)}</p>
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">Estimated monthly total: {formatInr(totalEstimated)}</p>
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
