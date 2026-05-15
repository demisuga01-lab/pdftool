import type { Metadata } from "next";
import type { ReactNode } from "react";

import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Extract Text from PDF | PDFTools by WellFriend",
  description: "Extract readable text from PDF files and download the result from the PDFTools workspace.",
  path: "/pdf/extract-text",
});

export default function PdfExtractTextLayout({ children }: { children: ReactNode }) {
  return children;
}
