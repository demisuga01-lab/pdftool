import type { Metadata } from "next";
import type { ReactNode } from "react";

import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Convert PDF | PDFTools by WellFriend",
  description: "Redirects to the shared conversion workspace configured for PDF inputs.",
  path: "/pdf/convert",
  robots: { index: false, follow: true },
});

export default function PdfConvertLayout({ children }: { children: ReactNode }) {
  return children;
}
