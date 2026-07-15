"use client";

import { track as vercelTrack } from "@vercel/analytics/react";
import { shouldTrackAnalyticsPath } from "@/lib/analyticsPrivacy";
import { hasAnalyticsConsent } from "@/lib/cookieConsent";

export const PRIVACY_SAFE_ANALYTICS_EVENTS = [
  "search_submitted",
  "filter_changed",
  "save_started",
  "auth_started",
  "auth_method_selected",
  "auth_completed",
  "pending_action_completed",
  "pending_action_failed"
] as const;

export type PrivacySafeAnalyticsEventName = typeof PRIVACY_SAFE_ANALYTICS_EVENTS[number];
type AnalyticsScalar = string | number | boolean | null;
type AnalyticsProperties = Record<string, AnalyticsScalar>;

type CommonAnalyticsProperties = {
  surface?: "home" | "catalog" | "game" | "tavern" | "review" | "header" | "modal" | "page" | "community" | "global";
};

export type PrivacySafeAnalyticsEventProperties = {
  search_submitted: CommonAnalyticsProperties & { hasQuery: boolean; filterCount?: number };
  filter_changed: CommonAnalyticsProperties & { filter: string; active: boolean; activeCount?: number };
  save_started: CommonAnalyticsProperties & { target: "game" | "catalog" | "tavern" | "review" | "library"; action?: string };
  auth_started: CommonAnalyticsProperties & { mode?: "login" | "register"; source?: "cta" | "modal" | "form" };
  auth_method_selected: CommonAnalyticsProperties & { mode?: "login" | "register"; method: "email" | "google" | "discord" };
  auth_completed: CommonAnalyticsProperties & { mode?: "login" | "register"; method: "email" | "google" | "discord" };
  pending_action_completed: CommonAnalyticsProperties & { type: string; retryable?: boolean };
  pending_action_failed: CommonAnalyticsProperties & { type: string; retryable?: boolean };
};

const eventNames = new Set<string>(PRIVACY_SAFE_ANALYTICS_EVENTS);
const unsafePropertyNamePattern = /(email|mail|username|user_name|userid|user_id|authuserid|gameid|game_id|title|name|query|search|q$|path|route|url|hash|comment|message|error|exception|slug)/i;

export function trackEvent<Name extends PrivacySafeAnalyticsEventName>(
  name: Name,
  properties?: PrivacySafeAnalyticsEventProperties[Name]
) {
  if (typeof window === "undefined") {
    return;
  }

  if (!eventNames.has(name)) {
    return;
  }

  if (process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === "false") {
    return;
  }

  if (!hasAnalyticsConsent() || !shouldTrackAnalyticsPath(window.location.pathname)) {
    return;
  }

  vercelTrack(name, sanitizeEventProperties(properties));
}

function sanitizeEventProperties(properties?: AnalyticsProperties) {
  if (!properties) {
    return undefined;
  }

  const safe: AnalyticsProperties = {};
  for (const [key, value] of Object.entries(properties)) {
    if (unsafePropertyNamePattern.test(key)) {
      continue;
    }
    if (typeof value === "string" && /@|https?:\/\/|\/|\?|\#/.test(value)) {
      continue;
    }
    safe[key] = value;
  }

  return Object.keys(safe).length ? safe : undefined;
}
