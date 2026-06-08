import type { Game } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
import { Clock, Users } from "lucide-react";

type GameCardProps = {
  game: Game;
};

export function GameCard({ game }: GameCardProps) {
  return (
    <article className="overflow-hidden rounded-md border border-ink/10 bg-white shadow-soft transition hover:-translate-y-0.5 hover:border-moss/30">
      <Link href={`/juegos/${game.slug}`} className="block">
        <GameImage game={game} />
        <div className="p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            {game.categories.slice(0, 2).map((category) => (
              <span
                key={category}
                className="rounded-md bg-moss/10 px-2.5 py-1 text-xs font-semibold text-moss"
              >
                {category}
              </span>
            ))}
          </div>
          <h3 className="text-xl font-bold text-ink">{game.name}</h3>
          {game.shortSummary ? (
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-ink/68">{game.shortSummary}</p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold text-ink/58">
            {game.minPlayers || game.maxPlayers ? (
              <span className="inline-flex items-center gap-1.5">
                <Users size={15} aria-hidden="true" />
                {formatPlayers(game.minPlayers, game.maxPlayers)}
              </span>
            ) : null}
            {game.playtime ? (
              <span className="inline-flex items-center gap-1.5">
                <Clock size={15} aria-hidden="true" />
                {game.playtime}
              </span>
            ) : null}
          </div>
        </div>
      </Link>
    </article>
  );
}

function GameImage({ game }: GameCardProps) {
  if (!game.imageUrl) {
    return (
      <div className="flex aspect-[16/10] items-center justify-center bg-[linear-gradient(135deg,#2f6f62,#8f3048)] px-6 text-center text-lg font-black text-white">
        {game.name}
      </div>
    );
  }

  return (
    <div className="relative aspect-[16/10] bg-ink/5">
      <Image
        src={game.imageUrl}
        alt={`Imagen de ${game.name}`}
        fill
        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        className="object-cover"
      />
    </div>
  );
}

function formatPlayers(minPlayers: number | null, maxPlayers: number | null) {
  if (minPlayers && maxPlayers && minPlayers !== maxPlayers) {
    return `${minPlayers}-${maxPlayers}`;
  }

  return `${minPlayers || maxPlayers}`;
}

