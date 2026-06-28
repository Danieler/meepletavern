"use client";

import { useEffect, useRef } from "react";
import { QuickAuthForm } from "@/components/auth/QuickAuthForm";
import { useAuth } from "@/hooks/useAuth";
import { trackEvent } from "@/lib/privacySafeAnalytics";

type AuthPromptModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  next: string;
  intent?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
  onSuccess?: () => void;
};

export function AuthPromptModal({
  isOpen,
  onClose,
  title = "Te lo dejamos preparado",
  description = "Entra en segundos y lo que quieras guardar quedará en tu ludoteca para después.",
  next,
  intent: _intent,
  primaryLabel: _primaryLabel = "Entrar y guardar",
  secondaryLabel: _secondaryLabel = "Entrar",
  onSuccess
}: AuthPromptModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const {
    isConfigured,
    signIn,
    signUp,
    signInWithGoogleIdToken,
    signInWithGoogle,
    signInWithDiscord
  } = useAuth();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    trackEvent("auth_modal_opened");

    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    window.dispatchEvent(new CustomEvent("meepletavern:auth-prompt", { detail: { open: true } }));
    window.setTimeout(() => closeButtonRef.current?.focus(), 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        trackEvent("modal_closed");
        onClose();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.dispatchEvent(new CustomEvent("meepletavern:auth-prompt", { detail: { open: false } }));
      previousFocusRef.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-ink/45 px-0 pb-0 sm:px-3 sm:items-center sm:pb-6" role="presentation" onMouseDown={() => { trackEvent("modal_closed"); onClose(); }}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-prompt-title"
        className="w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-walnut/15 bg-paper p-5 shadow-2xl outline-none sm:p-6 max-h-[95vh] overflow-y-auto mt-auto sm:mt-0"
        style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="tavern-eyebrow">Tu ludoteca</p>
            <h2 id="auth-prompt-title" className="font-display mt-2 text-2xl font-bold leading-tight text-wood">
              {title}
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="focus-ring inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-walnut/10 bg-white text-xl font-black text-walnut/65 transition hover:text-wood"
            onClick={() => { trackEvent("modal_closed"); onClose(); }}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
        <p className="mt-3 text-sm font-semibold leading-6 text-walnut/75 mb-6">{description}</p>
        
        <QuickAuthForm
          isConfigured={isConfigured}
          onSignIn={signIn}
          onSignUp={signUp}
          onGoogleIdTokenSignIn={signInWithGoogleIdToken}
          onGoogleSignIn={() => signInWithGoogle(next)}
          onDiscordSignIn={() => signInWithDiscord(next)}
          initialMode="register"
          compact={true}
          onSuccess={onSuccess ? onSuccess : onClose}
        />
        
        <div className="mt-5 text-center">
          <button type="button" className="text-sm font-extrabold text-walnut/55 transition hover:text-wood" onClick={() => { trackEvent("modal_closed"); onClose(); }}>
            Ahora no
          </button>
        </div>
      </div>
    </div>
  );
}
