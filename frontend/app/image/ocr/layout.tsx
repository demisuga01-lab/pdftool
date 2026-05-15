import type { Metadata } from "next";
import type { ReactNode } from "react";

import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "OCR Image | PDFTools by WellFriend",
  description: "Redirects to the shared OCR workspace configured for image inputs.",
  path: "/image/ocr",
  robots: { index: false, follow: true },
});

export default function ImageOcrLayout({ children }: { children: ReactNode }) {
  return children;
}
