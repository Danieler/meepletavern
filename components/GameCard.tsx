import Link from "next/link";
import { Clock, Gauge, Users } from "lucide-react";
import { GameCoverImage } from "@/components/GameCoverImage";
import { getPrimaryGameTags } from "@/lib/gameDisplayTags";
import type { CatalogGame } from "@/lib/catalog";

type GameCardProps = {
  game: CatalogGame;
  compact?: boolean;
};

export function GameCard({ game, compact }: GameCardProps) {
  const primaryTags = getPrimaryGameTags(game, 2);

  if (compact) {
    return (
      <article className="overflow-hidden rounded-md border border-ink/10 bg-white shadow-soft transition hover:-translate-y-0.5 hover:border-moss/30">
        <Link
          href={`/juegos/${game.slug}`}
          prefetch
          className="grid grid-cols-[88px_minmax(0,1fr)] gap-4 p-3 sm:p-4 touch-manipulation cursor-pointer"
          aria-label={`Abrir ficha de ${game.title}`}
        >
          <GameCoverImage
            {...game}
            gameTitle={game.title}
            variant="ranking"
            showPlaceholderLabel={false}
            className="self-start"
          />
          <div className="min-w-0 py-1">
            <div className="flex flex-wrap gap-2">
              {primaryTags.map((tag) => (
                <span key={tag} className="rounded-md bg-moss/10 px-2.5 py-1 text-xs font-semibold text-moss">
                  {tag}
                </span>
              ))}
            </div>
            <h3 className="mt-3 text-lg font-bold leading-tight text-ink">{game.title}</h3>
            {game.publishedAt ? (
              <p className="mt-1 text-xs font-semibold uppercase text-ink/45">{formatDate(game.publishedAt)}</p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold text-ink/58">
              <span className="inline-flex items-center gap-1.5">
                <Users size={15} aria-hidden="true" />
                {game.playersLabel || "Jugadores pendiente"}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock size={15} aria-hidden="true" />
                {game.playtime || "Duración pendiente"}
              </span>
            </div>
          </div>
        </Link>
      </article>
    );
  }

  return (
    <article className="overflow-hidden rounded-md border border-ink/10 bg-white shadow-soft transition hover:-translate-y-0.5 hover:border-moss/30">
      <Link
        href={`/juegos/${game.slug}`}
        prefetch
        className="block touch-manipulation cursor-pointer"
        aria-label={`Abrir ficha de ${game.title}`}
      >
        <GameCoverImage {...game} gameTitle={game.title} variant="card" />
        <div className="p-4 sm:p-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {primaryTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-moss/10 px-2.5 py-1 text-xs font-semibold text-moss"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <h3 className="text-xl font-bold text-ink">{game.title}</h3>
          {game.publishedAt ? (
            <p className="mt-1 text-xs font-semibold uppercase text-ink/45">{formatDate(game.publishedAt)}</p>
          ) : null}
          {!compact ? (
            <p className="mt-3 line-clamp-3 text-sm leading-6 text-ink/68">{game.reviewSummary}</p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold text-ink/58">
            <span className="inline-flex items-center gap-1.5">
              <Users size={15} aria-hidden="true" />
              {game.playersLabel || "Jugadores pendiente"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock size={15} aria-hidden="true" />
              {game.playtime || "Duración pendiente"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Gauge size={15} aria-hidden="true" />
              {game.complexity || "Complejidad pendiente"}
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}
