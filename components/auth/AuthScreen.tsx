"use client";

import { FormEvent, useEffect, useState } from "react";
import { Eye, EyeOff, LockKeyhole, Mail, UserRound } from "lucide-react";
import type { AuthActionResult } from "@/hooks/useAuth";

type AuthMode = "login" | "register";
type FieldErrors = Partial<Record<"name" | "email" | "password", string>>;

type AuthScreenProps = {
  isConfigured: boolean;
  onSignIn: (email: string, password: string) => Promise<AuthActionResult>;
  onSignUp: (email: string, password: string, name?: string) => Promise<AuthActionResult>;
  initialMode?: AuthMode;
  introMessage?: string;
};

const configMessage =
  "Supabase no está configurado todavía. Añade NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en tu entorno.";
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

  return errors;
}

export function AuthScreen({
  isConfigured,
  onSignIn,
  onSignUp,
  initialMode = "login",
  introMessage
}: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<"error" | "success">("success");
  const [submitting, setSubmitting] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  const isRegister = mode === "register";

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
    const errors = getFieldErrors({ mode, name, email, password });

    if (errors.name || errors.email || errors.password) {
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

  return (
    <div className="mx-auto max-w-5xl">
      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_420px] md:items-center">
        <section>
          <span className="rounded-full bg-ink px-3 py-1 text-xs font-black text-white">
            Cuenta MeepleTavern
          </span>
          <h1 className="mt-4 text-4xl font-black leading-tight text-ink md:text-5xl">
            {isRegister ? "Crea tu cuenta" : "Entra en tu cuenta"}
          </h1>
          <p className="mt-3 max-w-xl text-base font-semibold leading-7 text-ink/65">
            {introMessage ??
              (isRegister
                ? "Guarda tus juegos, prepara tu perfil y empieza a usar la parte personal de MeepleTavern."
                : "Accede a tu cuenta para gestionar tu perfil y tus acciones dentro de la web.")}
          </p>
        </section>

        <section className="rounded-md border border-ink/10 bg-white p-5 shadow-soft md:p-6">
          {!isConfigured ? (
            <div className="rounded-md border border-ruby/20 bg-ruby/5 px-4 py-3 text-sm font-semibold text-ruby">
              {configMessage}
            </div>
          ) : null}

          <div className="mb-5 flex rounded-md bg-ink/5 p-1">
            {(["login", "register"] as const).map((value) => {
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
                  }}
                >
                  {value === "login" ? "Entrar" : "Crear cuenta"}
                </button>
              );
            })}
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
                    ? "Crear cuenta"
                    : "Entrar"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
