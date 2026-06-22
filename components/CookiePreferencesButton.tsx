"use client";

import { openCookiePreferences } from "@/lib/cookieConsent";

export function CookiePreferencesButton() {
  return (
    <button className="button-secondary mt-4" type="button" onClick={openCookiePreferences}>
      Cambiar preferencias de cookies
    </button>
  );
}
