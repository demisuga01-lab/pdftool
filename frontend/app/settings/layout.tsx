import type { Metadata } from "next";
import type { ReactNode } from "react";

import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Settings | PDFTools by WellFriend",
  description:
    "Manage theme preferences, saved presets, and global defaults for the PDFTools workspace.",
  path: "/settings",
});

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return children;
}
