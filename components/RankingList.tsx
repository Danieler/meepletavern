import Link from "next/link";
import type { CatalogGame } from "@/lib/catalog";

export function RankingList({ games }: { games: CatalogGame[] }) {
  return (
    <ol className="divide-y divide-ink/10 overflow-hidden rounded-md border border-ink/10 bg-white shadow-soft">
      {games.map((game, index) => (
        <li key={game.slug}>
          <Link href={`/juegos/${game.slug}`} className="grid gap-4 p-4 transition hover:bg-parchment/60 sm:grid-cols-[54px_1fr_auto] sm:items-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-md bg-ink text-lg font-black text-white">
              {index + 1}
            </span>
            <span>
              <span className="block text-lg font-black text-ink">{game.title}</span>
              <span className="mt-1 block text-sm text-ink/60">
                {[game.categories.slice(0, 2).join(" · "), game.playtime, game.complexity].filter(Boolean).join(" · ")}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
