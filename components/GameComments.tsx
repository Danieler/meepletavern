"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BrandIcon } from "@/components/BrandIcon";
import { useAuth } from "@/hooks/useAuth";
import type { PublicGameComment } from "@/lib/gameComments";

type OwnComment = {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
} | null;

export function GameComments({
  gameId,
  gameSlug,
  initialComments
}: {
  gameId: string;
  gameSlug: string;
  initialComments: PublicGameComment[];
}) {
  const { user, loading, isConfigured } = useAuth();
  const [comments, setComments] = useState(initialComments);
  const [body, setBody] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingOwnComment, setLoadingOwnComment] = useState(false);
  const [ownComment, setOwnComment] = useState<OwnComment>(null);

  useEffect(() => {
    setComments(initialComments);
  }, [initialComments]);

  useEffect(() => {
    if (!user) {
      setLoadingOwnComment(false);
      setOwnComment(null);
      setBody("");
      return;
    }

    let active = true;
    setLoadingOwnComment(true);

    fetch(`/api/account/comments?gameId=${encodeURIComponent(gameId)}`, { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as
          | {
              comment?: OwnComment;
            }
          | null;

        if (!active) {
          return;
        }

        const nextComment = payload?.comment || null;
        setOwnComment(nextComment);
        setBody(nextComment?.body || "");
      })
      .catch(() => {
        if (active) {
          setOwnComment(null);
        }
      })
      .finally(() => {
        if (active) {
          setLoadingOwnComment(false);
        }
      });

    return () => {
      active = false;
    };
  }, [gameId, user]);

  async function submitComment() {
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/account/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          gameId,
          body
        })
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            comment?: OwnComment;
            comments?: PublicGameComment[];
          }
        | null;

      if (!response.ok || !payload?.comment || !payload.comments) {
        setError(payload?.error || "No se pudo guardar tu comentario.");
        return;
      }

      setOwnComment(payload.comment);
      setBody(payload.comment.body);
      setComments(payload.comments);
      setMessage(ownComment ? "Tu comentario se ha actualizado." : "Tu comentario ya aparece en la ficha.");
    } catch {
      setError("No se pudo guardar tu comentario.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section id="comentarios" className="tavern-panel p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-ember">Comunidad</p>
          <h2 className="font-display mt-2 text-3xl font-black text-wood">Comentarios sobre la partida</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-walnut/70">
            Impresiones cortas de jugadores con cuenta en MeepleTavern. Cada usuario mantiene un comentario editable por juego.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-ember/20 bg-ember/10 px-4 py-2 text-sm font-black text-wood">
          <BrandIcon name="chat" size={18} />
          {comments.length} {comments.length === 1 ? "comentario" : "comentarios"}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-4">
          {comments.length ? (
            comments.map((comment) => <CommentCard key={comment.id} comment={comment} />)
          ) : (
            <div className="rounded-2xl border border-dashed border-walnut/20 bg-white/55 px-5 py-6 text-sm font-semibold text-walnut/65">
              Todavía no hay comentarios de jugadores. La primera impresión puede ser la tuya.
            </div>
          )}
        </div>

        <aside className="rounded-2xl border border-ember/20 bg-white/75 p-5 shadow-soft">
          <div className="flex items-center gap-2 text-wood">
            <BrandIcon name="user" size={18} />
            <h3 className="text-lg font-black">Tu comentario</h3>
          </div>

          {!isConfigured ? (
            <p className="mt-4 text-sm font-semibold text-ruby">
              Supabase no está configurado todavía, así que los comentarios de usuarios aún no están disponibles.
            </p>
          ) : loading ? (
            <p className="mt-4 text-sm font-semibold text-walnut/65">Comprobando tu sesión...</p>
          ) : !user ? (
            <>
              <p className="mt-4 text-sm leading-6 text-walnut/70">
                Entra con tu cuenta para dejar una impresión rápida de este juego y ayudar a otros jugadores.
              </p>
              <Link
                className="button-primary mt-5 inline-flex"
                href={`/auth?next=${encodeURIComponent(`/juegos/${gameSlug}#comentarios`)}`}
              >
                Entrar para comentar
              </Link>
            </>
          ) : (
            <>
              <p className="mt-4 text-sm leading-6 text-walnut/70">
                {ownComment
                  ? "Ya tienes un comentario publicado. Puedes retocarlo cuando quieras."
                  : "Comparte una impresión breve: ritmo, sensaciones, grupo ideal o si te apetece repetir."}
              </p>
              <textarea
                className="focus-ring mt-4 min-h-40 w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm leading-6 text-ink"
                placeholder="Ejemplo: Escala muy bien a 4, las decisiones aprietan desde la mitad de la partida y apetece repetir."
                value={body}
                onChange={(event) => setBody(event.target.value)}
                disabled={saving || loadingOwnComment}
              />
              <p className="mt-2 text-xs font-semibold text-walnut/55">
                Entre 8 y 800 caracteres. Se mostrará con tu nombre de perfil.
              </p>
              {error ? <p className="mt-3 text-sm font-bold text-ruby">{error}</p> : null}
              {message ? <p className="mt-3 text-sm font-bold text-wood">{message}</p> : null}
              <button className="button-primary mt-4 w-full justify-center" type="button" onClick={submitComment} disabled={saving || loadingOwnComment}>
                {saving ? "Guardando..." : ownComment ? "Actualizar comentario" : "Publicar comentario"}
              </button>
            </>
          )}
        </aside>
      </div>
    </section>
  );
}

function CommentCard({ comment }: { comment: PublicGameComment }) {
  const edited = comment.updatedAt !== comment.createdAt;

  return (
    <article className="rounded-2xl border border-ink/10 bg-white px-5 py-4 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black text-wood">{comment.authorName}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-walnut/55">
            {formatDate(comment.createdAt)}
            {edited ? ` · editado ${formatDate(comment.updatedAt)}` : ""}
          </p>
        </div>
      </div>
      <p className="mt-3 whitespace-pre-line text-sm leading-7 text-ink/85">{comment.body}</p>
    </article>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(new Date(value));
}
