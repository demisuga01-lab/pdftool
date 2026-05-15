import type { Metadata } from "next";
import type { ReactNode } from "react";

import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Pricing | PDFTools by WellFriend",
  description:
    "Review public web usage notes, API pricing guidance, and credit estimates for PDFTools by WellFriend.",
  path: "/pricing",
});

export default function PricingLayout({ children }: { children: ReactNode }) {
  return children;
}
