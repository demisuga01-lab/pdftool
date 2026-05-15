import type { Metadata } from "next";
import type { ReactNode } from "react";

import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Compress Files | PDFTools by WellFriend",
  description:
    "Compress PDFs, images, office files, text files, and archives from one shared workspace.",
  path: "/compress",
});

export default function CompressLayout({ children }: { children: ReactNode }) {
  return children;
}
