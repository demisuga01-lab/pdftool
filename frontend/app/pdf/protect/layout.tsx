import type { Metadata } from "next";
import type { ReactNode } from "react";

import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Protect PDF | PDFTools by WellFriend",
  description: "Add password protection to PDF files before sharing or downloading the secured result.",
  path: "/pdf/protect",
});

export default function PdfProtectLayout({ children }: { children: ReactNode }) {
  return children;
}
