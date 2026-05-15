import type { Metadata } from "next";
import type { ReactNode } from "react";

import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Crop Image | PDFTools by WellFriend",
  description: "Crop images to the exact area you need with the PDFTools image crop workspace.",
  path: "/image/crop",
});

export default function ImageCropLayout({ children }: { children: ReactNode }) {
  return children;
}
