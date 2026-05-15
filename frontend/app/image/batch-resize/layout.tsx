import type { Metadata } from "next";
import type { ReactNode } from "react";

import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Batch Resize Images | PDFTools by WellFriend",
  description: "Resize many images at once by uploading an archive to the PDFTools batch resize workspace.",
  path: "/image/batch-resize",
});

export default function BatchResizeLayout({ children }: { children: ReactNode }) {
  return children;
}
