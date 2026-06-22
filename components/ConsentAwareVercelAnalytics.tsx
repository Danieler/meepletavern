"use client";

import type { AnalyticsProps, BeforeSendEvent } from "@vercel/analytics/next";
import { type ComponentType, useEffect, useState } from "react";
import { sanitizeAnalyticsUrl } from "@/lib/analyticsPrivacy";
import {
  COOKIE_CONSENT_CHANGED_EVENT,
  hasAnalyticsConsent,
  type CookieConsent
} from "@/lib/cookieConsent";

export function ConsentAwareVercelAnalytics() {
  const [AnalyticsComponent, setAnalyticsComponent] = useState<ComponentType<AnalyticsProps> | null>(null);

  useEffect(() => {
    let isActive = true;

    const updateAnalytics = async (analyticsAllowed: boolean) => {
      if (!analyticsAllowed) {
        setAnalyticsComponent(null);
        return;
      }

      const analyticsModule = await import("@vercel/analytics/next");
      if (isActive && hasAnalyticsConsent()) {
        setAnalyticsComponent(() => analyticsModule.Analytics);
      }
    };

    void updateAnalytics(hasAnalyticsConsent());

    const updateConsent = (event: Event) => {
      void updateAnalytics((event as CustomEvent<CookieConsent>).detail.analytics);
    };

    window.addEventListener(COOKIE_CONSENT_CHANGED_EVENT, updateConsent);
    return () => {
      isActive = false;
      window.removeEventListener(COOKIE_CONSENT_CHANGED_EVENT, updateConsent);
    };
  }, []);

  if (!AnalyticsComponent) {
    return null;
  }

  return (
    <AnalyticsComponent
      beforeSend={(event: BeforeSendEvent) => {
        if (!hasAnalyticsConsent()) {
          return null;
        }

        const safeUrl = sanitizeAnalyticsUrl(event.url);
        return safeUrl ? { ...event, url: safeUrl } : null;
      }}
    />
  );
}
