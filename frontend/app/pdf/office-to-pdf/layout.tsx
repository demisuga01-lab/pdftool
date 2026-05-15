import type { Metadata } from "next";
import type { ReactNode } from "react";

import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Office to PDF | PDFTools by WellFriend",
  description: "Convert office documents and spreadsheets into PDF output from the PDFTools workspace.",
  path: "/pdf/office-to-pdf",
});

export default function OfficeToPdfLayout({ children }: { children: ReactNode }) {
  return children;
}
