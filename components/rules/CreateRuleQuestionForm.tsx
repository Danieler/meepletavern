"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

export function CreateRuleQuestionForm({
  gameId,
  gameSlug,
  gameTitle
}: {
  gameId: string;
  gameSlug: string;
  gameTitle: string;
}) {
  const router = useRouter();
  const { user, loading, isConfigured } = useAuth();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!isConfigured) {
    return (
      <section className="tavern-panel p-6 shadow-soft">
        <h1 className="text-3xl font-black text-wood font-display">Preguntar duda de reglas</h1>
        <p className="mt-3 text-sm font-semibold text-ruby">
          La zona de cuenta no está configurada todavía, por lo que la taberna no puede procesar preguntas.
        </p>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="tavern-panel p-6 shadow-soft animate-pulse">
        <h1 className="text-3xl font-black text-wood font-display">Preguntar duda de reglas</h1>
        <p className="mt-3 text-sm font-semibold text-walnut/60">Cargando tu sesión...</p>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="tavern-panel p-6 shadow-soft">
        <h1 className="text-3xl font-black text-wood font-display">Preguntar duda de reglas</h1>
        <p className="mt-3 text-sm font-semibold text-walnut/70">
          Necesitas iniciar sesión con tu cuenta de tavernero para poder preguntar una duda sobre el reglamento de {gameTitle}.
        </p>
        <Link
          className="button-primary mt-6 inline-flex"
          href={`/auth?mode=login&next=${encodeURIComponent(`/juegos/${gameSlug}/reglas/nueva`)}`}
        >
          Entrar a la Taberna
        </Link>
      </section>
    );
  }

  return (
    <section className="tavern-panel p-6 lg:p-8 shadow-soft">
      <h1 className="text-3xl font-black text-wood font-display">Preguntar duda de reglas</h1>
      <p className="mt-2 text-sm font-medium text-walnut/85">
        ¿Tienes alguna duda sobre el manual, setup o mecánicas de <strong className="text-wood">{gameTitle}</strong>? Pregúntale a la taberna.
      </p>

      {error ? (
        <div className="mt-5 rounded-md border border-ruby/20 bg-ruby/5 px-4 py-3 text-sm font-semibold text-ruby">
          {error}
        </div>
      ) : null}

      <form
        className="mt-6 space-y-6"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!title.trim()) {
            setError("Por favor, escribe el título de tu duda.");
            return;
          }

          setSaving(true);
          setError(null);

          try {
            const response = await fetch("/api/account/rules/questions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                gameId,
                title: title.trim(),
                body: body.trim() || undefined
              })
            });

            const payload = (await response.json().catch(() => null)) as {
              error?: string;
              question?: { id: string };
            } | null;

            setSaving(false);

            if (!response.ok || !payload?.question?.id) {
              setError(payload?.error || "Ocurrió un error al enviar la duda.");
              return;
            }

            // Redirect back to rules list page
            router.push(`/juegos/${gameSlug}/reglas`);
            router.refresh();
          } catch {
            setSaving(false);
            setError("No se pudo conectar con el servidor.");
          }
        }}
      >
        <div>
          <label className="block">
            <span className="field-label">¿Cuál es tu duda? (Título corto) *</span>
            <input
              type="text"
              className="field-input mt-2"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={150}
              required
              placeholder="Ej. ¿Cómo funciona la puntuación de las cartas de bosque al final de la partida?"
            />
            <span className="text-xs text-walnut/50 mt-1 block text-right">
              {title.length}/150 caracteres
            </span>
          </label>
        </div>

        <div>
          <label className="block">
            <span className="field-label">Detalles adicionales (Opcional)</span>
            <textarea
              className="field-input mt-2 min-h-32 py-3"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Describe el caso o la situación específica del manual en la que tienes dudas."
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button 
            className="button-primary" 
            disabled={saving} 
            type="submit"
          >
            {saving ? "Publicando..." : "Publicar duda"}
          </button>
          <Link 
            className="button-secondary" 
            href={`/juegos/${gameSlug}/reglas`}
          >
            Cancelar
          </Link>
        </div>
      </form>
    </section>
  );
}
