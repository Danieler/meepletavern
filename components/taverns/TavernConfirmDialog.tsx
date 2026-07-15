"use client";

import { useEffect, useId, useRef } from "react";
import { Loader2, X } from "lucide-react";

type TavernConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  pendingLabel: string;
  pending?: boolean;
  error?: string | null;
  tone?: "default" | "danger";
  onCancel: () => void;
  onConfirm: () => void;
};

export function TavernConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  pendingLabel,
  pending = false,
  error,
  tone = "default",
  onCancel,
  onConfirm
}: TavernConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const pendingRef = useRef(pending);
  const onCancelRef = useRef(onCancel);

  useEffect(() => {
    pendingRef.current = pending;
    onCancelRef.current = onCancel;
  }, [onCancel, pending]);

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    window.setTimeout(() => cancelButtonRef.current?.focus(), 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pendingRef.current) {
        event.preventDefault();
        onCancelRef.current();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ) || []
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-ink/50 p-0 sm:items-center sm:p-4"
      role="presentation"
      onMouseDown={() => {
        if (!pending) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="w-full max-w-md rounded-t-xl border border-walnut/15 bg-paper p-5 shadow-2xl sm:rounded-xl sm:p-6"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="tavern-eyebrow">Confirmar acción</p>
            <h2 id={titleId} className="font-display mt-2 text-2xl font-bold leading-tight text-wood">
              {title}
            </h2>
          </div>
          <button
            className="focus-ring inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-walnut/15 bg-white text-walnut/65 transition hover:text-wood"
            type="button"
            disabled={pending}
            onClick={onCancel}
            aria-label="Cerrar confirmación"
          >
            <X size={18} />
          </button>
        </div>

        <p id={descriptionId} className="mt-3 text-sm font-semibold leading-6 text-walnut/72">
          {description}
        </p>

        {error ? (
          <p className="mt-4 rounded-md border border-ruby/20 bg-ruby/8 px-4 py-3 text-sm font-bold text-ruby" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <button ref={cancelButtonRef} className="button-secondary w-full" type="button" disabled={pending} onClick={onCancel}>
            Cancelar
          </button>
          <button
            className={`${tone === "danger" ? "button-danger" : "button-primary"} w-full`}
            type="button"
            disabled={pending}
            onClick={onConfirm}
          >
            {pending ? <Loader2 className="animate-spin" size={17} /> : null}
            {pending ? pendingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
