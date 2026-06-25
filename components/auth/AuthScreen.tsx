"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Eye, EyeOff, LockKeyhole, Mail, UserRound } from "lucide-react";
import Link from "next/link";
import Script from "next/script";
import type { AuthActionResult } from "@/hooks/useAuth";

type GoogleCredentialResponse = {
  credential?: string;
  select_by?: string;
};

type GoogleIdentityServices = {
  initialize: (config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
  }) => void;
  renderButton: (
    parent: HTMLElement,
    options: {
      type: "standard";
      theme: "outline";
      size: "large";
      text: "continue_with";
      shape: "rectangular";
      logo_alignment: "left";
      width: number;
    }
  ) => void;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: GoogleIdentityServices;
      };
    };
  }
}

type AuthMode = "login" | "register";
type FieldErrors = Partial<Record<"name" | "email" | "password" | "terms", string>>;

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
  initialMode?: AuthMode;
  authContext?: AuthContext;
  introMessage?: string;
};

const configMessage =
  "La zona de cuenta no está configurada todavía. Revisa NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en el entorno.";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[\s\u200B-\u200D\uFEFF]/g, "")
    .toLowerCase();
}

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function getFieldErrors(input: {
  mode: AuthMode;
  name: string;
  email: string;
  password: string;
  acceptedTerms: boolean;
}) {
  const errors: FieldErrors = {};
  const normalizedEmail = normalizeEmail(input.email);

  if (input.mode === "register" && input.name.trim().length < 2) {
    errors.name = "Escribe al menos 2 caracteres.";
  }

  if (!normalizedEmail) {
    errors.email = "Escribe tu email.";
  } else if (!emailPattern.test(normalizedEmail)) {
    errors.email = "Revisa el formato del email.";
  }

  if (!input.password.trim()) {
    errors.password = "Escribe una contraseña.";
  } else if (input.password.length < 6) {
    errors.password = "Debe tener al menos 6 caracteres.";
  }

  if (input.mode === "register" && !input.acceptedTerms) {
    errors.terms = "Debes aceptar las condiciones para crear una cuenta.";
  }

  return errors;
}

