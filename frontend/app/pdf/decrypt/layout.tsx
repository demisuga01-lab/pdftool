import type { Metadata } from "next";
import type { ReactNode } from "react";

import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Decrypt PDF | PDFTools by WellFriend",
  description: "Remove password protection from authorized PDF files with the PDFTools decrypt workspace.",
  path: "/pdf/decrypt",
});

export default function PdfDecryptLayout({ children }: { children: ReactNode }) {
  return children;
}
