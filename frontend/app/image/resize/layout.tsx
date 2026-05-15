import type { Metadata } from "next";
import type { ReactNode } from "react";

import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Resize Image | PDFTools by WellFriend",
  description: "Resize images for web, documents, and export workflows with the PDFTools image resize workspace.",
  path: "/image/resize",
});

export default function ImageResizeLayout({ children }: { children: ReactNode }) {
  return children;
}
