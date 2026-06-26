"use client";

import type { Session, User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { LEGAL_VERSION } from "@/lib/legalConstants";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";

export type AuthActionResult = {
  ok: boolean;
  message?: string;
  requiresEmailConfirmation?: boolean;
  code?:
    | "rate_limited"
    | "invalid_email"
    | "email_not_confirmed"
    | "user_exists"
    | "signup_disabled"
    | "email_delivery_failed"
    | "database_error";
};

const AUTH_BOOT_TIMEOUT_MS = 3500;
const missingConfigMessage =
  "Supabase no está configurado todavía. Añade NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en tu entorno.";
const authBootFallbackMessage =
  "No hemos podido conectar con tu cuenta ahora mismo, pero puedes seguir navegando por la web.";

function toBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function getEmailRedirectTo() {
  const envSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (envSiteUrl && /^https?:\/\//.test(envSiteUrl.trim())) {
    return `${toBaseUrl(envSiteUrl)}/auth/callback`;
  }

  if (typeof window !== "undefined") {
    return `${toBaseUrl(window.location.origin)}/auth/callback`;
  }

  return undefined;
}

function normalizeNextPath(value?: string | null) {
  if (!value || !value.startsWith("/")) {
    return "/mi-perfil";
  }

  return value;
}

function getOAuthRedirectTo(nextPath?: string) {
  const envSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const siteUrl =
    process.env.NODE_ENV === "production"
      ? "https://www.meepletavern.com"
      : envSiteUrl && /^https?:\/\//.test(envSiteUrl.trim())
        ? toBaseUrl(envSiteUrl)
        : typeof window !== "undefined"
          ? toBaseUrl(window.location.origin)
          : undefined;

  if (!siteUrl) {
    return undefined;
  }

  const next = normalizeNextPath(nextPath);
  return `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`;
}

function getPendingOnboardingMetadata() {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const rawGameIds = window.sessionStorage.getItem("meepletavern_onboarding_games");
    const parsedGameIds = rawGameIds ? JSON.parse(rawGameIds) : null;
    const gameIds = Array.isArray(parsedGameIds)
      ? parsedGameIds.filter((gameId): gameId is string => typeof gameId === "string" && gameId.trim().length > 0)
      : [];
    const source = window.sessionStorage.getItem("meepletavern_onboarding_source") || "";

    if (gameIds.length === 0) {
      return {};
    }

    return {
      meepletavern_onboarding_games: Array.from(new Set(gameIds.map((gameId) => gameId.trim()))).slice(0, 12),
      meepletavern_onboarding_source: source || "auth_onboarding"
    };
  } catch {
    return {};
  }
}

function getAuthErrorCode(message: string): AuthActionResult["code"] | undefined {
  const normalized = message.toLowerCase();

  if (normalized.includes("rate limit") || normalized.includes("too many requests")) {
    return "rate_limited";
  }

  if (normalized.includes("email not confirmed")) {
    return "email_not_confirmed";
  }

  if (normalized.includes("user already registered")) {
    return "user_exists";
  }

  if (normalized.includes("confirmation email") || normalized.includes("smtp")) {
    return "email_delivery_failed";
  }

  if (normalized.includes("signup is disabled") || normalized.includes("signups not allowed")) {
    return "signup_disabled";
  }

  if (normalized.includes("database error")) {
    return "database_error";
  }

  if (
    normalized.includes("invalid email") ||
    normalized.includes("email address invalid") ||
    normalized.includes("unable to validate email address")
  ) {
    return "invalid_email";
  }

  return undefined;
}

function getReadableAuthMessage(message: string) {
  const normalized = message.toLowerCase();
  const code = getAuthErrorCode(message);

  if (normalized.includes("invalid login credentials")) {
    return "Email o contraseña incorrectos.";
  }

  if (code === "email_not_confirmed") {
    return "Revisa tu email para confirmar la cuenta antes de entrar.";
  }

  if (code === "user_exists") {
    return "Ya existe una cuenta con este email. Prueba a iniciar sesión.";
  }

  if (code === "email_delivery_failed") {
    return "No se ha podido enviar el email de confirmación. Revisa la configuración de correo de Supabase.";
  }

  if (code === "signup_disabled") {
    return "El registro está desactivado ahora mismo en Supabase.";
  }

  if (code === "rate_limited") {
    return "Se han hecho demasiados intentos. Espera un minuto y vuelve a probar.";
  }

  if (code === "database_error") {
    return "No hemos podido crear la cuenta por un problema interno de Supabase.";
  }

  if (normalized.includes("password")) {
    return "La contraseña debe tener al menos 6 caracteres.";
  }

  if (code === "invalid_email") {
    return "Revisa que el email esté bien escrito.";
  }

  return `No hemos podido completar la acción. ${message}`;
}

