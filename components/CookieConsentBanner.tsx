"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  COOKIE_PREFERENCES_OPEN_EVENT,
  readCookieConsent,
  saveCookieConsent
} from "@/lib/cookieConsent";

export function CookieConsentBanner() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(!readCookieConsent());

    const openPreferences = () => setIsOpen(true);
    window.addEventListener(COOKIE_PREFERENCES_OPEN_EVENT, openPreferences);
    return () => window.removeEventListener(COOKIE_PREFERENCES_OPEN_EVENT, openPreferences);
  }, []);

  if (!isOpen) {
    return null;
  }

  function chooseAnalytics(analytics: boolean) {
    saveCookieConsent(analytics);
    setIsOpen(false);
  }

  return (
    <section
      aria-label="Preferencias de cookies"
      aria-live="polite"
      className="fixed inset-x-3 bottom-3 z-[80] mx-auto max-w-3xl rounded-md border border-parchment/20 bg-ink p-5 text-white shadow-2xl sm:bottom-5 sm:p-6"
      role="dialog"
    >
      <h2 className="font-display text-xl font-bold">Tú decides sobre la analítica</h2>
      <p className="mt-2 text-sm font-medium leading-6 text-white/72">
        Usamos lo imprescindible para que la web funcione. Si nos das permiso, recogeremos
        estadísticas anónimas para entender qué funciona y mejorar MeepleTavern. Puedes cambiar tu
        elección cuando quieras en la <Link className="font-bold text-white underline underline-offset-4" href="/cookies">política de cookies</Link>.
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button className="button-secondary w-full border-white/35 bg-transparent text-white hover:bg-white/10" type="button" onClick={() => chooseAnalytics(false)}>
          Solo lo necesario
        </button>
        <button className="button-secondary w-full border-white/35 bg-transparent text-white hover:bg-white/10" type="button" onClick={() => chooseAnalytics(true)}>
          Permitir analítica
        </button>
      </div>
    </section>
  );
}
