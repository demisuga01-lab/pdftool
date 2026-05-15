import type { Metadata } from "next";
import type { ReactNode } from "react";

import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Rotate PDF | PDFTools by WellFriend",
  description: "Fix page orientation and rotate PDF pages before downloading the updated file.",
  path: "/pdf/rotate",
});

export default function PdfRotateLayout({ children }: { children: ReactNode }) {
  return children;
}
