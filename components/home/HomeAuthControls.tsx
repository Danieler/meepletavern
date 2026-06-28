"use client";

import Link from "next/link";
import {
  buildAuthHref,
  POST_SIGNUP_ONBOARDING_PATH
} from "@/components/auth-cta/authCtaUrl";
import { AuthCtaButton } from "@/components/auth-cta/AuthCtaButton";
import { useAuth } from "@/hooks/useAuth";

export function HomeHeroAuthControls() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="mt-5 flex flex-wrap gap-4 min-h-[48px] items-center">
        <span className="text-sm font-semibold text-walnut/60">Cargando tu rincón...</span>
      </div>
    );
  }

  return (
    <>
      <div className="mt-5 flex flex-wrap gap-4">
        {user ? (
          <Link href="/mi-perfil" className="button-hero-primary">
            Ir a mi rincón
          </Link>
        ) : (
          <AuthCtaButton context="home" variant="hero-primary">
            Crear mi ludoteca gratis
          </AuthCtaButton>
        )}
        <Link href="/juegos" prefetch={false} className="button-hero-secondary">
          Explorar juegos
        </Link>
      </div>
      {!user ? (
        <p className="mt-3 text-sm font-bold text-walnut/65">
          Gratis · Guarda juegos · Crea listas · Puntúa partidas
        </p>
      ) : null}
    </>
  );
}

export function HomeSidebarAuthControls() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[180px] flex flex-col justify-center text-sm font-semibold text-parchment/60">
        Cargando tu rincón...
      </div>
    );
  }

  const profileHref = user
    ? "/mi-perfil"
    : buildAuthHref({ mode: "register", next: POST_SIGNUP_ONBOARDING_PATH });
  const profileLabel = user ? "Ir a mi rincón" : "Crear mi ludoteca gratis";

  return (
    <>
      <p className="tavern-eyebrow">Rincón de jugador</p>
      <h3 className="font-display mt-3 text-3xl font-bold leading-tight">
        {user ? "Tu rincón te está esperando" : "Haz tuya la taberna"}
      </h3>
      <p className="mt-3 text-sm font-semibold leading-6 text-parchment/78">
        {user
          ? "Vuelve a tu colección, tus listas y tus valoraciones para preparar la próxima partida."
          : "Crea tu ludoteca gratis para guardar tus juegos, puntuar partidas y preparar listas para cada grupo."}
      </p>
      <div className="mt-5 grid gap-3">
        <Link href={profileHref} className="button-primary justify-center">
          {profileLabel}
        </Link>
        <Link href="/taberna" prefetch={false} className="button-secondary justify-center border-white/20 bg-[#fff8e8] text-wood hover:bg-white hover:text-wood">
          Ver la taberna
        </Link>
      </div>
    </>
  );
}

export function HomeFooterSignupCta() {
  const { user, loading } = useAuth();

  if (loading || user) {
    return null;
  }

  return (
    <section className="container-page py-8 lg:py-10">
      <div className="overflow-hidden rounded-lg border border-walnut/15 bg-[#3a2118] text-white shadow-soft">
        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center">
          <div>
            <p className="tavern-eyebrow">Tu mesa, siempre a mano</p>
            <h2 className="font-display mt-3 max-w-3xl text-3xl font-bold leading-tight sm:text-4xl">
              Guarda los juegos que quieres probar antes de olvidarlos
            </h2>
            <p className="mt-3 max-w-3xl text-base font-semibold leading-7 text-parchment/78">
              Convierte cada descubrimiento en tu ludoteca, una valoración o una lista para la
              próxima partida. Todo queda reunido en tu rincón de MeepleTavern.
            </p>
            <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm font-bold text-parchment/88">
              <li>✓ Tu ludoteca en un sitio</li>
              <li>✓ Listas para cada grupo</li>
              <li>✓ Valoraciones con contexto</li>
            </ul>
          </div>
          <aside className="rounded-md border border-white/10 bg-white/8 p-5 text-center">
            <AuthCtaButton context="home" className="w-full justify-center px-6 py-3 text-base">
              Crear mi ludoteca gratis
            </AuthCtaButton>
            <p className="mt-3 text-xs font-bold text-parchment/65">
              Crear la cuenta es gratis.
            </p>
          </aside>
        </div>
      </div>
    </section>
  );
}
