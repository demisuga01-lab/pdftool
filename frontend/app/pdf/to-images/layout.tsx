import type { Metadata } from "next";
import type { ReactNode } from "react";

import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "PDF to Images | PDFTools by WellFriend",
  description: "Turn PDF pages into image files and download them from the PDFTools export workspace.",
  path: "/pdf/to-images",
});

export default function PdfToImagesLayout({ children }: { children: ReactNode }) {
  return children;
}
