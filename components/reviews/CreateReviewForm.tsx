"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

export function CreateReviewForm({
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
  const [title, setTitle] = useState(`Mi opinión sobre ${gameTitle}`);
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!isConfigured) {
    return (
      <section className="rounded-md border border-ruby/20 bg-white p-6 shadow-soft">
        <h1 className="text-3xl font-black text-ink">Escribir reseña</h1>
        <p className="mt-3 text-sm font-semibold text-ruby">
          Supabase no está configurado todavía, así que los usuarios aún no pueden crear reseñas.
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
          href={`/auth?next=${encodeURIComponent(`/juegos/${gameSlug}/resena`)}`}
        >
          Entrar
        </Link>
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
        className="mt-6 space-y-4"
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

          router.push(`/resenas/${payload.review.slug}`);
          router.refresh();
        }}
      >
        <label className="block">
          <span className="text-sm font-bold text-ink">Título</span>
          <input
            className="focus-ring mt-2 min-h-11 w-full rounded-md border border-ink/10 bg-white px-3 text-sm text-ink"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </label>

        <label className="block">
          <span className="text-sm font-bold text-ink">Resumen</span>
          <textarea
            className="focus-ring mt-2 min-h-24 w-full rounded-md border border-ink/10 bg-white px-3 py-3 text-sm text-ink"
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            required
          />
        </label>

        <label className="block">
          <span className="text-sm font-bold text-ink">Reseña</span>
          <textarea
            className="focus-ring mt-2 min-h-56 w-full rounded-md border border-ink/10 bg-white px-3 py-3 text-sm text-ink"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            required
          />
        </label>

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
