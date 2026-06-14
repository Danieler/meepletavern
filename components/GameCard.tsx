import Link from "next/link";
import { BrandIcon } from "@/components/BrandIcon";
import { GameCoverImage } from "@/components/GameCoverImage";
import { getPrimaryGameTags } from "@/lib/gameDisplayTags";
import { getEffectiveRatingScore, type CatalogGame } from "@/lib/catalog";

type GameCardProps = {
  game: CatalogGame;
  compact?: boolean;
  poster?: boolean;
};

export function GameCard({ game, compact, poster }: GameCardProps) {
  const primaryTags = getPrimaryGameTags(game, 2);
  const ratingScore = getEffectiveRatingScore(game);

  if (poster) {
    return (
      <article className="group min-w-0">
        <Link href={`/juegos/${game.slug}`} prefetch className="block" aria-label={`Abrir ficha de ${game.title}`}>
          <div className="relative overflow-hidden rounded-md border border-walnut/15 bg-walnut/10 shadow-sm transition group-hover:-translate-y-0.5 group-hover:border-ember/45 group-hover:shadow-soft">
            <GameCoverImage
              {...game}
              gameTitle={game.title}
              variant="card"
              showPlaceholderLabel={false}
              className="rounded-none"
            />
            <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-md bg-wood/90 px-2 py-1 text-sm font-black leading-none text-white shadow-sm">
              <BrandIcon name="star" size={15} />
              {typeof ratingScore === "number" ? ratingScore.toFixed(1) : "MT"}
            </span>
          </div>
          <h3 className="mt-2 truncate text-sm font-extrabold leading-5 text-wood">{game.title}</h3>
          <p className="mt-1 truncate text-xs font-semibold leading-4 text-walnut/65">
            {[game.playersLabel, game.playtime, game.complexity].filter(Boolean).join(" · ")}
          </p>
        </Link>
      </article>
    );
  }

  if (compact) {
    return (
      <article className="tavern-card overflow-hidden transition hover:-translate-y-0.5 hover:border-ember/45">
        <Link
          href={`/juegos/${game.slug}`}
          prefetch
          className="grid grid-cols-[88px_minmax(0,1fr)] gap-4 p-3 touch-manipulation cursor-pointer sm:p-4"
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
                <span key={tag} className="tavern-pill">
                  {tag}
                </span>
              ))}
            </div>
            <h3 className="font-display mt-3 text-lg font-extrabold leading-tight text-wood">{game.title}</h3>
            {game.publishedAt ? (
              <p className="tavern-meta mt-1">{formatDate(game.publishedAt)}</p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold leading-5 text-walnut/70">
              <span className="inline-flex items-center gap-1.5">
                <BrandIcon name="users" size={16} />
                {game.playersLabel || "Jugadores pendiente"}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <BrandIcon name="clock" size={16} />
                {game.playtime || "Duración pendiente"}
              </span>
            </div>
          </div>
        </Link>
      </article>
    );
  }

  return (
    <article className="tavern-card overflow-hidden transition hover:-translate-y-0.5 hover:border-ember/45">
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
                  className="tavern-pill"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <h3 className="font-display text-xl font-extrabold leading-tight text-wood">{game.title}</h3>
          {game.publishedAt ? (
            <p className="tavern-meta mt-1">{formatDate(game.publishedAt)}</p>
          ) : null}
          {!compact ? (
            <p className="mt-3 line-clamp-3 text-sm leading-6 text-walnut/80">{game.reviewSummary}</p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-x-3 gap-y-2 text-xs font-semibold leading-5 text-walnut/70">
            <span className="inline-flex items-center gap-1.5">
              <BrandIcon name="users" size={16} />
              {game.playersLabel || "Jugadores pendiente"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <BrandIcon name="clock" size={16} />
              {game.playtime || "Duración pendiente"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <BrandIcon name="gauge" size={16} />
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
