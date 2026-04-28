import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { AppShell } from "@/components/layout/AppShell";
import { GlobalSettingsProvider } from "@/lib/settings";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://tools.wellfriend.online"),
  title: "PDFTools by WellFriend - Free PDF and Image Tools Online",
  description:
    "Free open-source PDF and image processing tools. Compress, merge, split, convert, OCR and more. No signup required. Files deleted within 24 hours.",
  keywords: ["PDF tools", "image tools", "compress PDF", "convert image", "OCR", "free"],
  openGraph: {
    title: "PDFTools by WellFriend - Free PDF and Image Tools Online",
    description:
      "Free open-source PDF and image processing tools. Compress, merge, split, convert, OCR and more. No signup required. Files deleted within 24 hours.",
    url: "https://tools.wellfriend.online",
    siteName: "PDFTools by WellFriend",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PDFTools by WellFriend - Free PDF and Image Tools Online",
    description:
      "Free open-source PDF and image processing tools. Compress, merge, split, convert, OCR and more. No signup required. Files deleted within 24 hours.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className="h-full" lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-white text-[#111827] antialiased`}>
        <GlobalSettingsProvider>
          <AppShell>{children}</AppShell>
        </GlobalSettingsProvider>
      </body>
    </html>
  );
}
