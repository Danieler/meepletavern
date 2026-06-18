import type { Metadata } from "next";
import { GameCard } from "@/components/GameCard";
import { GameFilters } from "@/components/GameFilters";
import { GameSearch } from "@/components/GameSearch";
import { Pagination } from "@/components/Pagination";
import { PublicShell } from "@/components/PublicShell";
import { SectionHeader } from "@/components/SectionHeader";
import { SEOTextBlock } from "@/components/SEOTextBlock";
import { filterGames, getCategoryTerms, getMechanicTerms, type GameFilterInput } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Catálogo de juegos de mesa",
  description:
    "Explora juegos de mesa por jugadores, duración, dificultad, categorías, mecánicas, puntuación y popularidad."
};

type GamesPageProps = {
  searchParams?: Promise<GameFilterInput>;
};

export const revalidate = 3600;

export default async function GamesPage({ searchParams }: GamesPageProps) {
  const filters = (await searchParams) || {};
  const [filterResult, categoryTerms, mechanicTerms] = await Promise.all([
    filterGames(filters),
    getCategoryTerms(),
    getMechanicTerms()
  ]);

  const { games, total, page, totalPages } = filterResult;

  return (
    <PublicShell>
      <main>
        <section className="page-hero">
          <div className="container-page">
            <p className="tavern-eyebrow">Archivo de juegos</p>
            <h1 className="page-hero-title">Catálogo de juegos de mesa</h1>
            <p className="page-hero-copy">
              Busca por título, filtra por mesa y compara categorías, mecánicas, duración y dificultad
              sin perder el hilo.
            </p>
            <div className="mt-7 max-w-3xl">
              <GameSearch query={filters.q} variant="hero" />
            </div>
          </div>
        </section>

        <section className="container-page grid gap-8 py-10 lg:grid-cols-[300px_1fr] lg:py-14">
          <GameFilters active={filters} categoryTerms={categoryTerms} mechanicTerms={mechanicTerms} />
          <div>
            <SectionHeader
              title={`${total} juegos encontrados`}
              description="Fichas con puntuación, ranking, duración, jugadores y dificultad para comparar de un vistazo."
            />
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {games.map((game) => (
                <GameCard key={game.slug} game={game} />
              ))}
            </div>

            <Pagination active={filters} totalPages={totalPages} currentPage={page} />

            {!games.length ? (
              <SEOTextBlock title="Sin resultados">
                <p>Prueba a relajar filtros o buscar por una categoría o mecánica más amplia.</p>
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
