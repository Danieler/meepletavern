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
            Guardar mi primer juego
          </AuthCtaButton>
        )}
        <Link href="/juegos" prefetch={false} className="button-hero-secondary">
          Explorar juegos
        </Link>
      </div>
      {!user ? (
        <p className="mt-3 text-sm font-bold text-walnut/65">
          Gratis · Entras en segundos · Tu ludoteca lo recuerda por ti
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
  const profileLabel = user ? "Ir a mi rincón" : "Guardar mi ludoteca";

  return (
    <>
      <p className="tavern-eyebrow">Rincón de jugador</p>
      <h3 className="font-display mt-3 text-3xl font-bold leading-tight">
        {user ? "Tu rincón te está esperando" : "No pierdas lo que quieres jugar"}
      </h3>
      <p className="mt-3 text-sm font-semibold leading-6 text-parchment/78">
        {user
          ? "Vuelve a tu colección, tus listas y tus valoraciones para preparar la próxima partida."
          : "Guarda descubrimientos para después, crea listas para tu grupo y deja que tu ludoteca recuerde por ti."}
      </p>
      <div className="mt-5 grid gap-3">
        <Link href={profileHref} className="button-primary justify-center">
          {profileLabel}
        </Link>
        <Link href="/comunidad" prefetch={false} className="button-secondary justify-center border-white/20 bg-[#fff8e8] text-wood hover:bg-white hover:text-wood">
          Ver la comunidad
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
              Guarda lo que quieres jugar antes de perderlo
            </h2>
            <p className="mt-3 max-w-3xl text-base font-semibold leading-7 text-parchment/78">
              Cada descubrimiento puede quedarse esperando en tu ludoteca: juegos para después,
              listas para tu grupo y notas para recordar por qué te llamó la atención.
            </p>
            <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm font-bold text-parchment/88">
              <li>✓ Tu ludoteca en un sitio</li>
              <li>✓ Listas para cada grupo</li>
              <li>✓ Valoraciones con contexto</li>
            </ul>
          </div>
          <aside className="rounded-md border border-white/10 bg-white/8 p-5 text-center">
            <AuthCtaButton context="home" className="w-full justify-center px-6 py-3 text-base">
              Guardar mi primer juego
            </AuthCtaButton>
            <p className="mt-3 text-xs font-bold text-parchment/65">
              Gratis. Sin spam. Lo que guardes queda contigo.
            </p>
          </aside>
        </div>
      </div>
    </section>
  );
}
