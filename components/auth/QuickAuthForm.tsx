"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Eye, EyeOff, LockKeyhole, Mail, UserRound, ChevronDown } from "lucide-react";
import Link from "next/link";
import type { AuthActionResult } from "@/hooks/useAuth";
import { rememberLegalAcceptance, syncPendingLegalAcceptance } from "@/lib/legalAcceptanceClient";
import { trackEvent } from "@/lib/privacySafeAnalytics";

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

export type AuthMode = "login" | "register";
type FieldErrors = Partial<Record<"name" | "email" | "password", string>>;

type QuickAuthFormProps = {
  isConfigured: boolean;
  onSignIn: (email: string, password: string) => Promise<AuthActionResult>;
  onSignUp: (email: string, password: string, name?: string) => Promise<AuthActionResult>;
  onGoogleIdTokenSignIn: (credential: string) => Promise<AuthActionResult>;
  onGoogleSignIn: () => Promise<AuthActionResult>;
  onDiscordSignIn: () => Promise<AuthActionResult>;
  initialMode?: AuthMode;
  onSuccess?: () => void;
  onModeChange?: (mode: AuthMode) => void;
  compact?: boolean;
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

export function QuickAuthForm({
  isConfigured,
  onSignIn,
  onSignUp,
  onGoogleIdTokenSignIn,
  onGoogleSignIn,
  onDiscordSignIn,
  initialMode = "register",
  onSuccess,
  onModeChange
}: QuickAuthFormProps) {
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
  const [googleScriptStatus, setGoogleScriptStatus] = useState<"loading" | "ready" | "failed">("loading");
  const [googleButtonReady, setGoogleButtonReady] = useState(false);
  
  // Priorizamos SSO en todos los contextos; email queda disponible, pero no compite de entrada.
  const [showEmailForm, setShowEmailForm] = useState(false);

  const googleButtonRef = useRef<HTMLDivElement>(null);
  const parentContainerRef = useRef<HTMLDivElement>(null);
  const googleInitializedRef = useRef(false);
  const googleIdTokenSignInRef = useRef(onGoogleIdTokenSignIn);
  const handleGoogleResponseRef = useRef<((response: GoogleCredentialResponse) => Promise<void>) | null>(null);

  const isRegister = mode === "register";
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();
  const useGoogleOAuthFallback = true;

  useEffect(() => {
    googleIdTokenSignInRef.current = onGoogleIdTokenSignIn;
  }, [onGoogleIdTokenSignIn]);

  useEffect(() => {
    onModeChange?.(mode);
  }, [mode, onModeChange]);

  useEffect(() => {
    handleGoogleResponseRef.current = handleGoogleCredentialResponse;
  });

  useEffect(() => {
    if (!googleClientId || googleScriptStatus !== "loading") return;
    const timeoutId = window.setTimeout(() => setGoogleScriptStatus("failed"), 8000);
    return () => window.clearTimeout(timeoutId);
  }, [googleClientId, googleScriptStatus]);

  useEffect(() => {
    if (googleScriptStatus !== "ready" || !googleClientId || !googleButtonRef.current || !parentContainerRef.current) {
      return;
    }
    const googleIdentity = window.google?.accounts.id;
    if (!googleIdentity) {
      setGoogleScriptStatus("failed");
      return;
    }
    const buttonContainer = googleButtonRef.current;
    const parentContainer = parentContainerRef.current;

    try {
      if (!googleInitializedRef.current) {
        googleIdentity.initialize({
          client_id: googleClientId,
          callback: (response) => {
            void handleGoogleResponseRef.current?.(response);
          }
        });
        googleInitializedRef.current = true;
      }
      const renderButton = (width: number) => {
        buttonContainer.replaceChildren();
        googleIdentity.renderButton(buttonContainer, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "rectangular",
          logo_alignment: "left",
          width: Math.min(width || 400, 400)
        });
      };
      const initialWidth = parentContainer.clientWidth;
      renderButton(initialWidth);
      setGoogleButtonReady(true);

      let lastWidth = initialWidth;
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const width = Math.floor(entry.contentRect.width);
          if (width > 0 && Math.abs(width - lastWidth) > 4) {
            lastWidth = width;
            renderButton(width);
          }
        }
      });
      resizeObserver.observe(parentContainer);
      return () => resizeObserver.disconnect();
    } catch {
      setGoogleScriptStatus("failed");
    }
  }, [googleClientId, googleScriptStatus]);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timeoutId = window.setTimeout(() => setCooldownSeconds((c) => c - 1), 1000);
    return () => window.clearTimeout(timeoutId);
  }, [cooldownSeconds]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || cooldownSeconds > 0) return;

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

    if (isRegister) {
      rememberLegalAcceptance();
    }

    const result = isRegister
      ? await onSignUp(normalizeEmail(email), password, normalizeName(name))
      : await onSignIn(normalizeEmail(email), password);

    setSubmitting(false);

    if (!result.ok) {
      if (result.code === "rate_limited") setCooldownSeconds(60);
      if (result.code === "invalid_email") setFieldErrors((c) => ({ ...c, email: "Este email no parece válido." }));
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
      setFeedbackTone("success");
      setFeedback(result.message ?? "Confirma tu email.");
      return; // Stop here, don't call onSuccess because they need to confirm
    }

    if (onSuccess) {
      await syncPendingLegalAcceptance().catch(() => undefined);
      trackEvent("auth_completed");
      onSuccess();
    } else if (result.message) {
      await syncPendingLegalAcceptance().catch(() => undefined);
      trackEvent("auth_completed");
      setFeedbackTone("success");
      setFeedback(result.message);
    }
  }

  async function handleGoogleSignIn() {
    trackEvent("auth_modal_google_clicked");
    if (submitting || cooldownSeconds > 0 || !isConfigured) return;
    if (isRegister) {
      rememberLegalAcceptance();
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

  async function handleDiscordSignIn() {
    if (submitting || cooldownSeconds > 0 || !isConfigured) return;
    if (isRegister) {
      rememberLegalAcceptance();
    }
    setSubmitting(true);
    setFeedback(null);
    setFieldErrors({});
    const result = await onDiscordSignIn();
    setSubmitting(false);
    if (!result.ok) {
      setFeedbackTone("error");
      setFeedback(result.message ?? "No hemos podido iniciar sesión con Discord.");
    }
  }

  async function handleGoogleCredentialResponse(response: GoogleCredentialResponse) {
    const credential = response.credential?.trim();
    if (!credential) {
      setFeedbackTone("error");
      setFeedback("Google no ha devuelto una credencial válida.");
      return;
    }
    if (isRegister) {
      rememberLegalAcceptance();
    }
    setSubmitting(true);
    setFeedback(null);
    setFieldErrors({});
    const result = await googleIdTokenSignInRef.current(credential);
    setSubmitting(false);
    
    if (!result.ok) {
      setFeedbackTone("error");
      setFeedback(result.message ?? "No hemos podido iniciar sesión con Google.");
    } else if (onSuccess) {
      await syncPendingLegalAcceptance().catch(() => undefined);
      onSuccess();
    }
  }

  return (
    <>
      {!isConfigured ? (
        <div className="mb-4 rounded-md border border-ruby/20 bg-ruby/5 px-4 py-3 text-sm font-semibold text-ruby">
          {configMessage}
        </div>
      ) : null}

      <div ref={parentContainerRef} className="flex w-full flex-col">
        {useGoogleOAuthFallback ? (
          <button
            type="button"
            className="relative mb-3 flex h-10 min-h-10 w-full items-center justify-center rounded-[4px] border border-[#dadce0] bg-white px-4 text-center text-sm font-medium text-[#3c4043] shadow-sm transition hover:bg-[#f8f9fa] disabled:pointer-events-none disabled:opacity-60"
            disabled={submitting || cooldownSeconds > 0 || !isConfigured}
            onClick={() => void handleGoogleSignIn()}
          >
            <span className="absolute left-[12px] flex items-center justify-center">
              <svg className="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
              </svg>
            </span>
            <span>Continuar con Google</span>
          </button>
        ) : (
          <div className={`relative min-h-10 w-full ${!googleButtonReady ? "hidden" : "mb-3"} ${submitting || cooldownSeconds > 0 || !isConfigured ? "pointer-events-none opacity-60" : ""}`}>
            <div ref={googleButtonRef} className="flex w-full justify-center [&>div]:w-full" />
          </div>
        )}

        <button
          type="button"
          className="relative mb-4 flex h-10 min-h-10 w-full items-center justify-center rounded-[4px] border border-[#5865F2] bg-[#5865F2] px-4 text-center text-sm font-medium text-white shadow-sm transition hover:bg-[#4752c4] hover:border-[#4752c4] disabled:pointer-events-none disabled:opacity-60"
          disabled={submitting || cooldownSeconds > 0 || !isConfigured}
          onClick={() => void handleDiscordSignIn()}
        >
          <span className="absolute left-[12px] flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 127.14 96.36" fill="currentColor">
              <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.31,60,73.31,53s5-12.74,11.43-12.74S96.33,46,96.22,53,91.08,65.69,84.69,65.69Z"/>
            </svg>
          </span>
          <span>Continuar con Discord</span>
        </button>

        {isRegister ? (
          <p className="mb-4 text-center text-[11px] font-semibold leading-5 text-walnut/55">
            Al continuar aceptas las{" "}
            <Link className="font-bold text-wood underline underline-offset-2 transition hover:text-ember" href="/aviso-legal" target="_blank">
              condiciones de uso
            </Link>{" "}
            y la{" "}
            <Link className="font-bold text-wood underline underline-offset-2 transition hover:text-ember" href="/privacidad" target="_blank">
              política de privacidad
            </Link>
            . Entras en segundos y tu ludoteca podrá recordar lo que guardes.
          </p>
        ) : null}
      </div>

      {!showEmailForm ? (
        <button 
          type="button" 
          onClick={() => setShowEmailForm(true)}
          className="flex w-full items-center justify-center gap-2 text-xs font-semibold text-walnut/60 transition hover:text-wood"
        >
          <span>O continuar con email</span>
          <ChevronDown size={14} />
        </button>
      ) : (
        <>
          <div className="mb-4 flex items-center gap-3">
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
                    className="focus-ring min-h-[40px] w-full rounded-md border border-walnut/20 bg-white pl-10 pr-3 text-sm text-ink shadow-sm transition hover:border-walnut/35"
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
                  className="focus-ring min-h-[40px] w-full rounded-md border border-walnut/20 bg-white pl-10 pr-3 text-sm text-ink shadow-sm transition hover:border-walnut/35"
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
                  className="focus-ring min-h-[40px] w-full rounded-md border border-walnut/20 bg-white pl-10 pr-11 text-sm text-ink shadow-sm transition hover:border-walnut/35"
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

            {feedback ? (
              <div className={feedbackTone === "error" ? "rounded-md border border-ruby/20 bg-ruby/5 px-4 py-3 text-sm font-semibold text-ruby" : "rounded-md border border-moss/20 bg-moss/10 px-4 py-3 text-sm font-semibold text-moss"}>
                {feedback}
              </div>
            ) : null}

            <button className="button-primary w-full shadow-sm transition min-h-[44px]" disabled={submitting || cooldownSeconds > 0 || !isConfigured} type="submit">
              {submitting ? "Enviando..." : cooldownSeconds > 0 ? `Espera ${cooldownSeconds}s` : isRegister ? "Guardar mi ludoteca" : "Entrar"}
            </button>
          </form>
        </>
      )}

      {isRegister ? (
        <p className="mt-5 text-center text-xs font-semibold text-walnut/60">
          ¿Ya tienes cuenta?{" "}
          <button type="button" onClick={() => { setMode("login"); setFeedback(null); setFieldErrors({}); }} className="text-ember hover:text-amber-strong transition font-bold underline underline-offset-2">
            Entra aquí
          </button>
        </p>
      ) : (
        <p className="mt-5 text-center text-xs font-semibold text-walnut/60">
          ¿No tienes cuenta?{" "}
          <button type="button" onClick={() => { setMode("register"); setFeedback(null); setFieldErrors({}); }} className="text-ember hover:text-amber-strong transition font-bold underline underline-offset-2">
            Guarda tu ludoteca gratis
          </button>
        </p>
      )}
    </>
  );
}
