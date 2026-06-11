import Link from "next/link";
import { GameCoverImage } from "@/components/GameCoverImage";
import type { CatalogGame } from "@/lib/catalog";
import { getPrimaryGameTags } from "@/lib/gameDisplayTags";

export function RankingList({ games }: { games: CatalogGame[] }) {
  return (
    <ol className="tavern-card divide-y divide-walnut/15 overflow-hidden">
      {games.map((game, index) => (
        <li key={game.slug}>
          <Link
            href={`/juegos/${game.slug}`}
            className="grid gap-4 p-4 transition hover:bg-ember/10 sm:grid-cols-[54px_70px_1fr] sm:items-center touch-manipulation cursor-pointer"
            aria-label={`Abrir ficha de ${game.title}`}
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-md bg-walnut text-lg font-black text-white">
              {index + 1}
            </span>
            <GameCoverImage {...game} gameTitle={game.title} variant="ranking" showPlaceholderLabel={false} />
            <span>
              <span className="font-display block text-lg font-black text-wood">{game.title}</span>
              <span className="mt-1 block text-sm text-walnut/70">
                {[getPrimaryGameTags(game, 2).join(" · "), game.playtime, game.complexity].filter(Boolean).join(" · ")}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
