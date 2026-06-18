"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BrandIcon } from "@/components/BrandIcon";
import { GameCoverImage } from "@/components/GameCoverImage";

type UserRatingEntry = {
  gameId: string;
  slug: string;
  title: string;
  coverImageUrl: string | null;
  coverImageAlt: string;
  imageStatus: "verified" | "missing" | "placeholder" | "needs_review";
  score: number;
  updatedAt: string;
};

export function UserRatingsPanel() {
  const [entries, setEntries] = useState<UserRatingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    fetch("/api/account/ratings", { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as
          | {
              ratings?: UserRatingEntry[];
              error?: string;
            }
          | null;

        if (!active) {
          return;
        }

        if (!response.ok) {
          setFeedback(payload?.error || "No hemos podido cargar tus valoraciones.");
          setEntries([]);
          return;
        }

        setEntries(payload?.ratings || []);
      })
      .catch(() => {
        if (active) {
          setFeedback("No hemos podido cargar tus valoraciones.");
          setEntries([]);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="space-y-5">
      <section className="tavern-card overflow-hidden">
        <div className="grid gap-5 border-b border-walnut/10 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div>
            <p className="tavern-eyebrow">Mis valoraciones</p>
            <h2 className="font-display mt-2 text-3xl font-bold text-wood">Mis puntuaciones</h2>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-walnut/72">
              Revisa las notas que ya has dado, ajustalas cuando cambie tu opinion o quitalas si quieres rehacer tu voto.
            </p>
          </div>
          <div className="rating-chip justify-center">
            <BrandIcon name="star" size={14} />
            {entries.length}
          </div>
        </div>

        {feedback ? (
          <div className="border-b border-ruby/20 bg-ruby/5 px-5 py-3 text-sm font-semibold text-ruby sm:px-6">{feedback}</div>
        ) : null}

        {loading ? (
          <div className="p-5 text-sm font-semibold text-walnut/65 sm:p-6">Cargando tus puntuaciones...</div>
        ) : entries.length ? (
          <div className="divide-y divide-walnut/10">
            {entries.map((entry) => (
              <UserRatingRow
                key={entry.gameId}
                entry={entry}
                onDelete={() => {
                  setEntries((current) => current.filter((item) => item.gameId !== entry.gameId));
                }}
                onUpdate={(score) => {
                  setEntries((current) =>
                    current.map((item) =>
                      item.gameId === entry.gameId
                        ? { ...item, score, updatedAt: new Date().toISOString() }
                        : item
                    )
                  );
                }}
              />
            ))}
          </div>
        ) : (
          <div className="grid gap-5 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-6">
            <div>
              <h3 className="font-display text-2xl font-bold text-wood">Todavia no has puntuado ningun juego</h3>
              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-walnut/70">
                Cuando puntues un juego en su ficha, lo veras aqui para editar tu nota o quitarla mas tarde.
              </p>
            </div>
            <Link className="button-primary" href="/juegos">
              Explorar juegos
            </Link>
          </div>
        )}
      </section>
    </section>
  );
}

function UserRatingRow({
  entry,
  onUpdate,
  onDelete
}: {
  entry: UserRatingEntry;
  onUpdate: (score: number) => void;
  onDelete: () => void;
}) {
  const [score, setScore] = useState(String(entry.score));
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function save() {
    setPending(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/account/ratings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: entry.gameId, score: Number(score) })
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        setFeedback(payload?.error || "No hemos podido guardar la nota.");
        return;
      }

      onUpdate(Number(score));
      setFeedback("Nota actualizada.");
    } catch {
      setFeedback("No hemos podido guardar la nota.");
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    setPending(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/account/ratings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: entry.gameId })
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        setFeedback(payload?.error || "No hemos podido quitar la nota.");
        return;
      }

      onDelete();
    } catch {
      setFeedback("No hemos podido quitar la nota.");
    } finally {
      setPending(false);
    }
  }

  return (
    <article className="grid gap-4 p-5 sm:grid-cols-[84px_minmax(0,1fr)] sm:items-center sm:p-6">
      <Link href={`/juegos/${entry.slug}`} className="block">
        <GameCoverImage
          gameTitle={entry.title}
          coverImageUrl={entry.coverImageUrl}
          coverImageAlt={entry.coverImageAlt}
          imageStatus={entry.imageStatus}
          imageSourceName={null}
          imageSourceUrl={null}
          imageLicenseNote={null}
          placeholderKind="general"
          variant="ranking"
          showPlaceholderLabel={false}
        />
      </Link>
      <div className="min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <Link href={`/juegos/${entry.slug}`} className="font-display block truncate text-2xl font-bold text-wood">
              {entry.title}
            </Link>
            <p className="mt-1 text-xs font-black uppercase tracking-[0.11em] text-walnut/55">
              {formatUpdatedAt(entry.updatedAt)}
            </p>
          </div>
          <span className="rating-chip shrink-0">
            <BrandIcon name="star" size={14} />
            {entry.score.toFixed(1)}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <select
            className="field-input min-h-10 min-w-[110px] py-2 text-sm font-black"
            value={score}
            onChange={(event) => setScore(event.target.value)}
            disabled={pending}
            aria-label={`Cambiar nota de ${entry.title}`}
          >
            {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((value) => (
              <option key={value} value={value}>
                {value}/10
              </option>
            ))}
          </select>
          <button className="button-primary min-h-10 px-4 py-2 text-sm" type="button" onClick={save} disabled={pending}>
            Guardar
          </button>
          <button className="button-secondary min-h-10 px-4 py-2 text-sm" type="button" onClick={remove} disabled={pending}>
            Quitar
          </button>
        </div>

        {feedback ? <p className="mt-3 text-sm font-semibold text-walnut/72">{feedback}</p> : null}
      </div>
    </article>
  );
}

function formatUpdatedAt(value: string) {
  try {
    return `Última nota: ${new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }).format(new Date(value))}`;
  } catch {
    return "Última nota actualizada";
  }
}
