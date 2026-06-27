"use client";

import { track as vercelTrack } from "@vercel/analytics/react";
import { shouldTrackAnalyticsPath } from "@/lib/analyticsPrivacy";
import { hasAnalyticsConsent } from "@/lib/cookieConsent";

export function trackEvent(name: string, properties?: Record<string, string | number | boolean | null>) {
  if (typeof window === "undefined") {
    return;
  }

  if (process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === "false") {
    return;
  }

  if (!hasAnalyticsConsent() || !shouldTrackAnalyticsPath(window.location.pathname)) {
    return;
  }

  vercelTrack(name, properties);
}
