import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { AppShell } from "@/components/layout/AppShell";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { GlobalSettingsProvider } from "@/lib/settings";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

const THEME_STORAGE_KEY = "pdftools-theme";

export const metadata: Metadata = {
  metadataBase: new URL("https://tools.wellfriend.online"),
  title: "PDFTools by WellFriend - Premium PDF and Image Workspace",
  description:
    "A polished PDF and image workspace for compressing, converting, merging, splitting, watermarking, OCR, and export.",
  keywords: ["PDF tools", "image tools", "compress PDF", "convert image", "OCR", "free"],
  openGraph: {
    title: "PDFTools by WellFriend - Premium PDF and Image Workspace",
    description:
      "A polished PDF and image workspace for compressing, converting, merging, splitting, watermarking, OCR, and export.",
    url: "https://tools.wellfriend.online",
    siteName: "PDFTools by WellFriend",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PDFTools by WellFriend - Premium PDF and Image Workspace",
    description:
      "A polished PDF and image workspace for compressing, converting, merging, splitting, watermarking, OCR, and export.",
  },
  icons: {
    icon: [
      { url: "/logo-mark.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/logo-mark.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: ["/favicon-32x32.png"],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeInitScript = `
    (function () {
      try {
        var stored = localStorage.getItem("${THEME_STORAGE_KEY}");
        var theme = stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
        var systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        var resolved = theme === "system" ? (systemDark ? "dark" : "light") : theme;
        document.documentElement.classList.toggle("dark", resolved === "dark");
        document.documentElement.dataset.theme = resolved;
        document.documentElement.style.colorScheme = resolved;
      } catch (error) {}
    })();
  `;

  return (
    <html className="h-full" lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${inter.className} min-h-screen bg-white text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-100`}>
        <ThemeProvider>
          <GlobalSettingsProvider>
            <AppShell>{children}</AppShell>
          </GlobalSettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
