import type { Metadata } from "next";
import type { ReactNode } from "react";

import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Split PDF | PDFTools by WellFriend",
  description: "Extract page ranges or separate a PDF into smaller parts with the PDFTools split workspace.",
  path: "/pdf/split",
});

export default function PdfSplitLayout({ children }: { children: ReactNode }) {
  return children;
}
