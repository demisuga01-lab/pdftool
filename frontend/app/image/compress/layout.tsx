import type { Metadata } from "next";
import type { ReactNode } from "react";

import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Compress Image | PDFTools by WellFriend",
  description: "Redirects to the shared compress workspace configured for image files.",
  path: "/image/compress",
  robots: { index: false, follow: true },
});

export default function ImageCompressLayout({ children }: { children: ReactNode }) {
  return children;
}
