"use client";

import { AuthMode, QuickAuthForm } from "@/components/auth/QuickAuthForm";
import type { AuthActionResult } from "@/hooks/useAuth";

type AuthContext = "owned" | "wishlist" | "rating" | "list" | "comment" | "table";

const AUTH_CONTEXT_TITLES: Record<AuthContext, string> = {
  owned: "Crea tu ludoteca para guardar este juego",
  wishlist: "Crea tu ludoteca para marcar este juego como pendiente",
  rating: "Crea tu ludoteca para puntuar este juego",
  list: "Crea tu ludoteca para añadir este juego a una lista",
  comment: "Crea tu ludoteca para comentar este juego",
  table: "Crea tu ludoteca para añadir este juego a tu mesa"
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
  const isRegister = initialMode === "register";

  return (
    <div className="mx-auto max-w-5xl px-4 py-4 sm:py-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_440px] lg:items-start">
        <section className="space-y-6">
          <div>
            <h1 className="text-4xl font-black leading-tight text-wood md:text-5xl">
              {isRegister
                ? (authContext ? AUTH_CONTEXT_TITLES[authContext] : "Crea tu ludoteca gratis")
                : "Entra en tu cuenta"}
            </h1>
            <p className="mt-3 max-w-xl text-base font-semibold leading-7 text-walnut/70">
              {introMessage ??
                (isRegister
                  ? "Únete a la taberna de juegos de mesa en español para conectar, jugar y organizar."
                  : "Accede para gestionar tu perfil, tu ludoteca y tus aportes en MeepleTavern.")}
            </p>
          </div>

          {isRegister ? (
            <>
              {/* Mobile: compact trust signal — no scroll friction */}
              <p className="text-sm font-black text-ember lg:hidden">
                Gratis · Sin spam · Borra tu cuenta cuando quieras
              </p>

              {/* Desktop: full benefit checklist beside the form */}
              <div className="hidden lg:block space-y-4 rounded-xl border border-walnut/12 bg-[#fffcf5] p-5 shadow-sm md:p-6">
                <p className="text-xs font-black uppercase tracking-wider text-ember">¿Qué consigues al registrarte?</p>
                <ul className="grid gap-3.5 text-sm font-semibold text-walnut/85">
                  <li className="flex items-start gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-moss/10 text-moss text-xs font-black">✓</span>
                    <span><strong>Organiza tu colección:</strong> Guarda tus juegos y lleva la cuenta de tus partidas.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-moss/10 text-moss text-xs font-black">✓</span>
                    <span><strong>Puntúa y opina:</strong> Valora juegos y comparte tus opiniones con la comunidad.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-moss/10 text-moss text-xs font-black">✓</span>
                    <span><strong>Conecta con taberneros:</strong> Descubre qué juegan otros y organiza mesas.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-moss/10 text-moss text-xs font-black">✓</span>
                    <span><strong>100% Gratis:</strong> Sin anuncios invasivos. Borra tu cuenta cuando quieras.</span>
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
            compact={false}
          />
        </section>
      </div>
    </div>
  );
}
