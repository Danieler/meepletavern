"use client";

import { useActionState, useEffect, useRef } from "react";
import { submitGameSuggestion, type SuggestGameState } from "@/app/actions/gameSuggestions";
import { AuthCtaButton } from "@/components/auth-cta/AuthCtaButton";
import { Sparkles, AlertCircle, CheckCircle2 } from "lucide-react";

const initialState: SuggestGameState = {};

export function GameSuggestionForm({ initialName, embedded = false }: { initialName?: string; embedded?: boolean }) {
  const [state, formAction, isPending] = useActionState(submitGameSuggestion, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success && formRef.current) {
      formRef.current.reset();
    }
  }, [state.success]);

  if (state.error === "unauthenticated") {
    return (
      <div className={`rounded-lg border border-ember/20 bg-[#3a2118] p-5 text-white ${embedded ? "" : "shadow-soft"}`}>
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="flex-1">
            <h3 className="font-display text-xl font-bold flex items-center gap-2">
              <Sparkles size={20} className="text-ember" />
              Inicia sesión para sugerir
            </h3>
            <p className="mt-1 text-sm text-parchment/80">
              Necesitas una cuenta gratuita para sugerir juegos al catálogo. Así podremos notificarte cuando se añada.
            </p>
          </div>
          <AuthCtaButton context="catalog">Registrarse gratis</AuthCtaButton>
        </div>
      </div>
    );
  }

  if (state.success) {
    return (
      <div className={`rounded-lg border border-moss/20 bg-moss/10 p-5 ${embedded ? "" : "shadow-soft"}`}>
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 text-moss shrink-0" size={20} />
          <div>
            <h3 className="font-bold text-ink">¡Sugerencia enviada!</h3>
            <p className="text-sm text-ink/70 mt-1">{state.message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="sugerir-juego" className={embedded ? "rounded-md border border-ember/20 bg-ember/5 p-4" : "rounded-lg border border-ink/10 bg-white p-5 shadow-soft tavern-card"}>
      {embedded ? (
        <>
          <p className="tavern-eyebrow">No lo encuentro</p>
          <h2 className="font-display mt-2 font-bold text-wood text-xl mb-2">
            Añadir juego que falta
          </h2>
        </>
      ) : (
        <h3 className="font-display text-lg font-bold text-ink mb-2">¿No encuentras lo que buscas?</h3>
      )}
      <p className="text-sm font-semibold leading-6 text-walnut/65 mb-5">
        {embedded 
          ? "Pídenos que lo añadamos a MeepleTavern. Guardaremos la petición para revisarla, sin lanzar importadores ahora." 
          : "Déjanos el nombre del juego y lo añadiremos al catálogo lo antes posible."}
      </p>

      <form ref={formRef} action={formAction} className="flex flex-col gap-4">
        <div>
          <label htmlFor="suggestion-name" className="block text-sm font-bold text-ink mb-1.5">
            Nombre del juego <span className="text-ember">*</span>
          </label>
          <input
            id="suggestion-name"
            name="name"
            type="text"
            required
            defaultValue={initialName}
            placeholder="Ej. Gloomhaven, Catan..."
            className="focus-ring w-full rounded-md border border-ink/20 bg-white px-3 py-2 text-sm text-ink shadow-sm placeholder:text-ink/40"
          />
        </div>

        <div>
          <label htmlFor="suggestion-url" className="block text-sm font-bold text-ink mb-1.5">
            Enlace de referencia <span className="text-ink/50 font-normal text-xs">(Opcional)</span>
          </label>
          <input
            id="suggestion-url"
            name="url"
            type="url"
            placeholder="Enlace a BGG o tienda"
            className="focus-ring w-full rounded-md border border-ink/20 bg-white px-3 py-2 text-sm text-ink shadow-sm placeholder:text-ink/40"
          />
        </div>

        <div>
          <label htmlFor="suggestion-notes" className="block text-sm font-bold text-ink mb-1.5">
            Notas adicionales <span className="text-ink/50 font-normal text-xs">(Opcional)</span>
          </label>
          <textarea
            id="suggestion-notes"
            name="notes"
            rows={2}
            placeholder="Algún detalle a tener en cuenta..."
            className="focus-ring w-full rounded-md border border-ink/20 bg-white px-3 py-2 text-sm text-ink shadow-sm placeholder:text-ink/40"
          />
        </div>

        {state.error && state.error !== "unauthenticated" && (
          <div className="flex items-start gap-2 rounded-md bg-red-50 p-3 text-red-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <p className="text-sm font-medium">{state.error}</p>
          </div>
        )}

        <div className="mt-2">
          <button
            type="submit"
            disabled={isPending}
            className="button-primary w-full sm:w-auto"
          >
            {isPending ? "Enviando..." : "Enviar sugerencia"}
          </button>
        </div>
      </form>
    </div>
  );
}
