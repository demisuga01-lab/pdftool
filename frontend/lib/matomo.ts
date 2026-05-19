declare global {
  interface Window {
    _paq: unknown[][];
  }
}

export const MATOMO_URL = "https://analytics.wellfriend.online/";
export const MATOMO_SITE_ID = "1";

export function trackPageView(url?: string) {
  if (typeof window === "undefined") return;
  const paq = (window._paq = window._paq || []);
  if (url) paq.push(["setCustomUrl", url]);
  paq.push(["trackPageView"]);
}

export function trackEvent(category: string, action: string, name?: string, value?: number) {
  if (typeof window === "undefined") return;
  const paq = (window._paq = window._paq || []);
  const event: unknown[] = ["trackEvent", category, action];
  if (name) event.push(name);
  if (value !== undefined) event.push(value);
  paq.push(event);
}

export {};
