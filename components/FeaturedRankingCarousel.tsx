import Link from "next/link";
import { BrandIcon } from "@/components/BrandIcon";
import { GameCoverImage } from "@/components/GameCoverImage";
import { MobileRankingCarousel } from "@/components/MobileRankingCarousel";
import { getEffectiveRatingScore, type CatalogGame } from "@/lib/catalog";
import { getPrimaryGameTags } from "@/lib/gameDisplayTags";

const rankStyles = [
  ["border-ember/45 bg-[linear-gradient(135deg,#fff4df,#f8ead4)]", "bg-[#c9821f] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_10px_22px_rgba(201,130,31,0.24)]"],
  ["border-walnut/18 bg-[linear-gradient(135deg,#fffaf0,#f5ecdd)]", "bg-[#a96813] text-white"],
  ["border-walnut/16 bg-[linear-gradient(135deg,#fffaf0,#f8f0e3)]", "bg-[#8b5727] text-white"],
  ["border-walnut/16 bg-[linear-gradient(135deg,#fffaf0,#f7eddc)]", "bg-[#7a461e] text-white"],
  ["border-walnut/16 bg-[linear-gradient(135deg,#fffaf0,#f7f1e6)]", "bg-[#6b4224] text-white"],
  ["border-walnut/16 bg-[linear-gradient(135deg,#fffaf0,#f3eadb)]", "bg-[#4f301d] text-white"]
] as const;

export function FeaturedRankingCarousel({ games }: { games: CatalogGame[] }) {
  return (
    <MobileRankingCarousel count={games.length}>
      {games.map((game, index) => {
        const [cardStyle, badgeStyle] = rankStyles[index] ?? rankStyles[rankStyles.length - 1];
        const ratingScore = getEffectiveRatingScore(game);

        return (
          <li key={game.slug} className="flex w-[84vw] max-w-[340px] shrink-0 snap-start md:h-full md:w-auto md:max-w-none md:shrink">
            <Link
              href={`/juegos/${game.slug}`}
              className={`tavern-card relative grid h-full min-h-[164px] grid-cols-[76px_minmax(0,1fr)] items-center gap-3 p-3.5 pl-14 transition hover:-translate-y-0.5 hover:border-ember/55 sm:grid-cols-[88px_minmax(0,1fr)] md:min-h-[144px] xl:min-h-[150px] touch-manipulation cursor-pointer ${cardStyle}`}
              aria-label={`Abrir ficha de ${game.title}`}
            >
              <span className={`font-display absolute left-3 top-3 flex h-10 w-10 items-center justify-center rounded-md text-lg font-bold leading-none shadow-sm ${badgeStyle}`}>
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
                imageSizes="(max-width: 767px) 76px, 88px"
                className="self-center ring-1 ring-walnut/8"
              />
              <span className="flex min-w-0 flex-col justify-center">
                <span className="font-display block min-w-0 break-words pt-7 text-[1.2rem] font-bold leading-tight text-wood md:pr-14 md:pt-0">
                  {game.title}
                </span>
                <span className="mt-1.5 block line-clamp-2 text-sm font-semibold leading-5 text-walnut/70">
                  {[getPrimaryGameTags(game, 2).join(" · "), game.playtime, game.complexity].filter(Boolean).join(" · ")}
                </span>
                <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.12em] text-ember">
                  Ver ficha
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </MobileRankingCarousel>
  );
}
