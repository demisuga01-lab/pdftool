import type { Metadata } from "next";
import type { ReactNode } from "react";

import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Compress PDF | PDFTools by WellFriend",
  description: "Redirects to the shared compress workspace configured for PDF files.",
  path: "/pdf/compress",
  robots: { index: false, follow: true },
});

export default function PdfCompressLayout({ children }: { children: ReactNode }) {
  return children;
}
