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
    <div className="mx-auto max-w-5xl">
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onReady={() => setGoogleScriptStatus("ready")}
        onError={() => {
          console.error("No se ha podido cargar Google Identity Services.");
          setGoogleScriptStatus("failed");
        }}
      />
      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_420px] md:items-center">
        <section>
          <h1 className="text-4xl font-black leading-tight text-ink md:text-5xl">
            {isRegister
              ? (authContext ? AUTH_CONTEXT_TITLES[authContext] : "Crea tu ludoteca gratis")
              : "Entra en tu cuenta"}
          </h1>
          <p className="mt-3 max-w-xl text-base font-semibold leading-7 text-ink/65">
            {introMessage ??
              (isRegister
                ? "Guarda juegos, crea listas y descubre qué tienen otros taberneros."
                : "Accede para gestionar tu perfil, tu ludoteca y tus aportes en MeepleTavern.")}
          </p>
          {isRegister ? (
            <p className="mt-3 text-sm font-black text-ember">
              Gratis. Sin spam. Puedes borrar tu cuenta cuando quieras.
            </p>
          ) : null}
        </section>

        <section className="rounded-md border border-ink/10 bg-white p-5 shadow-soft md:p-6">
          {!isConfigured ? (
            <div className="rounded-md border border-ruby/20 bg-ruby/5 px-4 py-3 text-sm font-semibold text-ruby">
              {configMessage}
            </div>
          ) : null}

          <div className="mb-5 flex rounded-md bg-ink/5 p-1">
            {(["register", "login"] as const).map((value) => {
              const active = mode === value;
              return (
                <button
                  key={value}
                  type="button"
                  className={active ? "button-primary flex-1 min-h-10" : "flex-1 rounded-md px-4 py-2 text-sm font-bold text-ink/65 transition hover:text-ink"}
                  onClick={() => {
                    setMode(value);
                    setFeedback(null);
                    setFieldErrors({});
                    if (value === "register") {
                      setAcceptedTerms(false);
                    }
                  }}
                >
                  {value === "login" ? "Entrar" : "Crear ludoteca"}
                </button>
              );
            })}
          </div>

          {useGoogleOAuthFallback ? (
            <button
              type="button"
              className="button-secondary mb-4 w-full justify-center"
              disabled={submitting || cooldownSeconds > 0 || !isConfigured}
              onClick={() => void handleGoogleSignIn()}
            >
              Continuar con Google
            </button>
          ) : (
            <div
              className={`relative mb-4 min-h-10 w-full ${
                submitting || cooldownSeconds > 0 || !isConfigured
                  ? "pointer-events-none opacity-60"
                  : ""
              }`}
            >
              <div
                ref={googleButtonRef}
                className={`flex w-full justify-center ${googleButtonReady ? "" : "invisible"}`}
              />
              {!googleButtonReady ? (
                <button
                  className="button-secondary absolute inset-0 w-full justify-center"
                  disabled
                  type="button"
                >
                  Cargando Google...
                </button>
              ) : null}
            </div>
          )}

          <div className="mb-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-ink/10" />
            <span className="text-xs font-black uppercase tracking-[0.12em] text-ink/45">o con email</span>
            <div className="h-px flex-1 bg-ink/10" />
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {isRegister ? (
              <label className="block">
                <span className="text-sm font-bold text-ink">Nombre</span>
                <span className="relative mt-2 flex items-center">
                  <UserRound className="pointer-events-none absolute left-3 h-4 w-4 text-ink/40" aria-hidden="true" />
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="focus-ring min-h-11 w-full rounded-md border border-ink/10 bg-white pl-10 pr-3 text-sm text-ink"
                    placeholder="Tu nombre"
                    autoComplete="name"
                  />
                </span>
                {fieldErrors.name ? <span className="mt-1 block text-xs font-semibold text-ruby">{fieldErrors.name}</span> : null}
              </label>
            ) : null}

            <label className="block">
              <span className="text-sm font-bold text-ink">Email</span>
              <span className="relative mt-2 flex items-center">
                <Mail className="pointer-events-none absolute left-3 h-4 w-4 text-ink/40" aria-hidden="true" />
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="focus-ring min-h-11 w-full rounded-md border border-ink/10 bg-white pl-10 pr-3 text-sm text-ink"
                  placeholder="tu@email.com"
                  autoComplete="email"
                  inputMode="email"
                />
              </span>
              {fieldErrors.email ? <span className="mt-1 block text-xs font-semibold text-ruby">{fieldErrors.email}</span> : null}
            </label>

            <label className="block">
              <span className="text-sm font-bold text-ink">Contraseña</span>
              <span className="relative mt-2 flex items-center">
                <LockKeyhole className="pointer-events-none absolute left-3 h-4 w-4 text-ink/40" aria-hidden="true" />
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="focus-ring min-h-11 w-full rounded-md border border-ink/10 bg-white pl-10 pr-11 text-sm text-ink"
                  placeholder="Mínimo 6 caracteres"
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  type={showPassword ? "text" : "password"}
                />
                <button
                  type="button"
                  className="absolute right-3 text-ink/45 transition hover:text-ink"
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                </button>
              </span>
              {fieldErrors.password ? <span className="mt-1 block text-xs font-semibold text-ruby">{fieldErrors.password}</span> : null}
            </label>

            {isRegister ? (
              <div>
                <label className="flex cursor-pointer items-start gap-3 text-sm font-semibold leading-6 text-ink/70">
                  <input
                    checked={acceptedTerms}
                    className="focus-ring mt-1 h-4 w-4 shrink-0 accent-ember"
                    onChange={(event) => {
                      setAcceptedTerms(event.target.checked);
                      setFieldErrors((current) => ({ ...current, terms: undefined }));
                    }}
                    type="checkbox"
                  />
                  <span>
                    Acepto las <Link className="font-bold text-wood underline underline-offset-2" href="/aviso-legal" target="_blank">condiciones de uso</Link> y confirmo que he leído la <Link className="font-bold text-wood underline underline-offset-2" href="/privacidad" target="_blank">política de privacidad</Link>.
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

            <button className="button-primary w-full" disabled={submitting || cooldownSeconds > 0 || !isConfigured} type="submit">
              {submitting
                ? "Enviando..."
                : cooldownSeconds > 0
                  ? `Espera ${cooldownSeconds}s`
                  : isRegister
                    ? "Crear mi ludoteca"
                    : "Entrar"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
