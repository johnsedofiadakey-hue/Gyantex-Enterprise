"use client";

type AnalyticsPayload = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    gtag?: (type: "event", name: string, payload?: AnalyticsPayload) => void;
    dataLayer?: unknown[];
  }
}

const DEBUG_ANALYTICS = process.env.NODE_ENV !== "production";

export function trackEvent(name: string, payload: AnalyticsPayload = {}) {
  if (typeof window === "undefined") return;

  if (window.gtag) {
    window.gtag("event", name, payload);
  } else if (Array.isArray(window.dataLayer)) {
    window.dataLayer.push({ event: name, ...payload });
  }

  if (DEBUG_ANALYTICS) {
    console.debug("[analytics]", name, payload);
  }
}
