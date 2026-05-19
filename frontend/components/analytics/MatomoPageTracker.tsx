"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { trackPageView } from "@/lib/matomo";

export function MatomoPageTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const queryString = searchParams.toString();
    const url = pathname + (queryString ? `?${queryString}` : "");
    trackPageView(url);
  }, [pathname, searchParams]);

  return null;
}
