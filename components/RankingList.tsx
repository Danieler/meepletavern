import Link from "next/link";
import { BrandIcon } from "@/components/BrandIcon";
import { GameCoverImage } from "@/components/GameCoverImage";
import { getEffectiveRatingScore, type CatalogGame } from "@/lib/catalog";
import { getPrimaryGameTags } from "@/lib/gameDisplayTags";

type RankingListProps = {
  games: CatalogGame[];
  variant?: "default" | "featured";
};

const featuredRankStyles = [
  {
    card: "border-ember/45 bg-[linear-gradient(135deg,#fff4df,#f8ead4)]",
    badge: "bg-[#c9821f] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_10px_22px_rgba(201,130,31,0.24)]"
  },
  {
    card: "border-walnut/18 bg-[linear-gradient(135deg,#fffaf0,#f5ecdd)]",
    badge: "bg-[#a96813] text-white"
  },
  {
    card: "border-walnut/16 bg-[linear-gradient(135deg,#fffaf0,#f8f0e3)]",
    badge: "bg-[#8b5727] text-white"
  },
  {
    card: "border-walnut/16 bg-[linear-gradient(135deg,#fffaf0,#f7eddc)]",
    badge: "bg-[#7a461e] text-white"
  },
  {
    card: "border-walnut/16 bg-[linear-gradient(135deg,#fffaf0,#f7f1e6)]",
    badge: "bg-[#6b4224] text-white"
  },
  {
    card: "border-walnut/16 bg-[linear-gradient(135deg,#fffaf0,#f3eadb)]",
    badge: "bg-[#4f301d] text-white"
  }
] as const;

export function RankingList({ games, variant = "default" }: RankingListProps) {
  if (variant === "featured") {
    return (
      <ol className="grid items-stretch gap-4 md:grid-cols-2">
        {games.map((game, index) => {
          const rankStyle = featuredRankStyles[index] ?? featuredRankStyles[featuredRankStyles.length - 1];
          const ratingScore = getEffectiveRatingScore(game);

          return (
            <li key={game.slug} className="h-full">
              <Link
                href={`/juegos/${game.slug}`}
                className={`tavern-card relative grid h-full min-h-[144px] gap-3 p-3.5 pl-14 transition hover:-translate-y-0.5 hover:border-ember/55 sm:grid-cols-[88px_minmax(0,1fr)] sm:items-center sm:pl-14 xl:h-[150px] xl:min-h-[150px] touch-manipulation cursor-pointer ${rankStyle.card}`}
                aria-label={`Abrir ficha de ${game.title}`}
              >
                <span className={`font-display absolute left-3 top-3 flex h-10 w-10 items-center justify-center rounded-md text-lg font-bold leading-none shadow-sm ${rankStyle.badge}`}>
                  {index + 1}
                </span>
                {typeof ratingScore === "number" ? (
                  <span className="rating-chip absolute right-3 top-3 shrink-0 px-1.5 py-0.5 text-xs">
                    <BrandIcon name="star" size={12} />
                    {ratingScore.toFixed(1)}
                  </span>
                ) : null}
                <GameCoverImage
                  {...game}
                  gameTitle={game.title}
                  variant="ranking"
                  showPlaceholderLabel={false}
                  className="self-center ring-1 ring-walnut/8"
                />
                <span className="flex min-w-0 flex-col justify-center">
                  <span className="flex items-start justify-between gap-2">
                    <span className="font-display block min-w-0 break-words pr-14 text-[1.2rem] font-bold leading-tight text-wood">
                      {game.title}
                    </span>
                  </span>
                  <span className="mt-1.5 block line-clamp-2 text-sm font-semibold leading-5 text-walnut/70">
                    {[getPrimaryGameTags(game, 2).join(" · "), game.playtime, game.complexity]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                  <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.12em] text-ember">
                    Ver ficha
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    );
  }

  return (
    <ol className="tavern-card divide-y divide-walnut/10 overflow-hidden">
      {games.map((game, index) => {
        const ratingScore = getEffectiveRatingScore(game);

        return (
          <li key={game.slug}>
            <Link
              href={`/juegos/${game.slug}`}
              className="grid gap-4 p-4 transition hover:bg-ember/5 sm:grid-cols-[54px_70px_minmax(0,1fr)] sm:items-center touch-manipulation cursor-pointer"
              aria-label={`Abrir ficha de ${game.title}`}
            >
              <span className="font-display flex h-11 w-11 items-center justify-center rounded-md bg-walnut text-xl font-bold leading-none text-white shadow-sm">
                {index + 1}
              </span>
              <GameCoverImage {...game} gameTitle={game.title} variant="ranking" showPlaceholderLabel={false} />
              <span className="min-w-0">
                <span className="flex items-start justify-between gap-2">
                  <span className="font-display block min-w-0 break-words text-lg font-bold leading-tight text-wood">
                    {game.title}
                  </span>
                  {typeof ratingScore === "number" ? (
                    <span className="rating-chip shrink-0 px-1.5 py-0.5 text-xs">
                      <BrandIcon name="star" size={12} />
                      {ratingScore.toFixed(1)}
                    </span>
                  ) : null}
                </span>
                <span className="mt-1 block line-clamp-2 text-sm font-semibold leading-6 text-walnut/70">
                  {[getPrimaryGameTags(game, 2).join(" · "), game.playtime, game.complexity].filter(Boolean).join(" · ")}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
