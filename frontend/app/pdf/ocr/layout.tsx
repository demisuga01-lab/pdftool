import type { Metadata } from "next";
import type { ReactNode } from "react";

import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "OCR PDF | PDFTools by WellFriend",
  description: "Redirects to the shared OCR workspace configured for PDF inputs.",
  path: "/pdf/ocr",
  robots: { index: false, follow: true },
});

export default function PdfOcrLayout({ children }: { children: ReactNode }) {
  return children;
}
