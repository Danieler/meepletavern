"use client";

import Link from "next/link";
import { Play } from "lucide-react";
import { useEffect, useState } from "react";
import {
  COOKIE_CONSENT_CHANGED_EVENT,
  hasAnalyticsConsent,
  type CookieConsent
} from "@/lib/cookieConsent";

export function PrivacyFriendlyYouTubeEmbed({
  embedUrl,
  title
}: {
  embedUrl: string;
  title: string;
}) {
  const [hasAccepted, setHasAccepted] = useState(false);

  useEffect(() => {
    setHasAccepted(hasAnalyticsConsent());

    const handleConsentChange = (event: Event) => {
      const consent = (event as CustomEvent<CookieConsent>).detail;
      setHasAccepted(consent.analytics);
    };

    window.addEventListener(COOKIE_CONSENT_CHANGED_EVENT, handleConsentChange);
    return () => {
      window.removeEventListener(COOKIE_CONSENT_CHANGED_EVENT, handleConsentChange);
    };
  }, []);

  if (hasAccepted) {
    return (
      <iframe
        className="aspect-video w-full"
        src={embedUrl}
        title={title}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    );
  }

  return (
    <div className="flex aspect-video w-full items-center justify-center bg-ink p-5 text-center text-white sm:p-8">
      <div className="max-w-xl">
        <Play className="mx-auto h-10 w-10 text-ember" aria-hidden="true" />
        <p className="mt-4 font-display text-xl font-bold">{title}</p>
        <p className="mt-2 text-sm font-medium leading-6 text-white/70">
          Al cargar el vídeo, YouTube y Google recibirán datos técnicos y podrán utilizar cookies o
          tecnologías similares. Consulta nuestra <Link className="font-bold text-white underline underline-offset-4" href="/cookies">política de cookies</Link>.
        </p>
        <button className="button-primary mt-5" type="button" onClick={() => setHasAccepted(true)}>
          Cargar vídeo de YouTube
        </button>
      </div>
    </div>
  );
}
