"use client";

import Link from "next/link";
import { useState } from "react";
import { ReviewBodyEditor } from "@/components/reviews/ReviewBodyEditor";
import { useAuth } from "@/hooks/useAuth";
import { REVIEW_SUMMARY_MAX_LENGTH, REVIEW_TITLE_MAX_LENGTH } from "@/lib/reviewContent";

export function CreateReviewForm({
  gameId,
  gameSlug,
  gameTitle
}: {
  gameId: string;
  gameSlug: string;
  gameTitle: string;
}) {
  const { user, loading, isConfigured } = useAuth();
  const [title, setTitle] = useState(`Mi opinión sobre ${gameTitle}`);
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isConfigured) {
    return (
      <section className="rounded-md border border-ruby/20 bg-white p-6 shadow-soft">
        <h1 className="text-3xl font-black text-ink">Escribir reseña</h1>
        <p className="mt-3 text-sm font-semibold text-ruby">
          La zona de cuenta no está configurada todavía, así que la taberna aún no puede publicar reseñas.
        </p>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="rounded-md border border-ink/10 bg-white p-6 shadow-soft">
        <h1 className="text-3xl font-black text-ink">Escribir reseña</h1>
        <p className="mt-3 text-sm font-semibold text-ink/60">Cargando tu sesión...</p>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="rounded-md border border-ink/10 bg-white p-6 shadow-soft">
        <h1 className="text-3xl font-black text-ink">Escribir reseña</h1>
        <p className="mt-3 text-sm font-semibold text-ink/65">
          Necesitas entrar con tu cuenta para publicar una reseña de este juego.
        </p>
        <Link
          className="button-primary mt-5 inline-flex"
          href={`/auth?mode=login&next=${encodeURIComponent(`/juegos/${gameSlug}/resena`)}`}
        >
          Entrar
        </Link>
      </section>
    );
  }

  if (success) {
    return (
      <section className="rounded-md border border-ink/10 bg-white p-6 shadow-soft">
        <h1 className="text-3xl font-black text-ink">¡Reseña enviada!</h1>
        <p className="mt-3 font-semibold text-ink/65">
          Tu reseña se ha guardado correctamente y está pendiente de revisión.
        </p>
        <p className="mt-2 text-sm text-ink/60">
          La publicaremos una vez comprobemos que cumple con las normas de la taberna.
        </p>
        <div className="mt-6">
          <Link className="button-primary" href={`/juegos/${gameSlug}`}>
            Volver al juego
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-md border border-ink/10 bg-white p-6 shadow-soft">
      <h1 className="text-3xl font-black text-ink">Escribir reseña</h1>
      <p className="mt-3 text-sm font-semibold text-ink/65">
        Tu reseña se publicará con tu nombre visible para este juego.
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
          setSaving(true);
          setError(null);

          const response = await fetch("/api/account/reviews", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              gameId,
              title,
              summary,
              body
            })
          });

          const payload = (await response.json().catch(() => null)) as
            | {
                error?: string;
                review?: {
                  slug: string;
                };
              }
            | null;

          setSaving(false);

          if (!response.ok || !payload?.review?.slug) {
            setError(payload?.error || "No se pudo publicar la reseña.");
            return;
          }

          setSuccess(true);
        }}
      >
        <label className="block">
          <span className="field-label">Título</span>
          <input
            className="field-input mt-2"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={REVIEW_TITLE_MAX_LENGTH}
            required
            placeholder="Ej. Mi opinión sobre Aventureros al Tren: un clásico imprescindible"
          />
        </label>

        <label className="block">
          <span className="field-label">Resumen</span>
          <textarea
            className="field-input mt-2 min-h-24 py-3"
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            maxLength={REVIEW_SUMMARY_MAX_LENGTH}
            required
            placeholder="Un breve resumen o veredicto rápido que llame la atención de los lectores (máx. 600 caracteres)."
          />
        </label>

        <div>
          <p className="field-label">Reseña</p>
          <div className="mt-2">
            <ReviewBodyEditor value={body} onChange={setBody} required />
          </div>
        </div>


        <div className="flex flex-wrap gap-3">
          <button className="button-primary" disabled={saving} type="submit">
            {saving ? "Publicando..." : "Publicar reseña"}
          </button>
          <Link className="button-secondary" href={`/juegos/${gameSlug}`}>
            Volver al juego
          </Link>
        </div>
      </form>
    </section>
  );
}
