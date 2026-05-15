import type { Metadata } from "next";
import type { ReactNode } from "react";

import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Convert Files | PDFTools by WellFriend",
  description:
    "Convert PDFs, office files, spreadsheets, text documents, HTML, CSV, and images from one shared workspace.",
  path: "/convert",
});

export default function ConvertLayout({ children }: { children: ReactNode }) {
  return children;
}