function getUnknownAuthError(error: unknown): AuthActionResult {
  const message =
    error instanceof Error
      ? error.message
      : "No hemos podido conectar con el registro. Revisa la conexión e inténtalo otra vez.";

  return {
    ok: false,
    code: getAuthErrorCode(message),
    message: getReadableAuthMessage(message)
  };
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    let active = true;
    let resolved = false;

    const finish = (nextSession?: Session | null, nextWarning?: string | null) => {
      if (!active) {
        return;
      }

      if (typeof nextSession !== "undefined") {
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
      }

      if (typeof nextWarning !== "undefined") {
        setWarning(nextWarning);
      }

      setLoading(false);
    };

    const timeoutId = window.setTimeout(() => {
      if (resolved) {
        return;
      }

      resolved = true;
      finish(undefined, authBootFallbackMessage);
    }, AUTH_BOOT_TIMEOUT_MS);

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (resolved) {
          return;
        }

        resolved = true;
        window.clearTimeout(timeoutId);

        if (error) {
          finish(undefined, authBootFallbackMessage);
          return;
        }

        finish(data.session, null);
      })
      .catch(() => {
        if (resolved) {
          return;
        }

        resolved = true;
        window.clearTimeout(timeoutId);
        finish(undefined, authBootFallbackMessage);
      });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!resolved) {
        resolved = true;
        window.clearTimeout(timeoutId);
      }

      finish(nextSession, null);
    });

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  async function signUp(email: string, password: string, name?: string): Promise<AuthActionResult> {
    if (!isSupabaseConfigured) {
      return { ok: false, message: missingConfigMessage };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: getEmailRedirectTo(),
          data: {
            name: name || "",
            display_name: name || "",
            terms_accepted_at: new Date().toISOString(),
            terms_version: LEGAL_VERSION,
            ...getPendingOnboardingMetadata()
          }
        }
      });

      if (error) {
        return {
          ok: false,
          code: getAuthErrorCode(error.message),
          message: getReadableAuthMessage(error.message)
        };
      }

      return {
        ok: true,
        requiresEmailConfirmation: !data.session,
        message: data.session
          ? "Cuenta creada. Te estamos llevando a tu perfil."
          : "Te hemos enviado un email para confirmar tu cuenta. Revisa tu bandeja y después entra con tu email."
      };
    } catch (error) {
      return getUnknownAuthError(error);
    }
  }

  async function signIn(email: string, password: string): Promise<AuthActionResult> {
    if (!isSupabaseConfigured) {
      return { ok: false, message: missingConfigMessage };
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return {
          ok: false,
          code: getAuthErrorCode(error.message),
          message: getReadableAuthMessage(error.message)
        };
      }

      return { ok: true };
    } catch (error) {
      return getUnknownAuthError(error);
    }
  }

  async function signInWithGoogle(nextPath?: string): Promise<AuthActionResult> {
    if (!isSupabaseConfigured) {
      return { ok: false, message: missingConfigMessage };
    }

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: getOAuthRedirectTo(nextPath)
        }
      });

      if (error) {
        return {
          ok: false,
          code: getAuthErrorCode(error.message),
          message: getReadableAuthMessage(error.message)
        };
      }

      return { ok: true };
    } catch (error) {
      return getUnknownAuthError(error);
    }
  }

  async function signInWithDiscord(nextPath?: string): Promise<AuthActionResult> {
    if (!isSupabaseConfigured) {
      return { ok: false, message: missingConfigMessage };
    }

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "discord",
        options: {
          redirectTo: getOAuthRedirectTo(nextPath)
        }
      });

      if (error) {
        return {
          ok: false,
          code: getAuthErrorCode(error.message),
          message: getReadableAuthMessage(error.message)
        };
      }

      return { ok: true };
    } catch (error) {
      return getUnknownAuthError(error);
    }
  }

  async function signInWithGoogleIdToken(credential: string): Promise<AuthActionResult> {
    if (!isSupabaseConfigured) {
      return { ok: false, message: missingConfigMessage };
    }

    const token = credential.trim();

    if (!token) {
      return { ok: false, message: "Google no ha devuelto una credencial válida." };
    }

    try {
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token
      });

      if (error) {
        console.error("Error al iniciar sesión con Google mediante ID token:", error);
        return {
          ok: false,
          code: getAuthErrorCode(error.message),
          message: "No hemos podido iniciar sesión con Google. Inténtalo otra vez."
        };
      }

      if (!data.session) {
        console.error("Google ID token aceptado sin una sesión de Supabase.");
        return {
          ok: false,
          message: "No hemos podido completar la sesión con Google. Inténtalo otra vez."
        };
      }

      return { ok: true };
    } catch (error) {
      console.error("Error inesperado al iniciar sesión con Google mediante ID token:", error);
      return {
        ok: false,
        message: "No hemos podido iniciar sesión con Google. Inténtalo otra vez."
      };
    }
  }

  async function signOut(): Promise<AuthActionResult> {
    if (!isSupabaseConfigured) {
      return { ok: false, message: missingConfigMessage };
    }

    const { error } = await supabase.auth.signOut();

    if (error) {
      return {
        ok: false,
        code: getAuthErrorCode(error.message),
        message: getReadableAuthMessage(error.message)
      };
    }

    return { ok: true };
  }

  async function updateProfile(name: string): Promise<AuthActionResult> {
    if (!isSupabaseConfigured) {
      return { ok: false, message: missingConfigMessage };
    }

    try {
      const cleanName = name.trim().replace(/\s+/g, " ");
      const { error } = await supabase.auth.updateUser({
        data: {
          name: cleanName,
          display_name: cleanName
        }
      });

      if (error) {
        return {
          ok: false,
          code: getAuthErrorCode(error.message),
          message: getReadableAuthMessage(error.message)
        };
      }

      return { ok: true, message: "Perfil actualizado." };
    } catch (error) {
      return getUnknownAuthError(error);
    }
  }

  return {
    user,
    session,
    loading,
    warning,
    isConfigured: isSupabaseConfigured,
    signUp,
    signIn,
    signInWithGoogle,
    signInWithDiscord,
    signInWithGoogleIdToken,
    signOut,
    updateProfile
  };
}
