import type { Metadata } from "next";
import type { ReactNode } from "react";

import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Merge PDFs | PDFTools by WellFriend",
  description: "Combine multiple PDF files into one organized output from the PDFTools merge workspace.",
  path: "/pdf/merge",
});

export default function PdfMergeLayout({ children }: { children: ReactNode }) {
  return children;
}
