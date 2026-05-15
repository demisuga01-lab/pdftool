import type { Metadata } from "next";
import type { ReactNode } from "react";

import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "OCR PDF to Searchable PDF | PDFTools by WellFriend",
  description: "Redirects to the shared OCR workspace configured for searchable PDF output.",
  path: "/pdf/ocr-to-searchable",
  robots: { index: false, follow: true },
});

export default function PdfSearchableOcrLayout({ children }: { children: ReactNode }) {
  return children;
}
