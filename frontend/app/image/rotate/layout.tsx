import type { Metadata } from "next";
import type { ReactNode } from "react";

import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Rotate Image | PDFTools by WellFriend",
  description: "Rotate photos and graphics before download in the PDFTools image rotate workspace.",
  path: "/image/rotate",
});

export default function ImageRotateLayout({ children }: { children: ReactNode }) {
  return children;
}
