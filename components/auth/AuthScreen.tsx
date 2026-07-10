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

const AUTH_CONTEXT_INTROS: Record<AuthContext, string> = {
  owned: "Crea tu cuenta en segundos y este juego quedará guardado para cuando vuelvas a preparar partida.",
  wishlist: "Lo dejamos en pendientes para que no desaparezca entre pestañas, recomendaciones y conversaciones.",
  rating: "Tu valoración se guarda en tu perfil y te ayuda a recordar qué merece volver a mesa.",
  list: "Mantén tus ideas ordenadas por grupo, ocasión o ganas de jugar, sin reconstruir la lista cada vez.",
  comment: "Entra para publicar con tu perfil y conservar tus aportes dentro de la taberna.",
  table: "Guarda esta idea y recupera rápido lo que encaja con la mesa que tienes en mente."
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
                  ? (authContext ? AUTH_CONTEXT_INTROS[authContext] : "Crea una ludoteca gratis para guardar juegos, listas y valoraciones sin depender de memoria o capturas sueltas.")
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
                <p className="text-xs font-black uppercase tracking-wider text-ember">Valor inmediato</p>
                <ul className="grid gap-3.5 text-sm font-semibold text-walnut/85">
                  <li className="flex items-start gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-moss/10 text-moss text-xs font-black">✓</span>
                    <span><strong>Guarda sin interrumpir:</strong> Vuelve luego al juego, lista o nota que te trajo aquí.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-moss/10 text-moss text-xs font-black">✓</span>
                    <span><strong>Orden para decidir:</strong> Pendientes, favoritos y jugados viven en una ludoteca sencilla.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-moss/10 text-moss text-xs font-black">✓</span>
                    <span><strong>Sin ruido:</strong> Gratis, sin newsletter y con perfil editable cuando quieras.</span>
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
