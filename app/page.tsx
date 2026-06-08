import { Dice5, Map, ScrollText, Trophy } from "lucide-react";
import Link from "next/link";
import { GameCard } from "@/components/GameCard";
import { SectionHeader } from "@/components/SectionHeader";
import { TavernHero } from "@/components/TavernHero";
import { getFeaturedGames, getPublishedGames } from "@/lib/games";

export const dynamic = "force-dynamic";

type HomeProps = {
  searchParams?: Promise<{
    q?: string;
  }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const query = params?.q?.trim() || "";
  const [featuredGames, latestGames] = await Promise.all([
    getFeaturedGames(),
    getPublishedGames({ limit: 6, query })
  ]);
  const categories = extractCategories(latestGames.length ? latestGames : featuredGames);

  return (
    <main>
      <TavernHero query={query} />
      <section className="container-page py-12 lg:py-16">
        <SectionHeader
          eyebrow="Archivo de juegos"
          title={query ? `Resultados para "${query}"` : "Juegos destacados"}
          description="Fichas pensadas para resolver dudas rápidas: duración, jugadores, complejidad, opinión y juegos parecidos."
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {(query ? latestGames : featuredGames).map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      </section>

      <section className="border-y border-ink/10 bg-white py-12 lg:py-16">
        <div className="container-page">
          <SectionHeader
            eyebrow="Crónicas recientes"
            title="Últimas fichas publicadas"
            description="Cada ficha publicada puede posicionar búsquedas concretas en español sin mezclar contenido todavía en borrador."
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {latestGames.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        </div>
      </section>

      <section className="container-page grid gap-8 py-12 lg:grid-cols-[1fr_0.86fr] lg:py-16">
        <div>
          <SectionHeader
            eyebrow="Misiones"
            title="Categorías destacadas"
            description="Rutas rápidas para explorar por tipo de experiencia, desde clásicos familiares hasta campañas cooperativas."
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {categories.map((category) => (
              <Link
                href={`/?q=${encodeURIComponent(category)}`}
                key={category}
                className="group flex items-center gap-3 rounded-md border border-ink/10 bg-white p-4 shadow-soft transition hover:border-moss/35"
              >
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-moss/10 text-moss">
                  <Map size={19} aria-hidden="true" />
                </span>
                <span className="font-semibold text-ink group-hover:text-moss">{category}</span>
              </Link>
            ))}
          </div>
        </div>

        <aside className="rounded-md border border-ink/10 bg-ink p-6 text-white shadow-soft">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-ember text-ink">
              <Dice5 size={22} aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-parchment">¿Qué juego saco hoy?</p>
              <h2 className="text-2xl font-black">Recomendador en camino</h2>
            </div>
          </div>
          <p className="mt-5 text-sm leading-6 text-white/76">
            Un bloque preparado para recomendar juegos por tiempo, número de jugadores y ganas de
            pelea amable en mesa.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-md bg-white/10 p-3">
              <Trophy size={18} aria-hidden="true" />
              <p className="mt-2 font-semibold">Salón de la fama</p>
            </div>
            <div className="rounded-md bg-white/10 p-3">
              <ScrollText size={18} aria-hidden="true" />
              <p className="mt-2 font-semibold">Crónicas rápidas</p>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}

function extractCategories<T extends { categories: string[] }>(games: T[]) {
  const categories = new Set<string>();

  for (const game of games) {
    for (const category of game.categories) {
      categories.add(category);
    }
  }

  return Array.from(categories).slice(0, 6);
}

