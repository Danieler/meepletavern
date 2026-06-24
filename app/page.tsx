import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Brain, Clock3, House, Shield, Users, Users2, Sparkles, Swords, User } from "lucide-react";
import { GameCard } from "@/components/GameCard";
import { GameSearch } from "@/components/GameSearch";
import { HeroDiscoveryBoard } from "@/components/home/HeroDiscoveryBoard";
import { PublicShell } from "@/components/PublicShell";
import { FeaturedRankingCarousel } from "@/components/FeaturedRankingCarousel";
import { SectionHeader } from "@/components/SectionHeader";
import { SEOTextBlock } from "@/components/SEOTextBlock";
import { HomeHeroAuthControls, HomeSidebarAuthControls, HomeFooterSignupCta } from "@/components/home/HomeAuthControls";
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
import { rotateDaily } from "@/lib/dailyRotation";

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
  const heroGamePool = rotateDaily(
    dedupeGames([
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
      }))
  );
  const featuredGames = dedupeGames([
    ...(editorsPick ? [editorsPick] : []),
    ...beginnerGames,
    ...popularGames
  ]).slice(0, 3);
  const latestGames = dedupeGames([...newGames, ...popularGames]).slice(0, 3);
  const intentCards = buildIntentCards(categoryTerms);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    alternateName: "Meeple Tavern",
    url: siteConfig.url,
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteConfig.url}/juegos?q={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <PublicShell>
      <main>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
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

            <div className="relative z-10 grid gap-10 py-4 lg:grid-cols-[1fr_400px] lg:items-stretch">
              <div className="flex h-full flex-col">
                <p className="tavern-eyebrow text-ember/80 tracking-[0.25em]">La carta de juegos de mesa</p>
                <h1 className="font-display mt-4 max-w-3xl text-5xl font-bold leading-[0.95] text-wood sm:text-6xl lg:text-7xl">
                  Encuentra tu próximo <span className="text-ember">juego de mesa</span>
                </h1>
                <p className="mt-6 max-w-2xl text-lg font-medium leading-relaxed text-walnut/85 sm:text-xl">
                  Busca, compara y descubre qué sacar a mesa según tu grupo, tu tiempo y las
                  ludotecas de otros jugadores.
                </p>
                <div className="mt-8 max-w-2xl">
                  <GameSearch variant="hero" submitLabel="Buscar juegos" />
                </div>
                <HomeHeroAuthControls />

                <div className="mt-10">
                  <div className="flex items-center gap-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-walnut/50">
                      Mesa de descubrimiento
                    </p>
                    <div className="h-px flex-1 bg-walnut/10" />
                  </div>
                  <p className="mt-2 text-sm font-semibold leading-6 text-walnut/76">
                    Menos filtros, más partida.
                  </p>
                  <div className="mt-4 grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 lg:grid-cols-3">
                    {intentCards.map((card) => (
                      <IntentCard key={card.title} {...card} />
                    ))}
                  </div>
                </div>
              </div>
              
              {heroGamePool.length ? (
                <aside className="h-full lg:flex">
                  <HeroDiscoveryBoard games={heroGamePool} />
                </aside>
              ) : null}
            </div>
          </div>
        </section>

        <section className="container-page py-7 lg:py-8">
          <div className="overflow-hidden rounded-lg border border-walnut/12 bg-[linear-gradient(135deg,#fffaf0,#f5e9d6)] shadow-soft">
            <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="p-5 sm:p-6">
                <p className="tavern-eyebrow">La taberna está abierta</p>
                <h2 className="font-display mt-2 text-3xl font-bold leading-tight text-wood sm:text-4xl">
                  Tu próxima partida empieza en la taberna
                </h2>
                <p className="mt-3 text-base font-medium leading-7 text-walnut/80">
                  Crea tu rincón, guarda tu ludoteca y descubre qué juegos tienen otros jugadores
                  antes de montar la próxima partida.
                </p>
                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  {TAVERN_FEATURES.map((feature) => (
                    <TavernFeatureCard
                      key={feature.title}
                      {...feature}
                      href={feature.title === "Mi ludoteca" ? "/mi-perfil" : feature.href}
                    />
                  ))}
                </div>
              </div>
              <aside className="border-t border-walnut/10 bg-[#3a2118] p-5 text-white lg:border-l lg:border-t-0 sm:p-6">
                <HomeSidebarAuthControls />
                <div className="mt-5 rounded-md border border-white/10 bg-white/8 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-ember">Para empezar</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-parchment/80">
                    Menos rankings sueltos, más mesas reales y ludotecas con contexto.
                  </p>
                </div>
              </aside>
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

        <section className="border-t border-walnut/15 bg-parchment py-8 lg:py-10">
          <div className="container-page">
            <div className={`grid gap-6 ${showRatingsSection ? "xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]" : ""}`}>
              {showRatingsSection ? (
                <div className="min-w-0">
                  <SectionHeader
                    eyebrow="Valoraciones con contexto"
                    title="Juegos mejor valorados por ahora"
                    description="Una lectura rápida de lo que mejor está funcionando ahora mismo en la taberna."
                  />
                  <FeaturedRankingCarousel games={ratedGames.slice(0, 6)} />
                </div>
              ) : null}

              <div>
                <SectionHeader
                  eyebrow="Nuevas fichas"
                  title="Juegos recién añadidos"
                  description="Un vistazo rápido a lo último que ha entrado en el archivo."
                />
                {latestGames.length ? (
                  <div className="grid gap-4 lg:grid-cols-3 xl:grid-cols-1">
                    {latestGames.map((game) => (
                      <GameCard key={game.slug} game={game} compact dateMode="relativeRecent" />
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
            </div>
          </div>
        </section>

        <HomeFooterSignupCta />

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

const TAVERN_FEATURES = [
  {
    title: "Mi ludoteca",
    description: "Guarda los juegos que tienes, los que quieres, los que has jugado y los que quieres jugar.",
    icon: User,
    href: "/mi-perfil",
    action: "Ver mi rincón"
  },
  {
    title: "Otros taberneros",
    description: "Explora perfiles públicos, descubre colecciones reales y encuentra jugadores con gustos parecidos.",
    icon: Users,
    href: "/taberna",
    action: "Ver perfiles"
  },
  {
    title: "Ideas para sacar a mesa",
    description: "Descubre juegos desde mesas reales, no solo desde rankings.",
    icon: Sparkles,
    href: "/juegos",
    action: "Descubrir juegos"
  }
] as const;

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
      className="tavern-card group flex items-center gap-3 bg-white/50 p-3.5 transition hover:-translate-y-0.5 hover:border-ember/40"
    >
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-ember/10 text-ember transition group-hover:bg-ember/15">
        <Icon size={20} strokeWidth={2.1} absoluteStrokeWidth />
      </span>
      <div className="min-w-0">
        <h3 className="font-display text-[15px] font-bold text-wood leading-tight group-hover:text-ember transition">
          {title}
        </h3>
        <p className="mt-1 text-[11px] font-medium leading-4 text-walnut/70">
          {description}
        </p>
      </div>
    </Link>
  );
}

function TavernFeatureCard({
  title,
  description,
  icon: Icon,
  href,
  action
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  action: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-md border border-walnut/10 bg-white/72 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-ember/45 hover:bg-white"
    >
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-ember/10 text-ember">
        <Icon size={20} strokeWidth={2.1} absoluteStrokeWidth />
      </span>
      <h3 className="font-display mt-3 text-xl font-bold text-wood transition group-hover:text-ember">{title}</h3>
      <p className="mt-2 text-sm font-semibold leading-6 text-walnut/78">{description}</p>
      <p className="mt-4 text-xs font-black uppercase tracking-[0.14em] text-ember">{action}</p>
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
