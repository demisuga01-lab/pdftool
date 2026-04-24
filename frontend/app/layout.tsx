import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { Header } from "@/components/layout/Header";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "PDFTools by WellFriend",
  description: "Free & open source PDF and image processing tools for everyday work.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className="h-full" lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-slate-50 text-slate-950 antialiased dark:bg-slate-950 dark:text-slate-50`}>
        <div className="min-h-screen bg-white dark:bg-slate-950">
          <Header />
          {children}
        </div>
      </body>
    </html>
  );
}
