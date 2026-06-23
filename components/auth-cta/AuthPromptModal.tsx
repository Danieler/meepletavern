"use client";

import { useEffect, useRef } from "react";
import { AuthCtaButton } from "@/components/auth-cta/AuthCtaButton";

type AuthPromptModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  next: string;
  intent?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
};

export function AuthPromptModal({
  isOpen,
  onClose,
  title = "Guarda este juego en tu ludoteca",
  description = "Crea tu cuenta gratis para guardar juegos, puntuarlos y preparar tu próxima partida.",
  next,
  intent,
  primaryLabel = "Crear cuenta gratis",
  secondaryLabel = "Entrar"
}: AuthPromptModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    window.dispatchEvent(new CustomEvent("meepletavern:auth-prompt", { detail: { open: true } }));
    window.setTimeout(() => closeButtonRef.current?.focus(), 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
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
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-ink/45 px-3 sm:items-center sm:px-6" role="presentation" onMouseDown={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-prompt-title"
        className="w-full max-w-md rounded-t-2xl border border-walnut/15 bg-paper p-5 shadow-2xl outline-none sm:rounded-lg sm:p-6"
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
            onClick={onClose}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
        <p className="mt-3 text-sm font-semibold leading-6 text-walnut/75">{description}</p>
        <div className="mt-5 grid gap-3">
          <AuthCtaButton context="game" className="justify-center" next={next} intent={intent}>
            {primaryLabel}
          </AuthCtaButton>
          <AuthCtaButton variant="secondary" mode="login" className="justify-center" next={next} intent={intent}>
            {secondaryLabel}
          </AuthCtaButton>
          <button type="button" className="text-sm font-extrabold text-walnut/55 transition hover:text-wood" onClick={onClose}>
            Ahora no
          </button>
        </div>
      </div>
    </div>
  );
}
