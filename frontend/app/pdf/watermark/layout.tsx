import type { Metadata } from "next";
import type { ReactNode } from "react";

import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Watermark PDF | PDFTools by WellFriend",
  description: "Add text or image watermarks to PDF pages with positioning controls in the PDFTools workspace.",
  path: "/pdf/watermark",
});

export default function PdfWatermarkLayout({ children }: { children: ReactNode }) {
  return children;
}
