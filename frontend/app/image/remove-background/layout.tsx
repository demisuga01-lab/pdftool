import type { Metadata } from "next";
import type { ReactNode } from "react";

import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Remove Background | PDFTools by WellFriend",
  description: "Remove image backgrounds and download transparent results from the PDFTools workspace.",
  path: "/image/remove-background",
});

export default function RemoveBackgroundLayout({ children }: { children: ReactNode }) {
  return children;
}
