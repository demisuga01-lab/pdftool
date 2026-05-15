import type { Metadata } from "next";
import type { ReactNode } from "react";

import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Watermark Image | PDFTools by WellFriend",
  description: "Add text or image watermarks to images with the PDFTools watermark workspace.",
  path: "/image/watermark",
});

export default function ImageWatermarkLayout({ children }: { children: ReactNode }) {
  return children;
}
