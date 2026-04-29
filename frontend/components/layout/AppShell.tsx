"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isWorkspacePage =
    pathname.startsWith("/pdf/") ||
    pathname.startsWith("/image/") ||
    pathname === "/convert" ||
    pathname === "/compress" ||
    pathname.startsWith("/tools/");

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-zinc-950">
      <Header />
      <div className="min-h-0 flex-1">{children}</div>
      {!isWorkspacePage ? <Footer /> : null}
    </div>
  );
}
