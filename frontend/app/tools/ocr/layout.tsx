import type { Metadata } from "next";
import type { ReactNode } from "react";

import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "OCR Workspace | PDFTools by WellFriend",
  description:
    "Extract text from PDFs and images, including searchable PDF output, from the PDFTools OCR workspace.",
  path: "/tools/ocr",
});

export default function OcrLayout({ children }: { children: ReactNode }) {
  return children;
}
