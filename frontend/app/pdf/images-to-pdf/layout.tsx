import type { Metadata } from "next";
import type { ReactNode } from "react";

import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Images to PDF | PDFTools by WellFriend",
  description: "Combine image files into a single PDF from the PDFTools images-to-PDF workspace.",
  path: "/pdf/images-to-pdf",
});

export default function ImagesToPdfLayout({ children }: { children: ReactNode }) {
  return children;
}
