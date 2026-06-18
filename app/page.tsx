import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Brain, Clock3, House, Shield, Users, Users2, Sparkles, Swords, User } from "lucide-react";
import { BrandIcon } from "@/components/BrandIcon";
import { GameCard } from "@/components/GameCard";
import { GameSearch } from "@/components/GameSearch";
import { HeroDiscoveryBoard } from "@/components/home/HeroDiscoveryBoard";
import { PublicShell } from "@/components/PublicShell";
import { RankingList } from "@/components/RankingList";
import { SectionHeader } from "@/components/SectionHeader";
import { SEOTextBlock } from "@/components/SEOTextBlock";
import {
  getBeginnerGames,
  getCategoryTerms,
  getEffectiveRatingScore,
  getNewGames,
  getPopularGames,
  type CatalogGame,
  type GameFilterInput
} from "@/lib/catalog";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "MeepleTavern - Juegos de mesa, reseñas y recomendaciones",
  description:
    "Descubre juegos de mesa según tu grupo, tiempo y gustos. Consulta fichas, reseñas, rankings y recomendaciones en español.",
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: "MeepleTavern - Juegos de mesa, reseñas y recomendaciones",
    description:
      "Descubre juegos de mesa según tu grupo, tiempo y gustos. Consulta fichas, reseñas, rankings y recomendaciones en español.",
    url: siteConfig.url,
    siteName: siteConfig.name,
    locale: "es_ES",
    type: "website"
  }
};

export const revalidate = 3600;

