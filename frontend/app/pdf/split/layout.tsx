import type { Metadata } from "next";
import type { ReactNode } from "react";

import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Split PDF | PDFTools by WellFriend",
  description: "Select, remove, reorder, split, or extract PDF pages in the PDFTools split workspace.",
  path: "/pdf/split",
});

export default function PdfSplitLayout({ children }: { children: ReactNode }) {
  return children;
}
