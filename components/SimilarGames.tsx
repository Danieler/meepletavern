import Link from "next/link";
import { slugify } from "@/lib/slug";

type SimilarGamesProps = {
  games: string[];
};

export function SimilarGames({ games }: SimilarGamesProps) {
  if (!games.length) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {games.map((game) => (
        <Link
          key={game}
          href={`/juegos/${slugify(game)}`}
          className="rounded-md border border-ink/10 bg-white px-3 py-2 text-sm font-semibold text-ink transition hover:border-moss/40 hover:text-moss"
        >
          {game}
        </Link>
      ))}
    </div>
  );
}