export function AuthScreen({
  isConfigured,
  onSignIn,
  onSignUp,
  onGoogleIdTokenSignIn,
  onGoogleSignIn,
  initialMode = "register",
  authContext,
  introMessage
}: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<"error" | "success">("success");
  const [submitting, setSubmitting] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [googleScriptStatus, setGoogleScriptStatus] = useState<"loading" | "ready" | "failed">("loading");
  const [googleButtonReady, setGoogleButtonReady] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const googleInitializedRef = useRef(false);
  const googleIdTokenSignInRef = useRef(onGoogleIdTokenSignIn);

  const isRegister = mode === "register";
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();
  const useGoogleOAuthFallback =
    !isConfigured || !googleClientId || googleScriptStatus === "failed";

  useEffect(() => {
    googleIdTokenSignInRef.current = onGoogleIdTokenSignIn;
  }, [onGoogleIdTokenSignIn]);

  useEffect(() => {
    if (!googleClientId || googleScriptStatus !== "loading") {
      return;
    }

    const timeoutId = window.setTimeout(() => setGoogleScriptStatus("failed"), 8000);
    return () => window.clearTimeout(timeoutId);
  }, [googleClientId, googleScriptStatus]);

  useEffect(() => {
    if (googleScriptStatus !== "ready" || !googleClientId || !googleButtonRef.current) {
      return;
    }

    const googleIdentity = window.google?.accounts.id;

    if (!googleIdentity) {
      console.error("Google Identity Services no está disponible después de cargar el script.");
      setGoogleScriptStatus("failed");
      return;
    }

    const buttonContainer = googleButtonRef.current;

    try {
      if (!googleInitializedRef.current) {
        googleIdentity.initialize({
          client_id: googleClientId,
          callback: (response) => {
            void handleGoogleCredentialResponse(response);
          }
        });
        googleInitializedRef.current = true;
      }

      buttonContainer.replaceChildren();
      googleIdentity.renderButton(buttonContainer, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "rectangular",
        logo_alignment: "left",
        width: Math.min(Math.floor(buttonContainer.clientWidth) || 320, 400)
      });
      setGoogleButtonReady(true);
    } catch (error) {
      console.error("No se ha podido inicializar Google Identity Services:", error);
      setGoogleScriptStatus("failed");
    }
  }, [googleClientId, googleScriptStatus]);

  useEffect(() => {
    if (cooldownSeconds <= 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCooldownSeconds((current) => current - 1);
    }, 1000);

    return () => window.clearTimeout(timeoutId);
  }, [cooldownSeconds]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting || cooldownSeconds > 0) {
      return;
    }

    setFeedback(null);
    const errors = getFieldErrors({ mode, name, email, password, acceptedTerms });

    if (errors.name || errors.email || errors.password || errors.terms) {
      setFieldErrors(errors);
      setFeedbackTone("error");
      setFeedback("Revisa los campos marcados antes de continuar.");
      return;
    }

    setFieldErrors({});
    setSubmitting(true);

    const normalizedEmail = normalizeEmail(email);
    const normalizedName = normalizeName(name);
    const result = isRegister
      ? await onSignUp(normalizedEmail, password, normalizedName)
      : await onSignIn(normalizedEmail, password);

    setSubmitting(false);

    if (!result.ok) {
      if (result.code === "rate_limited") {
        setCooldownSeconds(60);
      }

      if (result.code === "invalid_email") {
        setFieldErrors((current) => ({ ...current, email: "Este email no parece válido." }));
      }

      if (result.code === "user_exists" && isRegister) {
        setMode("login");
        setPassword("");
      }

      setFeedbackTone("error");
      setFeedback(result.message ?? "Algo no ha ido bien. Inténtalo otra vez.");
      return;
    }

    if (isRegister && result.requiresEmailConfirmation) {
      setMode("login");
      setPassword("");
      setName("");
    }

    if (result.message) {
      setFeedbackTone("success");
      setFeedback(result.message);
    }
  }

  async function handleGoogleSignIn() {
    if (submitting || cooldownSeconds > 0 || !isConfigured) {
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    setFieldErrors({});

    const result = await onGoogleSignIn();

    setSubmitting(false);

    if (!result.ok) {
      setFeedbackTone("error");
      setFeedback(result.message ?? "No hemos podido iniciar sesión con Google.");
    }
  }

  async function handleGoogleCredentialResponse(response: GoogleCredentialResponse) {
    const credential = response.credential?.trim();

    if (!credential) {
      console.error("Google Identity Services no ha devuelto una credencial.");
      setFeedbackTone("error");
      setFeedback("Google no ha devuelto una credencial válida. Inténtalo otra vez.");
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    setFieldErrors({});

    const result = await googleIdTokenSignInRef.current(credential);

    setSubmitting(false);

    if (!result.ok) {
      setFeedbackTone("error");
      setFeedback(result.message ?? "No hemos podido iniciar sesión con Google.");
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-4 sm:py-8">
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onReady={() => setGoogleScriptStatus("ready")}
        onError={() => {
          console.error("No se ha podido cargar Google Identity Services.");
          setGoogleScriptStatus("failed");
        }}
      />
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
          {!isConfigured ? (
            <div className="mb-4 rounded-md border border-ruby/20 bg-ruby/5 px-4 py-3 text-sm font-semibold text-ruby">
              {configMessage}
            </div>
          ) : null}

          {useGoogleOAuthFallback ? (
            <button
              type="button"
              className="button-secondary mb-4 w-full justify-center min-h-11 shadow-sm hover:border-ember"
              disabled={submitting || cooldownSeconds > 0 || !isConfigured}
              onClick={() => void handleGoogleSignIn()}
            >
              Continuar con Google
            </button>
          ) : (
            <div
              className={`relative min-h-11 w-full ${
                !googleButtonReady ? "hidden" : "mb-4"
              } ${
                submitting || cooldownSeconds > 0 || !isConfigured
                  ? "pointer-events-none opacity-60"
                  : ""
              }`}
            >
              <div
                ref={googleButtonRef}
                className="flex w-full justify-center"
              />
            </div>
          )}

          <div className="mb-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-walnut/10" />
            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-walnut/45">o con email</span>
            <div className="h-px flex-1 bg-walnut/10" />
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {isRegister ? (
              <label className="block">
                <span className="text-xs font-extrabold text-wood">Nombre</span>
                <span className="relative mt-1.5 flex items-center">
                  <UserRound className="pointer-events-none absolute left-3.5 h-4 w-4 text-walnut/40" aria-hidden="true" />
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="focus-ring min-h-11 w-full rounded-md border border-walnut/20 bg-white pl-10 pr-3 text-sm text-ink shadow-sm transition hover:border-walnut/35"
                    placeholder="Tu nombre"
                    autoComplete="name"
                  />
                </span>
                {fieldErrors.name ? <span className="mt-1 block text-xs font-semibold text-ruby">{fieldErrors.name}</span> : null}
              </label>
            ) : null}

            <label className="block">
              <span className="text-xs font-extrabold text-wood">Email</span>
              <span className="relative mt-1.5 flex items-center">
                <Mail className="pointer-events-none absolute left-3.5 h-4 w-4 text-walnut/40" aria-hidden="true" />
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="focus-ring min-h-11 w-full rounded-md border border-walnut/20 bg-white pl-10 pr-3 text-sm text-ink shadow-sm transition hover:border-walnut/35"
                  placeholder="tu@email.com"
                  autoComplete="email"
                  inputMode="email"
                />
              </span>
              {fieldErrors.email ? <span className="mt-1 block text-xs font-semibold text-ruby">{fieldErrors.email}</span> : null}
            </label>

            <label className="block">
              <span className="text-xs font-extrabold text-wood">Contraseña</span>
              <span className="relative mt-1.5 flex items-center">
                <LockKeyhole className="pointer-events-none absolute left-3.5 h-4 w-4 text-walnut/40" aria-hidden="true" />
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="focus-ring min-h-11 w-full rounded-md border border-walnut/20 bg-white pl-10 pr-11 text-sm text-ink shadow-sm transition hover:border-walnut/35"
                  placeholder="Mínimo 6 caracteres"
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  type={showPassword ? "text" : "password"}
                />
                <button
                  type="button"
                  className="absolute right-3.5 text-walnut/45 transition hover:text-wood"
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                </button>
              </span>
              {fieldErrors.password ? <span className="mt-1 block text-xs font-semibold text-ruby">{fieldErrors.password}</span> : null}
            </label>

            {isRegister ? (
              <div className="pt-1">
                <label className="flex cursor-pointer items-start gap-3 text-xs font-semibold leading-5 text-walnut/70">
                  <input
                    checked={acceptedTerms}
                    className="focus-ring mt-0.5 h-4 w-4 shrink-0 rounded border-walnut/20 accent-ember"
                    onChange={(event) => {
                      setAcceptedTerms(event.target.checked);
                      setFieldErrors((current) => ({ ...current, terms: undefined }));
                    }}
                    type="checkbox"
                  />
                  <span>
                    Acepto las <Link className="font-bold text-wood underline underline-offset-2 hover:text-ember transition" href="/aviso-legal" target="_blank">condiciones de uso</Link> y confirmo que he leído la <Link className="font-bold text-wood underline underline-offset-2 hover:text-ember transition" href="/privacidad" target="_blank">política de privacidad</Link>.
                  </span>
                </label>
                {fieldErrors.terms ? <span className="mt-1 block text-xs font-semibold text-ruby">{fieldErrors.terms}</span> : null}
              </div>
            ) : null}

            {feedback ? (
              <div className={feedbackTone === "error" ? "rounded-md border border-ruby/20 bg-ruby/5 px-4 py-3 text-sm font-semibold text-ruby" : "rounded-md border border-moss/20 bg-moss/10 px-4 py-3 text-sm font-semibold text-moss"}>
                {feedback}
              </div>
            ) : null}

            <button className="button-primary w-full shadow-md hover:shadow-lg transition min-h-11" disabled={submitting || cooldownSeconds > 0 || !isConfigured} type="submit">
              {submitting
                ? "Enviando..."
                : cooldownSeconds > 0
                  ? `Espera ${cooldownSeconds}s`
                  : isRegister
                    ? "Crear mi ludoteca gratis"
                    : "Entrar"}
            </button>
          </form>

          {isRegister ? (
            <p className="mt-5 text-center text-xs font-semibold text-walnut/60">
              ¿Ya tienes una cuenta?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setFeedback(null);
                  setFieldErrors({});
                }}
                className="text-ember hover:text-amber-strong transition font-bold underline underline-offset-2"
              >
                Inicia sesión aquí
              </button>
            </p>
          ) : (
            <p className="mt-5 text-center text-xs font-semibold text-walnut/60">
              ¿No tienes una cuenta aún?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setFeedback(null);
                  setFieldErrors({});
                  setAcceptedTerms(false);
                }}
                className="text-ember hover:text-amber-strong transition font-bold underline underline-offset-2"
              >
                Regístrate gratis
              </button>
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
