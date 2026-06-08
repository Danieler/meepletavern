import Image from "next/image";
import Link from "next/link";
import { Clock, Gauge, Users } from "lucide-react";
import type { CatalogGame } from "@/lib/catalog";

type GameCardProps = {
  game: CatalogGame;
  compact?: boolean;
};

export function GameCard({ game, compact }: GameCardProps) {
  return (
    <article className="overflow-hidden rounded-md border border-ink/10 bg-white shadow-soft transition hover:-translate-y-0.5 hover:border-moss/30">
      <Link href={`/juegos/${game.slug}`} className="block">
        <GameImage game={game} />
        <div className="p-4 sm:p-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {game.categories.slice(0, 2).map((category) => (
                <span
                  key={category}
                  className="rounded-md bg-moss/10 px-2.5 py-1 text-xs font-semibold text-moss"
                >
                  {category}
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

function GameImage({ game }: GameCardProps) {
  if (!game.image) {
    return (
      <div className="flex aspect-[16/10] items-center justify-center bg-[linear-gradient(135deg,#2f6f62,#8f3048)] px-6 text-center text-lg font-black text-white">
        {game.title}
      </div>
    );
  }

  return (
    <div className="relative aspect-[16/10] bg-ink/5">
      <Image
        src={game.image}
        alt={`Imagen de ${game.title}`}
        fill
        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        className="object-cover"
      />
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}
