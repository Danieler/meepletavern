import Image from "next/image";
import Link from "next/link";
import { Clock, Star, Users } from "lucide-react";
import type { CatalogGame } from "@/lib/catalog";
import { RatingBadge } from "@/components/RatingBadge";

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
            <RatingBadge rating={game.rating} size="sm" />
          </div>
          <h3 className="text-xl font-bold text-ink">{game.title}</h3>
          <p className="mt-1 text-xs font-semibold uppercase text-ink/45">
            #{game.rank} en la taberna · {game.year}
          </p>
          {!compact ? (
            <p className="mt-3 line-clamp-3 text-sm leading-6 text-ink/68">{game.reviewSummary}</p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold text-ink/58">
            <span className="inline-flex items-center gap-1.5">
              <Users size={15} aria-hidden="true" />
              {formatPlayers(game)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock size={15} aria-hidden="true" />
              {game.durationMin}-{game.durationMax} min
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Star size={15} aria-hidden="true" />
              Peso {game.weight.toFixed(1)}
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

function formatPlayers(game: CatalogGame) {
  if (game.playersMin !== game.playersMax) {
    return `${game.playersMin}-${game.playersMax}`;
  }

  return `${game.playersMin}`;
}
