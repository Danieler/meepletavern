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
import { Sparkles } from "lucide-react";
import { CommunityHeroWidget } from "@/components/taberna/CommunityHeroWidget";
import { filterGames, getCategoryTerms, getMechanicTerms, type GameFilterInput } from "@/lib/catalog";
import { getPublicUsersPage } from "@/lib/publicProfiles";
import { GameSuggestionForm } from "@/components/GameSuggestionForm";

import { siteConfig } from "@/lib/site";

export async function generateMetadata({ searchParams }: GamesPageProps): Promise<Metadata> {
  const filters = (await searchParams) || {};
  const noIndexParams = ['category', 'mechanic', 'players', 'duration', 'weight', 'age', 'q', 'sort', 'page'];
  const shouldNoIndex = noIndexParams.some(param => filters[param as keyof GameFilterInput]);

  return {
    title: "Catálogo de juegos de mesa",
    description: "Explora juegos de mesa por jugadores, duración, dificultad, categorías, mecánicas, puntuación y popularidad.",
    alternates: {
      canonical: `${siteConfig.url}/juegos`,
    },
    ...(shouldNoIndex && {
      robots: {
        index: false,
        follow: false,
      }
    })
  };
}

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
            {filters.welcome === "true" && (
              <div className="mb-8 rounded-lg border border-moss/20 bg-moss/10 p-5 shadow-soft">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-moss/20 text-moss">
                    <Sparkles size={20} />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-wood">¡Bienvenido a la Taberna!</h2>
                    <p className="mt-1 text-walnut/80 font-medium">
                      Tu ludoteca ya puede recordar por ti. Busca tu primer juego y déjalo guardado para recuperarlo después.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <a href="#buscar" className="button-primary inline-flex">
                        Buscar mi primer juego
                      </a>
                      <a href="/mi-perfil/ajustes" className="button-secondary bg-white inline-flex">
                        Subir foto de perfil
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex flex-col lg:flex-row gap-8 lg:items-center">
              <div className="flex-1">
                <p className="tavern-eyebrow">Archivo de juegos</p>
                <h1 className="page-hero-title">Catálogo de juegos de mesa</h1>
                <p className="page-hero-copy">
                  Busca por título, filtra por mesa y compara categorías, mecánicas, duración y dificultad
                  sin perder el hilo.
                </p>
                <div id="buscar" className="mt-7 max-w-2xl scroll-mt-24">
                  <GameSearch query={filters.q} variant="hero" />
                </div>
              </div>
              
              <div className="w-full lg:w-[380px] shrink-0">
                <Suspense fallback={<div className="h-[120px] rounded-xl bg-black/5 animate-pulse" />}>
                  <CommunityHeroWidgetWrapper />
                </Suspense>
              </div>
            </div>
          </div>
        </section>

        <CatalogResults filters={filters} />

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
          <div className="flex flex-col gap-8 mt-4">
            <SEOTextBlock title="Sin resultados">
              <p>Prueba a relajar filtros o buscar por una categoría o mecánica más amplia.</p>
            </SEOTextBlock>
            {filters.q ? (
              <div className="max-w-xl">
                <GameSuggestionForm initialName={filters.q} />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function CatalogSignupCta() {
  return (
    <article className="rounded-lg border border-ember/20 bg-[#3a2118] p-5 text-white shadow-soft md:col-span-2 xl:col-span-3">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <div className="flex-1">
          <h3 className="font-display text-xl font-bold">No pierdas lo que quieres probar</h3>
          <p className="mt-1 text-sm text-parchment/80">
            Guarda juegos mientras exploras y recupéralos después en tu ludoteca, sin volver a buscarlos.
          </p>
        </div>
        <AuthCtaButton context="catalog">Guardar para después</AuthCtaButton>
      </div>
    </article>
  );
}

async function CommunityHeroWidgetWrapper() {
  const usersPage = await getPublicUsersPage();
  return <CommunityHeroWidget users={usersPage.items.slice(0, 6)} />;
}
