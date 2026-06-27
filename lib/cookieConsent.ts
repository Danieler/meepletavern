export const COOKIE_CONSENT_VERSION = "2026-06-26";
export const COOKIE_CONSENT_STORAGE_KEY = "meepletavern_cookie_consent";
export const COOKIE_CONSENT_CHANGED_EVENT = "meepletavern:cookie-consent-changed";
export const COOKIE_PREFERENCES_OPEN_EVENT = "meepletavern:cookie-preferences-open";

export type CookieConsent = {
  version: string;
  analytics: boolean;
  updatedAt: string;
};

export function readCookieConsent(): CookieConsent | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (!rawValue) {
      return null;
    }

    const value = JSON.parse(rawValue) as Partial<CookieConsent>;
    if (value.version !== COOKIE_CONSENT_VERSION || typeof value.analytics !== "boolean") {
      return null;
    }

    return {
      version: COOKIE_CONSENT_VERSION,
      analytics: value.analytics,
      updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : ""
    };
  } catch {
    return null;
  }
}

export function saveCookieConsent(analytics: boolean) {
  const consent: CookieConsent = {
    version: COOKIE_CONSENT_VERSION,
    analytics,
    updatedAt: new Date().toISOString()
  };

  window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(consent));
  window.dispatchEvent(new CustomEvent<CookieConsent>(COOKIE_CONSENT_CHANGED_EVENT, { detail: consent }));

  return consent;
}

export function hasAnalyticsConsent() {
  return readCookieConsent()?.analytics === true;
}

export function openCookiePreferences() {
  window.dispatchEvent(new Event(COOKIE_PREFERENCES_OPEN_EVENT));
}
