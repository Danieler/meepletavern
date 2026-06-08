import type { Metadata } from "next";
import { GameCard } from "@/components/GameCard";
import { GameFilters } from "@/components/GameFilters";
import { GameSearch } from "@/components/GameSearch";
import { PublicShell } from "@/components/PublicShell";
import { SectionHeader } from "@/components/SectionHeader";
import { SEOTextBlock } from "@/components/SEOTextBlock";
import { filterGames, type GameFilterInput } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Catálogo de juegos de mesa",
  description:
    "Explora juegos de mesa por jugadores, duración, dificultad, categorías, mecánicas, temáticas, puntuación y popularidad."
};

type GamesPageProps = {
  searchParams?: Promise<GameFilterInput>;
};

export default async function GamesPage({ searchParams }: GamesPageProps) {
  const filters = (await searchParams) || {};
  const games = filterGames(filters);

  return (
    <PublicShell>
      <main>
        <section className="border-b border-ink/10 bg-ink py-12 text-white">
          <div className="container-page">
            <p className="text-sm font-bold uppercase text-ember">Archivo de juegos</p>
            <h1 className="mt-3 text-4xl font-black sm:text-5xl">Catálogo de juegos de mesa</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-white/76">
              Busca por título, filtra por mesa, compara peso y salta entre categorías, mecánicas
              y temáticas sin perder el hilo.
            </p>
            <div className="mt-7 max-w-3xl">
              <GameSearch query={filters.q} variant="hero" />
            </div>
          </div>
        </section>

        <section className="container-page grid gap-8 py-10 lg:grid-cols-[300px_1fr] lg:py-14">
          <GameFilters active={filters} />
          <div>
            <SectionHeader
              title={`${games.length} juegos encontrados`}
              description="Cards con puntuación, ranking, duración, jugadores y peso para comparar de un vistazo."
            />
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {games.map((game) => (
                <GameCard key={game.slug} game={game} />
              ))}
            </div>
            {!games.length ? (
              <SEOTextBlock title="Sin resultados">
                <p>Prueba a relajar filtros o buscar por categoría, mecánica o temática más amplia.</p>
              </SEOTextBlock>
            ) : null}
          </div>
        </section>

        <section className="container-page pb-14">
          <SEOTextBlock title="Cómo usar el catálogo de MeepleTavern">
            <p>
              El catálogo combina señales prácticas como jugadores, duración y edad con etiquetas
              editoriales como eurogame, cooperativo, dungeon crawler o party. La idea es que cada
              ficha sirva tanto para comparar como para descubrir juegos relacionados.
            </p>
          </SEOTextBlock>
        </section>
      </main>
    </PublicShell>
  );
}

