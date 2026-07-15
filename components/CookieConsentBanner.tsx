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
  const [showSettings, setShowSettings] = useState(false);
  const [analyticsDraft, setAnalyticsDraft] = useState(false);

  useEffect(() => {
    const consent = readCookieConsent();
    setIsOpen(!consent);
    setAnalyticsDraft(consent?.analytics ?? false);

    const openPreferences = () => {
      const nextConsent = readCookieConsent();
      setAnalyticsDraft(nextConsent?.analytics ?? false);
      setShowSettings(true);
      setIsOpen(true);
    };
    window.addEventListener(COOKIE_PREFERENCES_OPEN_EVENT, openPreferences);
    return () => window.removeEventListener(COOKIE_PREFERENCES_OPEN_EVENT, openPreferences);
  }, []);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("meepletavern:cookie-consent", { detail: { open: isOpen } }));
    return () => {
      window.dispatchEvent(new CustomEvent("meepletavern:cookie-consent", { detail: { open: false } }));
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  function chooseAnalytics(analytics: boolean) {
    saveCookieConsent(analytics);
    setIsOpen(false);
    setShowSettings(false);
  }

  return (
    <section
      aria-label="Preferencias de cookies"
      aria-live="polite"
      className="fixed inset-x-3 bottom-3 z-[80] mx-auto max-w-3xl rounded-md border border-parchment/20 bg-ink p-5 text-white shadow-2xl sm:bottom-5 sm:p-6"
      role="dialog"
    >
      <h2 className="font-display text-xl font-bold">Tú decides sobre las cookies</h2>
      {showSettings ? (
        <>
          <p className="mt-2 text-sm font-medium leading-6 text-white/72">
            Las cookies técnicas son necesarias para iniciar sesión y mantener la seguridad. La
            analítica es opcional y no se carga si no la activas.
          </p>
          <div className="mt-4 rounded-md border border-white/15 bg-white/8 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-black uppercase tracking-[0.12em] text-white">Analítica</h3>
                <p className="mt-1 text-sm font-medium leading-6 text-white/70">
                  Ayuda a medir páginas vistas y uso agregado con Vercel Web Analytics.
                </p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-bold">
                <input
                  checked={analyticsDraft}
                  className="h-4 w-4 accent-ember"
                  onChange={(event) => setAnalyticsDraft(event.target.checked)}
                  type="checkbox"
                />
                Activar
              </label>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <button className="button-secondary w-full border-white/35 bg-transparent text-white hover:bg-white/10" type="button" onClick={() => chooseAnalytics(false)}>
              Rechazar
            </button>
            <button className="button-secondary w-full border-white/35 bg-transparent text-white hover:bg-white/10" type="button" onClick={() => chooseAnalytics(analyticsDraft)}>
              Guardar
            </button>
            <button className="button-secondary w-full border-white/35 bg-transparent text-white hover:bg-white/10" type="button" onClick={() => chooseAnalytics(true)}>
              Aceptar
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm font-medium leading-6 text-white/72">
            Usamos lo imprescindible para que la web funcione. Si nos das permiso, recogeremos
            estadísticas agregadas para entender qué funciona y mejorar MeepleTavern. Puedes cambiar
            tu elección cuando quieras en la <Link className="font-bold text-white underline underline-offset-4" href="/cookies">política de cookies</Link>.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <button className="button-secondary w-full border-white/35 bg-transparent text-white hover:bg-white/10" type="button" onClick={() => chooseAnalytics(false)}>
              Rechazar
            </button>
            <button className="button-secondary w-full border-white/35 bg-transparent text-white hover:bg-white/10" type="button" onClick={() => setShowSettings(true)}>
              Configurar
            </button>
            <button className="button-secondary w-full border-white/35 bg-transparent text-white hover:bg-white/10" type="button" onClick={() => chooseAnalytics(true)}>
              Aceptar
            </button>
          </div>
        </>
      )}
    </section>
  );
}
