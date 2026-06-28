"use client";

import { useState } from "react";
import { AuthMode, QuickAuthForm } from "@/components/auth/QuickAuthForm";
import type { AuthActionResult } from "@/hooks/useAuth";

type AuthContext = "owned" | "wishlist" | "rating" | "list" | "comment" | "table";

const AUTH_CONTEXT_TITLES: Record<AuthContext, string> = {
  owned: "Guarda este juego en tu ludoteca",
  wishlist: "No pierdas este juego: déjalo en pendientes",
  rating: "Guarda tu nota y ayuda a otros jugadores",
  list: "Añade este juego a una lista para después",
  comment: "Guarda tu opinión en la taberna",
  table: "Prepara este juego para tu próxima mesa"
};

type AuthScreenProps = {
  isConfigured: boolean;
  onSignIn: (email: string, password: string) => Promise<AuthActionResult>;
  onSignUp: (email: string, password: string, name?: string) => Promise<AuthActionResult>;
  onGoogleIdTokenSignIn: (credential: string) => Promise<AuthActionResult>;
  onGoogleSignIn: () => Promise<AuthActionResult>;
  onDiscordSignIn: () => Promise<AuthActionResult>;
  initialMode?: AuthMode;
  authContext?: AuthContext;
  introMessage?: string;
};

export function AuthScreen({
  isConfigured,
  onSignIn,
  onSignUp,
  onGoogleIdTokenSignIn,
  onGoogleSignIn,
  onDiscordSignIn,
  initialMode = "register",
  authContext,
  introMessage
}: AuthScreenProps) {
  const [currentMode, setCurrentMode] = useState<AuthMode>(initialMode);
  const isRegister = currentMode === "register";

  return (
    <div className="mx-auto max-w-5xl px-4 py-4 sm:py-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_440px] lg:items-start">
        <section className="space-y-6">
          <div>
            <h1 className="text-4xl font-black leading-tight text-wood md:text-5xl">
              {isRegister
                ? (authContext ? AUTH_CONTEXT_TITLES[authContext] : "Guarda lo que quieres jugar")
                : "Entra en tu cuenta"}
            </h1>
            <p className="mt-3 max-w-xl text-base font-semibold leading-7 text-walnut/70">
              {introMessage ??
                (isRegister
                  ? "Tu ludoteca recuerda por ti: juegos para después, listas para tu grupo y partidas que no quieres olvidar."
                  : "Vuelve a tu ludoteca, tus listas y todo lo que guardaste para jugar después.")}
            </p>
          </div>

          {isRegister ? (
            <>
              {/* Mobile: compact trust signal — no scroll friction */}
              <p className="text-sm font-black text-ember lg:hidden">
                Gratis · Sin spam · Entras en segundos
              </p>

              {/* Desktop: full benefit checklist beside the form */}
              <div className="hidden lg:block space-y-4 rounded-xl border border-walnut/12 bg-[#fffcf5] p-5 shadow-sm md:p-6">
                <p className="text-xs font-black uppercase tracking-wider text-ember">Lo que guardes se queda contigo</p>
                <ul className="grid gap-3.5 text-sm font-semibold text-walnut/85">
                  <li className="flex items-start gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-moss/10 text-moss text-xs font-black">✓</span>
                    <span><strong>No pierdas descubrimientos:</strong> Guarda juegos para probarlos después.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-moss/10 text-moss text-xs font-black">✓</span>
                    <span><strong>Tu ludoteca recuerda por ti:</strong> Ten favoritos, pendientes y jugados en un sitio.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-moss/10 text-moss text-xs font-black">✓</span>
                    <span><strong>Prepara la próxima mesa:</strong> Crea listas y recupera ideas cuando toque jugar.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-moss/10 text-moss text-xs font-black">✓</span>
                    <span><strong>100% Gratis:</strong> Sin spam. Borra tu cuenta cuando quieras.</span>
                  </li>
                </ul>
              </div>
            </>
          ) : null}
        </section>

        <section className="rounded-2xl border border-walnut/12 bg-white p-6 shadow-md md:p-8 transition-all hover:shadow-lg">
          <QuickAuthForm
            isConfigured={isConfigured}
            onSignIn={onSignIn}
            onSignUp={onSignUp}
            onGoogleIdTokenSignIn={onGoogleIdTokenSignIn}
            onGoogleSignIn={onGoogleSignIn}
            onDiscordSignIn={onDiscordSignIn}
            initialMode={initialMode}
            onModeChange={setCurrentMode}
            compact={false}
          />
        </section>
      </div>
    </div>
  );
}