export default async function Home() {
  const [popularGames, beginnerGames, newGames, categoryTerms] = await Promise.all([
    getPopularGames(6),
    getBeginnerGames(4),
    getNewGames(4),
    getCategoryTerms()
  ]);

  const ratedGames = popularGames.filter((game) => typeof getEffectiveRatingScore(game) === "number");
  const showRatingsSection = ratedGames.length >= 3;
  const editorsPick = ratedGames[0] || popularGames[0] || beginnerGames[0] || null;
  const heroGamePool = dedupeGames([
    ...(ratedGames[0] ? [ratedGames[0]] : []),
    ...(beginnerGames[0] ? [beginnerGames[0]] : []),
    ...(newGames[0] ? [newGames[0]] : []),
    ...newGames,
    ...beginnerGames,
    ...popularGames
  ])
    .slice(0, 9)
    .map((game) => ({
      slug: game.slug,
      title: game.title,
      coverImageUrl: game.coverImageUrl,
      coverImageAlt: game.coverImageAlt,
      reviewSummary: game.reviewSummary,
      playersLabel: game.playersLabel,
      playtime: game.playtime,
      complexity: game.complexity,
      ratingScore: getEffectiveRatingScore(game)
    }));
  const featuredGames = dedupeGames([
    ...(editorsPick ? [editorsPick] : []),
    ...beginnerGames,
    ...popularGames
  ]).slice(0, 3);
  const latestGames = dedupeGames([...newGames, ...popularGames]).slice(0, 3);
  const intentCards = buildIntentCards(categoryTerms);

  return (
    <PublicShell>
      <main>
        <section className="container-page pt-5">
          <div className="tavern-panel relative min-h-[460px] overflow-hidden p-5 sm:p-6 lg:p-8">
            <Image
              src="/design-assets/home-background.webp"
              alt="Mesa de juegos de mesa con cartas, dados y meeples"
              fill
              priority
              sizes="100vw"
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(247,241,230,0.985),rgba(247,241,230,0.93)_52%,rgba(59,33,22,0.22)_100%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(255,251,243,0.65),transparent_34%)]" />

            <div className="relative z-10 grid gap-10 py-4 lg:grid-cols-[1fr_400px] lg:items-center">
              <div className="flex flex-col">
                <p className="tavern-eyebrow text-ember/80 tracking-[0.25em]">La carta de juegos de mesa</p>
                <h1 className="font-display mt-4 max-w-3xl text-5xl font-bold leading-[0.95] text-wood sm:text-6xl lg:text-7xl">
                  Encuentra tu próximo <span className="text-ember">juego de mesa</span>
                </h1>
                <p className="mt-6 max-w-2xl text-lg font-medium leading-relaxed text-walnut/85 sm:text-xl">
                  Busca, compara y descubre qué sacar a mesa según tu grupo, el tiempo disponible y
                  el tipo de partida que os apetece hoy.
                </p>
                <div className="mt-8 max-w-2xl">
                  <GameSearch variant="hero" submitLabel="Buscar juegos" />
                </div>
                <div className="mt-5 flex flex-wrap gap-4">
                  <Link href="#recomendaciones" className="button-primary px-8 py-3 text-base">
                    Ver selección de la taberna
                  </Link>
                  <Link href="/juegos" className="button-secondary px-8 py-3 text-base">
                    Explorar catálogo
                  </Link>
                </div>

                <div className="mt-12">
                  <div className="flex items-center gap-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-walnut/50">
                      Mesa de descubrimiento
                    </p>
                    <div className="h-px flex-1 bg-walnut/10" />
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {intentCards.map((card) => (
                      <IntentCard key={card.title} {...card} />
                    ))}
                  </div>
                </div>
              </div>
              
              {heroGamePool.length ? (
                <aside className="h-full">
                  <HeroDiscoveryBoard games={heroGamePool} />
                </aside>
              ) : null}
            </div>
          </div>
        </section>

        <section id="recomendaciones" className="border-y border-walnut/15 bg-[#fffaf0]/70 py-9 lg:py-12">
          <div className="container-page">
            <SectionHeader
              eyebrow="Juegos recomendados"
              title="Recomendaciones destacadas para encontrar mesa rápido"
              description="Una selección pensada para comparar sensaciones, duración, dificultad y número de jugadores sin perder tiempo."
            />
            {featuredGames.length ? (
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {featuredGames.map((game) => (
                  <GameCard key={game.slug} game={game} />
                ))}
              </div>
            ) : (
              <EmptyStatePanel
                title="Estamos preparando más recomendaciones"
                description="Mientras tanto, puedes usar el catálogo para explorar juegos por categoría, mecánica o tipo de grupo."
                href="/juegos"
                linkLabel="Explorar el catálogo"
              />
            )}
          </div>
        </section>

        {showRatingsSection ? (
          <section className="container-page py-8 lg:py-10">
            <SectionHeader
              eyebrow="Valoraciones con contexto"
              title="Juegos mejor valorados por ahora"
              description="Una lectura rápida de lo que mejor está funcionando ahora mismo en la taberna."
            />
            <RankingList games={ratedGames.slice(0, 4)} />
          </section>
        ) : null}

        <section className="border-t border-walnut/15 bg-parchment py-8 lg:py-10">
          <div className="container-page">
            <SectionHeader
              eyebrow="Nuevas fichas"
              title="Juegos recién añadidos"
              description="Un vistazo rápido a lo último que ha entrado en el archivo."
            />
            {latestGames.length ? (
              <div className="grid gap-4 lg:grid-cols-3">
                {latestGames.map((game) => (
                  <GameCard key={game.slug} game={game} compact />
                ))}
              </div>
            ) : (
              <EmptyStatePanel
                title="Volveremos a llenar esta mesa pronto"
                description="Cuando entren nuevas fichas apareceran aqui para que puedas seguir explorando sin perder el hilo."
                href="/juegos"
                linkLabel="Ver todos los juegos"
              />
            )}
          </div>
        </section>

        <section className="container-page py-8 lg:py-10">
          <SEOTextBlock title="Recomendaciones de juegos de mesa en español">
            <p>
              MeepleTavern organiza fichas, reseñas y recomendaciones de juegos de mesa para que
              sea más fácil encontrar qué jugar según el grupo, la duración disponible y el tipo de
              experiencia que apetece. Si buscas juegos de mesa familiares, cooperativos, para 2
              jugadores o nuevas ideas para tu mesa, esta página está pensada para llevarte rápido al
              siguiente paso.
            </p>
          </SEOTextBlock>
        </section>
      </main>
    </PublicShell>
  );
}

function IntentCard({
  title,
  description,
  href,
  icon: Icon
}: {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
}) {
  return (
    <Link
      href={href}
      className="tavern-card group flex items-center gap-3 p-3.5 transition hover:-translate-y-0.5 hover:border-ember/40 bg-white/40"
    >
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-ember/10 text-ember transition group-hover:bg-ember/15">
        <Icon size={20} strokeWidth={2.1} absoluteStrokeWidth />
      </span>
      <div className="min-w-0">
        <h3 className="font-display text-[15px] font-bold text-wood leading-tight group-hover:text-ember transition">
          {title}
        </h3>
        <p className="mt-1 line-clamp-1 text-[11px] font-medium leading-tight text-walnut/70">
          {description}
        </p>
      </div>
    </Link>
  );
}

