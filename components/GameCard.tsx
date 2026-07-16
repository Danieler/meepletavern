import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { BrandIcon, type BrandIconName } from "@/components/BrandIcon";
import { GameCoverImage } from "@/components/GameCoverImage";
import { GameCardSaveButton } from "@/components/auth-cta/GameCardSaveButton";
import { getPrimaryGameTags } from "@/lib/gameDisplayTags";
import { getEffectiveRatingScore, type CatalogGame } from "@/lib/catalog";

type GameCardProps = {
  game: CatalogGame;
  compact?: boolean;
  poster?: boolean;
  dateMode?: "absolute" | "relativeRecent";
};

export function GameCard({ game, compact, poster, dateMode = "absolute" }: GameCardProps) {
  const primaryTags = getPrimaryGameTags(game, 2);
  const ratingScore = getEffectiveRatingScore(game);
  const compactFacts = getGameFacts(game);
  const fullFacts = getGameFacts(game, true);

  if (poster) {
    return (
      <article className="group min-w-0">
        <Link href={`/juegos/${game.slug}`} prefetch={false} className="block" aria-label={`Abrir ficha de ${game.title}`}>
          <div className="relative overflow-hidden rounded-lg border border-border-subtle bg-surface-muted/30 shadow-sm transition group-hover:-translate-y-0.5 group-hover:border-accent/40 group-hover:shadow-soft">
            <GameCoverImage
              {...game}
              gameTitle={game.title}
              variant="card"
              showPlaceholderLabel={false}
              className="rounded-none"
              imageSizes="(max-width: 640px) 150px, 220px"
            />
            {typeof ratingScore === "number" ? (
              <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-md bg-surface-dark/90 px-2 py-1 text-sm font-bold leading-none text-white shadow-sm">
                <BrandIcon name="star" size={15} />
                {ratingScore.toFixed(1)}
              </span>
            ) : null}
          </div>
          <h3 className="mt-2 break-words text-sm font-bold leading-5 text-text-primary sm:truncate">{game.title}</h3>
          <p className="mt-1 break-words text-xs font-semibold leading-4 text-text-tertiary sm:truncate">
            {[game.playersLabel, game.playtime, game.complexity].filter(Boolean).join(" · ")}
          </p>
        </Link>
      </article>
    );
  }

  if (compact) {
    return (
      <article className="tavern-card h-full min-h-[144px] overflow-hidden transition hover:-translate-y-0.5 hover:border-accent/40 xl:min-h-[150px]">
        <Link
          href={`/juegos/${game.slug}`}
          prefetch={false}
          className="grid h-full min-h-[144px] grid-cols-[88px_minmax(0,1fr)] items-center gap-4 p-3 touch-manipulation cursor-pointer sm:p-4 xl:min-h-[150px]"
          aria-label={`Abrir ficha de ${game.title}`}
        >
          <GameCoverImage
            {...game}
            gameTitle={game.title}
            variant="ranking"
            showPlaceholderLabel={false}
            className="self-start"
            imageSizes="88px"
          />
          <div className="min-w-0 py-1">
            <div className="flex flex-wrap gap-2">
              {primaryTags.map((tag) => (
                <span key={tag} className="tavern-pill">
                  {tag}
                </span>
              ))}
            </div>
            <h3 className="font-display mt-3 line-clamp-2 text-lg font-bold leading-tight text-text-primary">{game.title}</h3>
            {game.publishedAt ? (
              <p className="mt-1.5 inline-flex w-fit rounded border border-accent/20 bg-accent/8 px-2 py-0.5 text-micro font-bold uppercase tracking-eyebrow text-accent">
                {formatAddedDate(game.publishedAt, dateMode)}
              </p>
            ) : null}
            {compactFacts.length ? (
              <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold leading-5 text-text-secondary">
                {compactFacts.map((fact) => (
                  <span key={fact.icon} className="inline-flex items-center gap-1.5">
                    <BrandIcon name={fact.icon} size={16} />
                    {fact.value}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </Link>
      </article>
    );
  }

  return (
    <article className="tavern-card overflow-hidden transition hover:-translate-y-0.5 hover:border-accent/40">
      <Link
        href={`/juegos/${game.slug}`}
        prefetch={false}
        className="block touch-manipulation cursor-pointer"
        aria-label={`Abrir ficha de ${game.title}`}
      >
        <GameCoverImage {...game} gameTitle={game.title} variant="card" imageSizes="(max-width: 768px) 94vw, (max-width: 1280px) 45vw, 350px" />
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
            {typeof ratingScore === "number" ? (
              <span className="rating-chip shrink-0">
                <BrandIcon name="star" size={14} />
                {ratingScore.toFixed(1)}
              </span>
            ) : null}
          </div>
          <h3 className="font-display text-xl font-bold leading-tight text-text-primary">{game.title}</h3>
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-text-secondary">{game.reviewSummary}</p>
          {fullFacts.length ? (
            <div className="mt-4 flex flex-wrap gap-x-3 gap-y-2 text-xs font-semibold leading-5 text-text-tertiary">
              {fullFacts.map((fact) => (
                <span key={fact.icon} className="inline-flex items-center gap-1.5">
                  <BrandIcon name={fact.icon} size={16} />
                  {fact.value}
                </span>
              ))}
            </div>
          ) : null}
          <div className="mt-5 flex items-center justify-between gap-3 border-t border-border-subtle pt-4">
            <span className="text-xs font-bold uppercase tracking-eyebrow text-text-tertiary">
              {game.categories[0] || "Juego de mesa"}
            </span>
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent">
              Ver ficha
              <ChevronRight size={16} strokeWidth={2.2} />
            </span>
          </div>
        </div>
      </Link>
      <div className="px-4 pb-4 sm:px-5 sm:pb-5">
        <GameCardSaveButton gameId={game.id} gameTitle={game.title} />
      </div>
    </article>
  );
}

function getGameFacts(game: CatalogGame, includeComplexity = false) {
  const facts: Array<{ icon: BrandIconName; value: string }> = [];

  if (game.playersLabel) facts.push({ icon: "users", value: game.playersLabel });
  if (game.playtime) facts.push({ icon: "clock", value: game.playtime });
  if (includeComplexity && game.complexity) facts.push({ icon: "gauge", value: game.complexity });

  return facts;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function formatAddedDate(value: string, mode: GameCardProps["dateMode"]) {
  if (mode !== "relativeRecent") {
    return formatDate(value);
  }

  const addedAt = new Date(value);
  const today = startOfDay(new Date());
  const addedDay = startOfDay(addedAt);
  const daysAgo = Math.floor((today.getTime() - addedDay.getTime()) / 86_400_000);

  if (daysAgo <= 0) {
    return "Añadido hoy";
  }

  if (daysAgo <= 3) {
    return `Añadido hace ${daysAgo} ${daysAgo === 1 ? "día" : "días"}`;
  }

  return `Añadido el ${formatDate(value)}`;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
