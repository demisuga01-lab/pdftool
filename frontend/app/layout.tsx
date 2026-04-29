import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { AppShell } from "@/components/layout/AppShell";
import { ThemeProvider, THEME_STORAGE_KEY } from "@/components/theme/ThemeProvider";
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
  icons: {
    icon: [{ url: "/logo.png", type: "image/png" }],
    shortcut: ["/logo.png"],
    apple: [{ url: "/logo.png", type: "image/png" }],
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
      <body className={`${inter.className} min-h-screen bg-white text-[#111827] antialiased dark:bg-slate-950 dark:text-slate-100`}>
        <ThemeProvider>
          <GlobalSettingsProvider>
            <AppShell>{children}</AppShell>
          </GlobalSettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
