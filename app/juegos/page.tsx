import type { Metadata } from "next";
import Link from "next/link";
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
import { filterGames, getCategoryTerms, getMechanicTerms, type GameFilterInput } from "@/lib/catalog";
import { buildCatalogSearchParams, buildCatalogUrl, catalogFilterValues } from "@/lib/catalogUrl";
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
  const resultsKey = buildCatalogSearchParams(filters).toString() || "catalog-all";

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
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="max-w-4xl">
              <p className="tavern-eyebrow">Archivo de juegos</p>
              <h1 className="page-hero-title">Catálogo de juegos de mesa</h1>
              <p className="page-hero-copy">
                Busca por título, filtra por mesa y compara categorías, mecánicas, duración y dificultad
                sin perder el hilo.
              </p>
              <div id="buscar" className="mt-7 max-w-2xl scroll-mt-24">
                <GameSearch query={filters.q} active={filters} variant="hero" />
              </div>
            </div>
          </div>
        </section>

        <Suspense key={resultsKey} fallback={<CatalogResultsSkeleton />}>
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
        <ActiveCatalogChips filters={filters} />
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
          <div className="mt-4">
            <EmptyCatalogState filters={filters} />
            {filters.q ? (
              <div className="mt-6 max-w-xl">
                <GameSuggestionForm initialName={filters.q} />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ActiveCatalogChips({ filters }: { filters: GameFilterInput }) {
  const chips = buildActiveFilterChips(filters);

  if (!chips.length) {
    return null;
  }

  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      <span className="text-xs font-black uppercase tracking-[0.14em] text-walnut/50">Activo</span>
      {chips.map((chip) => (
        <Link
          key={chip.id}
          href={chip.href}
          scroll={false}
          className="inline-flex min-h-9 items-center gap-2 rounded-full border border-moss/20 bg-moss/8 px-3 py-1 text-sm font-extrabold text-moss transition hover:border-moss/35 hover:bg-moss/12"
        >
          {chip.label}
          <span aria-hidden="true" className="text-base leading-none text-moss/60">×</span>
        </Link>
      ))}
      <Link href="/juegos" scroll={false} className="inline-flex min-h-9 items-center px-3 text-sm font-black text-ember hover:underline">
        Limpiar todo
      </Link>
    </div>
  );
}

function EmptyCatalogState({ filters }: { filters: GameFilterInput }) {
  const summary = buildActiveFilterChips(filters).map((chip) => chip.label).join(", ");

  return (
    <div className="rounded-xl border border-ember/20 bg-white p-5 shadow-soft sm:p-6">
      <p className="tavern-eyebrow">Sin resultados</p>
      <h2 className="mt-2 font-display text-2xl font-bold text-wood">No hay juegos con esta combinación</h2>
      <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-walnut/75">
        {summary
          ? `Ahora mismo estás filtrando por: ${summary}. Quita uno o dos filtros para abrir el abanico.`
          : "Prueba a relajar filtros o buscar por una categoría o mecánica más amplia."}
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link href="/juegos" scroll={false} className="button-primary inline-flex">
          Ver todo el catálogo
        </Link>
        {filters.q ? (
          <a href="#buscar" className="button-secondary bg-white inline-flex">
            Cambiar búsqueda
          </a>
        ) : null}
      </div>
    </div>
  );
}

function buildActiveFilterChips(filters: GameFilterInput) {
  const chips: Array<{ id: string; label: string; href: string }> = [];
  const labels: Partial<Record<keyof GameFilterInput, Record<string, string>>> = {
    players: { "1": "1 jugador", "2": "2 jugadores", "4": "3-4 jugadores", "6": "Grupo" },
    duration: { "30": "<30 min", "45": "<45 min", "60": "<60 min", "120": "<120 min", long: "Largos" },
    weight: { ligero: "Ligera", medio: "Media", duro: "Alta" },
    age: { "7": "7+", "8": "8+", "10": "10+", "14": "14+" },
    sort: { nombre: "Nombre", valoracion: "Valoración", fecha: "Fecha de añadido", dificultad: "Dificultad" }
  };

  const pushChip = (param: keyof GameFilterInput, value: string, label: string) => {
    const currentValues = catalogFilterValues(filters[param]);
    const nextValue = currentValues.length > 1 ? currentValues.filter((entry) => entry !== value) : null;
    chips.push({
      id: `${param}-${value}`,
      label,
      href: buildCatalogUrl(filters, { [param]: nextValue })
    });
  };

  if (filters.q) {
    chips.push({
      id: `q-${filters.q}`,
      label: `Búsqueda: ${filters.q}`,
      href: buildCatalogUrl(filters, { q: null })
    });
  }

  for (const param of ["players", "duration", "weight", "age", "category", "mechanic", "sort"] as Array<keyof GameFilterInput>) {
    for (const value of catalogFilterValues(filters[param])) {
      if (param === "sort" && value === "nombre") continue;
      pushChip(param, value, labels[param]?.[value] || value);
    }
  }

  return chips;
}

function CatalogSignupCta() {
  return (
    <article className="rounded-lg border border-accent/20 bg-surface-dark p-5 text-white shadow-soft md:col-span-2 xl:col-span-3">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <div className="flex-1">
          <h3 className="font-display text-xl font-bold">No pierdas lo que quieres probar</h3>
          <p className="mt-1 text-sm text-text-on-dark-muted">
            Guarda juegos mientras exploras y recupéralos después en tu ludoteca, sin volver a buscarlos.
          </p>
        </div>
        <AuthCtaButton context="catalog">Guardar para después</AuthCtaButton>
      </div>
    </article>
  );
}
