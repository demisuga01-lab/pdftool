import type { Metadata } from "next";
import type { ReactNode } from "react";

import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Convert Image | PDFTools by WellFriend",
  description: "Convert images between common formats from the PDFTools image conversion workspace.",
  path: "/image/convert",
});

export default function ImageConvertLayout({ children }: { children: ReactNode }) {
  return children;
}
