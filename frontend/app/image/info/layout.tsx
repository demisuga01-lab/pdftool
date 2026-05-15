import type { Metadata } from "next";
import type { ReactNode } from "react";

import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Image Info | PDFTools by WellFriend",
  description: "Inspect dimensions, file size, format, and image details from the PDFTools image info workspace.",
  path: "/image/info",
});

export default function ImageInfoLayout({ children }: { children: ReactNode }) {
  return children;
}
