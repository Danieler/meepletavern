import type { Metadata } from "next";
import { Fragment, Suspense } from "react";
import { GameCard } from "@/components/GameCard";
import { GameFilters } from "@/components/GameFilters";
import { GameSearch } from "@/components/GameSearch";
import { Pagination } from "@/components/Pagination";
import { PublicShell } from "@/components/PublicShell";
import { SectionHeader } from "@/components/SectionHeader";
import { SEOTextBlock } from "@/components/SEOTextBlock";
import { CatalogResultsSkeleton } from "@/components/loading/PublicPageSkeletons";
import { AuthCtaButton } from "@/components/auth-cta/AuthCtaButton";
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

        <Suspense fallback={<CatalogResultsSkeleton />}>
          <CatalogResults filters={filters} />
        </Suspense>

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

async function CatalogResults({ filters }: { filters: GameFilterInput }) {
  const [filterResult, categoryTerms, mechanicTerms] = await Promise.all([
    filterGames(filters),
    getCategoryTerms(),
    getMechanicTerms()
  ]);
  const { games, total, page, totalPages } = filterResult;

  return (
    <section className="container-page grid gap-8 py-10 lg:grid-cols-[300px_1fr] lg:py-14">
      <GameFilters active={filters} categoryTerms={categoryTerms} mechanicTerms={mechanicTerms} />
      <div>
        <SectionHeader
          title={`${total} juegos encontrados`}
          description="Fichas con puntuación, ranking, duración, jugadores y dificultad para comparar de un vistazo."
        />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {games.map((game, index) => (
            <Fragment key={game.slug}>
              {index === 6 ? <CatalogSignupCta /> : null}
              <GameCard game={game} />
            </Fragment>
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
  );
}

function CatalogSignupCta() {
  return (
    <article className="rounded-lg border border-ember/20 bg-[#3a2118] p-5 text-white shadow-soft md:col-span-2 xl:col-span-3">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px] md:items-center">
        <div>
          <p className="tavern-eyebrow text-ember">Tu ludoteca</p>
          <h2 className="font-display mt-2 text-2xl font-bold leading-tight">
            ¿Has encontrado juegos que quieres probar?
          </h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-parchment/78">
            Guárdalos en tu ludoteca y crea listas para tu próxima partida.
          </p>
        </div>
        <AuthCtaButton context="catalog" className="justify-center" next="/juegos">
          Crear ludoteca gratis
        </AuthCtaButton>
      </div>
    </article>
  );
}