function EmptyStatePanel({
  title,
  description,
  href,
  linkLabel
}: {
  title: string;
  description: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <div className="tavern-card p-6">
      <h3 className="font-display text-2xl font-bold text-wood">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-walnut/80">{description}</p>
      <Link href={href} className="mt-5 inline-flex text-sm font-extrabold text-ember transition hover:text-wood">
        {linkLabel}
      </Link>
    </div>
  );
}

function buildIntentCards(categoryTerms: string[]) {
  const cards = [
    {
      title: "Para 2 jugadores",
      description: "Duelo o pareja.",
      href: buildCatalogHref({ players: "2" }),
      icon: Users2
    },
    {
      title: "Familiares",
      description: "Fáciles de sacar.",
      href: getCategoryMatchHref(categoryTerms, ["familiar"], { q: "familiar" }),
      icon: House
    },
    {
      title: "Cooperativos",
      description: "Todos contra el juego.",
      href: getCategoryMatchHref(categoryTerms, ["cooperativo"], { q: "cooperativo" }),
      icon: Shield
    },
    {
      title: "Partidas rápidas",
      description: "Menos de 45 min.",
      href: buildCatalogHref({ duration: "45" }),
      icon: Clock3
    },
    {
      title: "Grupos grandes",
      description: "Para 5 o más.",
      href: buildCatalogHref({ players: "6" }),
      icon: Users
    },
    {
      title: "Principiantes",
      description: "Ideal para empezar.",
      href: getCategoryMatchHref(categoryTerms, ["gateway", "familiar"], { q: "principiantes" }),
      icon: Sparkles
    },
    {
      title: "Para jugones",
      description: "Más profundidad.",
      href: buildCatalogHref({ weight: "duro" }),
      icon: Brain
    },
    {
      title: "Miniaturas",
      description: "Espectáculo visual.",
      href: buildCatalogHref({ q: "miniaturas" }),
      icon: Swords
    },
    {
      title: "En solitario",
      description: "Tú contra el reto.",
      href: buildCatalogHref({ players: "1" }),
      icon: User
    }
  ];

  return cards.sort((a, b) => a.title.localeCompare(b.title));
}

function buildCatalogHref(filters: Partial<GameFilterInput>) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    appendQueryValues(params, key, value);
  }

  const query = params.toString();
  return query ? `/juegos?${query}` : "/juegos";
}

function getCategoryMatchHref(
  terms: string[],
  needles: string[],
  fallbackFilters: Partial<GameFilterInput>,
  extraFilters: Partial<GameFilterInput> = {}
) {
  const match = findMatchingTerm(terms, needles);
  return match ? buildCatalogHref({ category: match, ...extraFilters }) : buildCatalogHref(fallbackFilters);
}

function findMatchingTerm(terms: string[], needles: string[]) {
  const normalizedTerms = terms.map((term) => ({
    original: term,
    normalized: term.toLowerCase()
  }));

  for (const needle of needles) {
    const normalizedNeedle = needle.toLowerCase();
    const exactMatch = normalizedTerms.find((term) => term.normalized === normalizedNeedle);
    if (exactMatch) {
      return exactMatch.original;
    }

    const match = normalizedTerms.find((term) => term.normalized.includes(normalizedNeedle));

    if (match) {
      return match.original;
    }
  }

  return undefined;
}

function appendQueryValues(params: URLSearchParams, key: string, value: string | number | string[] | undefined) {
  if (Array.isArray(value)) {
    for (const entry of value) {
      if (entry) {
        params.append(key, entry);
      }
    }
    return;
  }

  if (value !== undefined && value !== null) {
    params.set(key, String(value));
  }
}

function dedupeGames(games: Array<CatalogGame | null | undefined>) {
  const seen = new Set<string>();
  const unique: CatalogGame[] = [];

  for (const game of games) {
    if (!game || seen.has(game.slug)) {
      continue;
    }

    seen.add(game.slug);
    unique.push(game);
  }

  return unique;
}
