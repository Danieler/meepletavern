import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Beer,
  BookOpenText,
  Brain,
  Clock3,
  House,
  LibraryBig,
  Shield,
  Sparkles,
  Swords,
  User,
  Users,
  Users2
} from "lucide-react";
import { GameCard } from "@/components/GameCard";
import { GameSearch } from "@/components/GameSearch";
import { PublicShell } from "@/components/PublicShell";
import { CompatibilitySection } from "@/components/home/CompatibilitySection";
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
import { slugify } from "@/lib/slug";
import { getPublicSiteStats, type PublicSiteStats } from "@/lib/publicSiteStats";

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
  const [compatibilityPopularGames, beginnerGames, newGames, categoryTerms, siteStats] = await Promise.all([
    safePublicData("home.popularGames", () => getPopularGames(48), [] as CatalogGame[]),
    safePublicData("home.beginnerGames", () => getBeginnerGames(4), [] as CatalogGame[]),
    safePublicData("home.newGames", () => getNewGames(4), [] as CatalogGame[]),
    safePublicData("home.categoryTerms", () => getCategoryTerms(), [] as string[]),
    safePublicData("home.siteStats", () => getPublicSiteStats(), null as PublicSiteStats | null)
  ]);
  const popularGames = compatibilityPopularGames.slice(0, 6);

  const ratedGames = popularGames.filter((game) => typeof getEffectiveRatingScore(game) === "number");
  const showRatingsSection = ratedGames.length >= 3;
  const editorsPick = ratedGames[0] || popularGames[0] || beginnerGames[0] || null;
  const uniqueDiscoveryGames = dedupeGames([
    ...(ratedGames[0] ? [ratedGames[0]] : []),
    ...(beginnerGames[0] ? [beginnerGames[0]] : []),
    ...(newGames[0] ? [newGames[0]] : []),
    ...newGames,
    ...beginnerGames,
    ...popularGames
  ]);

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
        <HomeStatsStrip stats={siteStats} />

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
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(242,234,224,0.985),rgba(242,234,224,0.93)_52%,rgba(44,24,16,0.22)_100%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(255,251,243,0.65),transparent_34%)]" />

            <div className="relative z-10 grid gap-10 py-4 lg:grid-cols-[1fr_420px] lg:items-stretch">
              <div className="contents lg:order-1 lg:flex lg:h-full lg:flex-col">
                <div className="order-1 lg:order-none">
                  <p className="tavern-eyebrow">La carta de juegos de mesa</p>
                  <h1 className="font-display mt-4 max-w-3xl text-5xl font-bold leading-[0.95] text-text-primary sm:text-6xl lg:text-7xl">
                    Encuentra tu próximo <span className="text-accent">juego de mesa</span>
                  </h1>
                  <p className="mt-6 max-w-2xl text-lg font-medium leading-relaxed text-text-secondary sm:text-xl">
                    Busca, compara y descubre qué sacar a mesa según tu grupo, tu tiempo y las
                    ludotecas de otros jugadores.
                  </p>
                  <div className="mt-8 max-w-2xl">
                    <GameSearch variant="hero" submitLabel="Buscar juegos" />
                  </div>
                  <HomeHeroAuthControls />
                </div>

                <div className="order-3 mt-10 lg:hidden lg:order-none xl:block">
                  <div className="mb-5">
                    <div className="flex items-center gap-4">
                      <p className="tavern-eyebrow flex items-center gap-1.5 text-accent">
                        <Beer size={13} className="text-accent" strokeWidth={2.5} />
                        Tablón de misiones del tabernero
                      </p>
                      <div className="h-px flex-1 bg-border-subtle" />
                    </div>
                    <h2 className="tavern-title mt-2.5 text-2xl text-text-primary">
                      Elige un contrato directo del tablón para empezar tu próxima partida
                    </h2>
                  </div>
                  
                  {/* Tablón de Misiones (Estilo Monster Hunter de Madera y Corcho) */}
                  <div className="relative rounded-2xl p-2.5 sm:p-4 quest-board-frame border border-[#3d2414] shadow-[0_16px_38px_rgba(0,0,0,0.32)]">
                    {/* Antique Brass Corner Brackets */}
                    {/* Top-Left */}
                    <div className="absolute top-0 left-0 w-10 h-10 z-20 pointer-events-none drop-shadow-md">
                      <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
                        <defs>
                          <linearGradient id="metal-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stopColor="#ffd57a" />
                            <stop offset="35%" stopColor="#a8884c" />
                            <stop offset="70%" stopColor="#7a5b29" />
                            <stop offset="100%" stopColor="#473211" />
                          </linearGradient>
                          <linearGradient id="rivet-grad" x1="0" y1="0" x2="5" y2="5" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stopColor="#fff" />
                            <stop offset="50%" stopColor="#d5b060" />
                            <stop offset="100%" stopColor="#4a3512" />
                          </linearGradient>
                        </defs>
                        <path d="M0 0 H36 V10 H10 V36 H0 Z" fill="url(#metal-grad)" stroke="#3e2414" strokeWidth="1.2" />
                        <circle cx="5" cy="20" r="2.2" fill="url(#rivet-grad)" stroke="#3e2414" strokeWidth="0.8" />
                        <circle cx="20" cy="5" r="2.2" fill="url(#rivet-grad)" stroke="#3e2414" strokeWidth="0.8" />
                      </svg>
                    </div>
                    
                    {/* Top-Right */}
                    <div className="absolute top-0 right-0 w-10 h-10 z-20 pointer-events-none drop-shadow-md rotate-90">
                      <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
                        <path d="M0 0 H36 V10 H10 V36 H0 Z" fill="url(#metal-grad)" stroke="#3e2414" strokeWidth="1.2" />
                        <circle cx="5" cy="20" r="2.2" fill="url(#rivet-grad)" stroke="#3e2414" strokeWidth="0.8" />
                        <circle cx="20" cy="5" r="2.2" fill="url(#rivet-grad)" stroke="#3e2414" strokeWidth="0.8" />
                      </svg>
                    </div>

                    {/* Bottom-Right */}
                    <div className="absolute bottom-0 right-0 w-10 h-10 z-20 pointer-events-none drop-shadow-md rotate-180">
                      <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
                        <path d="M0 0 H36 V10 H10 V36 H0 Z" fill="url(#metal-grad)" stroke="#3e2414" strokeWidth="1.2" />
                        <circle cx="5" cy="20" r="2.2" fill="url(#rivet-grad)" stroke="#3e2414" strokeWidth="0.8" />
                        <circle cx="20" cy="5" r="2.2" fill="url(#rivet-grad)" stroke="#3e2414" strokeWidth="0.8" />
                      </svg>
                    </div>

                    {/* Bottom-Left */}
                    <div className="absolute bottom-0 left-0 w-10 h-10 z-20 pointer-events-none drop-shadow-md -rotate-90">
                      <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
                        <path d="M0 0 H36 V10 H10 V36 H0 Z" fill="url(#metal-grad)" stroke="#3e2414" strokeWidth="1.2" />
                        <circle cx="5" cy="20" r="2.2" fill="url(#rivet-grad)" stroke="#3e2414" strokeWidth="0.8" />
                        <circle cx="20" cy="5" r="2.2" fill="url(#rivet-grad)" stroke="#3e2414" strokeWidth="0.8" />
                      </svg>
                    </div>

                    <style dangerouslySetInnerHTML={{ __html: `
                      .quest-board-frame {
                        background-color: #6a4228;
                        background-image: 
                          linear-gradient(180deg, rgba(255, 255, 255, 0.12), transparent 40%),
                          linear-gradient(0deg, rgba(0, 0, 0, 0.18), transparent 25%);
                      }
                      .quest-board-cork {
                        background-color: #be8f65;
                        background-image: linear-gradient(180deg, #be8f65, #b28359);
                      }
                      .quest-card {
                        transform: rotate(var(--card-rotation)) translateY(0);
                        transition: transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1), border-color 0.15s, box-shadow 0.22s;
                      }
                      .quest-card:hover {
                        transform: rotate(0deg) translateY(-4px) !important;
                        border-color: #d97706 !important;
                        box-shadow: 0 8px 18px rgba(0, 0, 0, 0.35) !important;
                      }
                    `}} />

                    {/* Inner Corkboard Container */}
                    <div className="quest-board-cork rounded-lg border border-[#3d2414]/70 p-2 sm:p-5 shadow-[inset_0_4px_10px_rgba(0,0,0,0.4)]">
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
                        {intentCards.map((card) => (
                          <IntentCard key={card.title} {...card} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <aside className="order-2 h-full lg:order-2 lg:flex flex-col justify-stretch">
                <CompatibilitySection
                  popularGames={compatibilityPopularGames.map((g) => ({
                    id: g.id,
                    name: g.title,
                    slug: g.slug,
                    imageUrl: g.coverImageUrl || null,
                    year: g.year,
                    playersMin: g.playersMin,
                    playersMax: g.playersMax,
                    durationMax: g.durationMax,
                    categories: g.categories,
                    mechanics: g.mechanics
                  }))}
                  featuredGames={featuredGames.map((game) => ({
                    slug: game.slug,
                    title: game.title,
                    coverImageUrl: game.coverImageUrl || null,
                    coverImageAlt: game.coverImageAlt || null,
                    reviewSummary: game.reviewSummary || "",
                    playersLabel: game.playersLabel || null,
                    playtime: game.playtime || null,
                    complexity: game.complexity || null,
                    ratingScore: getEffectiveRatingScore(game)
                  }))}
                />
              </aside>
            </div>

            {/* Tablón de misiones para tablet horizontal y pantallas intermedias (lg) */}
            <div className="relative z-10 mt-10 hidden lg:block xl:hidden">
              <div className="mb-5">
                <div className="flex items-center gap-4">
                  <p className="tavern-eyebrow flex items-center gap-1.5 text-accent">
                    <Beer size={13} className="text-accent" strokeWidth={2.5} />
                    Tablón de misiones del tabernero
                  </p>
                  <div className="h-px flex-1 bg-border-subtle" />
                </div>
                <h2 className="tavern-title mt-2.5 text-2xl text-text-primary">
                  Elige un contrato directo del tablón para empezar tu próxima partida
                </h2>
              </div>
              
              <div className="relative rounded-2xl p-2.5 sm:p-4 quest-board-frame border border-[#3d2414] shadow-[0_16px_38px_rgba(0,0,0,0.32)]">
                {/* Antique Brass Corner Brackets */}
                <div className="absolute top-0 left-0 w-10 h-10 z-20 pointer-events-none drop-shadow-md">
                  <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
                    <path d="M0 0 H36 V10 H10 V36 H0 Z" fill="url(#metal-grad)" stroke="#3e2414" strokeWidth="1.2" />
                    <circle cx="5" cy="20" r="2.2" fill="url(#rivet-grad)" stroke="#3e2414" strokeWidth="0.8" />
                    <circle cx="20" cy="5" r="2.2" fill="url(#rivet-grad)" stroke="#3e2414" strokeWidth="0.8" />
                  </svg>
                </div>
                <div className="absolute top-0 right-0 w-10 h-10 z-20 pointer-events-none drop-shadow-md rotate-90">
                  <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
                    <path d="M0 0 H36 V10 H10 V36 H0 Z" fill="url(#metal-grad)" stroke="#3e2414" strokeWidth="1.2" />
                    <circle cx="5" cy="20" r="2.2" fill="url(#rivet-grad)" stroke="#3e2414" strokeWidth="0.8" />
                    <circle cx="20" cy="5" r="2.2" fill="url(#rivet-grad)" stroke="#3e2414" strokeWidth="0.8" />
                  </svg>
                </div>
                <div className="absolute bottom-0 right-0 w-10 h-10 z-20 pointer-events-none drop-shadow-md rotate-180">
                  <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
                    <path d="M0 0 H36 V10 H10 V36 H0 Z" fill="url(#metal-grad)" stroke="#3e2414" strokeWidth="1.2" />
                    <circle cx="5" cy="20" r="2.2" fill="url(#rivet-grad)" stroke="#3e2414" strokeWidth="0.8" />
                    <circle cx="20" cy="5" r="2.2" fill="url(#rivet-grad)" stroke="#3e2414" strokeWidth="0.8" />
                  </svg>
                </div>
                <div className="absolute bottom-0 left-0 w-10 h-10 z-20 pointer-events-none drop-shadow-md -rotate-90">
                  <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
                    <path d="M0 0 H36 V10 H10 V36 H0 Z" fill="url(#metal-grad)" stroke="#3e2414" strokeWidth="1.2" />
                    <circle cx="5" cy="20" r="2.2" fill="url(#rivet-grad)" stroke="#3e2414" strokeWidth="0.8" />
                    <circle cx="20" cy="5" r="2.2" fill="url(#rivet-grad)" stroke="#3e2414" strokeWidth="0.8" />
                  </svg>
                </div>

                {/* Inner Corkboard Container */}
                <div className="quest-board-cork rounded-lg border border-[#3d2414]/70 p-2 sm:p-5 shadow-[inset_0_4px_10px_rgba(0,0,0,0.4)]">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
                    {intentCards.map((card) => (
                      <IntentCard key={card.title} {...card} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container-page py-7 lg:py-8" aria-labelledby="home-tavern-pulse-title">
          <div className="overflow-hidden rounded-lg border border-border-subtle bg-gradient-to-br from-paper to-surface-muted shadow-soft">
            <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="p-5 sm:p-6">
                <p className="tavern-eyebrow">La comunidad está abierta</p>
                <h2 id="home-tavern-pulse-title" className="tavern-title mt-2 text-3xl sm:text-4xl text-text-primary">
                  Tu próxima partida empieza en la comunidad
                </h2>
                <p className="tavern-copy mt-3">
                  Guarda ideas para después, recupera tu ludoteca cuando toque jugar y descubre qué
                  tienen otros jugadores antes de montar la próxima partida.
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {siteStats ? (
                    <>
                      <HomePulseStat
                        icon={LibraryBig}
                        value={siteStats.publishedGames}
                        label="Fichas"
                        description="juegos publicados para explorar"
                      />
                      <HomePulseStat
                        icon={BookOpenText}
                        value={siteStats.approvedReviews}
                        label="Reseñas"
                        description="lecturas con criterio de mesa"
                      />
                      <HomePulseStat
                        icon={Users}
                        value={siteStats.publicProfiles}
                        label="Taberneros"
                        description="perfiles públicos en la comunidad"
                      />
                    </>
                  ) : null}
                </div>

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
              <aside className="border-t border-border-subtle bg-surface-dark p-5 text-white lg:border-l lg:border-t-0 sm:p-6">
                <HomeSidebarAuthControls />
                <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.05] p-3">
                  <p className="tavern-eyebrow">Para empezar</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-text-on-dark-muted">
                    Menos rankings sueltos, más mesas reales y ludotecas con contexto.
                  </p>
                </div>
              </aside>
            </div>
          </div>
        </section>

        <section id="recomendaciones" className="border-y border-border-subtle bg-paper/70 py-9 lg:py-12">
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

        <section className="border-t border-border-subtle bg-surface-base py-8 lg:py-10">
          <div className="container-page">
            <div className={`grid gap-6 ${showRatingsSection ? "xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]" : ""}`}>
              {showRatingsSection ? (
                <div className="min-w-0">
                  <SectionHeader
                    eyebrow="Valoraciones con contexto"
                    title="Juegos mejor valorados por ahora"
                    description="Una lectura rápida de lo que mejor está funcionando ahora mismo en la comunidad."
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
    description: "Guarda los juegos que no quieres perder: favoritos, pendientes, jugados y próximos.",
    icon: User,
    href: "/mi-perfil",
    action: "Ver mi rincón"
  },
  {
    title: "Otros taberneros",
    description: "Explora perfiles públicos, descubre colecciones reales y encuentra jugadores con gustos parecidos.",
    icon: Users,
    href: "/comunidad",
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

async function safePublicData<T>(label: string, loader: () => Promise<T>, fallback: T) {
  try {
    return await loader();
  } catch (error) {
    console.error(`[public-data] ${label} unavailable`, error);
    return fallback;
  }
}

function HomeStatsStrip({ stats }: { stats: PublicSiteStats | null }) {
  if (!stats) return null;
  const items = buildStatsStripItems(stats);

  return (
    <section className="border-y border-ember/20 bg-[#20120c] text-parchment" aria-label="MeepleTavern en cifras">
      <div className="container-page">
        <div className="scrollbar-hide flex min-h-10 items-center gap-5 overflow-x-auto py-2 text-[10px] font-black uppercase tracking-[0.14em] sm:text-[11px]">
          {items.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              prefetch={false}
              className="group inline-flex shrink-0 items-center gap-2 text-parchment/78 transition hover:text-white"
            >
              <span className={`h-2 w-2 rounded-full ${item.dotClass}`} aria-hidden="true" />
              <span className="sm:hidden">{item.shortLabel}</span>
              <span className="hidden sm:inline">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function HomePulseStat({
  icon: Icon,
  value,
  label,
  description
}: {
  icon: LucideIcon;
  value: number;
  label: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-border-subtle bg-paper/70 p-3 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-subtle text-accent">
          <Icon size={17} strokeWidth={2.2} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="font-display text-2xl font-bold leading-none text-text-primary">{value}</p>
          <p className="mt-1 text-micro font-bold uppercase leading-tight tracking-eyebrow text-text-tertiary">
            {label}
          </p>
        </div>
      </div>
      <p className="mt-2 line-clamp-2 text-xs font-semibold leading-5 text-text-secondary">{description}</p>
    </div>
  );
}

function buildStatsStripItems(stats: PublicSiteStats) {
  return [
    {
      label: `${formatCount(stats.publishedGames)} fichas añadidas`,
      shortLabel: `${formatCount(stats.publishedGames)} fichas`,
      href: "/juegos",
      dotClass: "bg-accent"
    },
    {
      label: `${formatCount(stats.approvedReviews)} reseñas publicadas`,
      shortLabel: `${formatCount(stats.approvedReviews)} reseñas`,
      href: "/resenas",
      dotClass: "bg-action"
    },
    {
      label: `${formatCount(stats.publicProfiles)} taberneros`,
      shortLabel: `${formatCount(stats.publicProfiles)} taberneros`,
      href: "/comunidad",
      dotClass: "bg-border-default"
    }
  ];
}

function formatCount(value: number) {
  return new Intl.NumberFormat("es-ES").format(value);
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
  // Generar una inclinación orgánica determinista basada en el título del contrato (-0.6deg a 0.6deg)
  const rotation = ((title.charCodeAt(0) + title.charCodeAt(title.length - 1)) % 5) * 0.3 - 0.6;
  const cardClassName =
    "quest-card relative group flex w-full items-center gap-2 sm:gap-3 bg-gradient-to-br from-paper to-surface-muted/30 p-2 sm:p-3.5 border border-border-subtle shadow-[0_4px_10px_rgba(44,24,16,0.08)] rounded-lg select-none text-left transition-all duration-300 hover:scale-[1.02] hover:bg-white";
  const cardStyle = {
    "--card-rotation": `${rotation}deg`
  } as React.CSSProperties;
  const content = (
    <>
      {/* Chincheta de Latón Grande en el centro superior */}
      <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-gradient-to-br from-accent-light via-accent to-accent-hover border border-accent-hover/40 shadow-[0_2px_4px_rgba(0,0,0,0.35)] z-20 flex items-center justify-center">
        <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-tl from-white/70 to-white/0 absolute top-0.5 left-0.5" />
      </span>

      {/* Sello Cuadrado Suave del Gremio */}
      <span className="inline-flex h-8 w-8 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-lg bg-accent-subtle text-accent transition-all duration-300 group-hover:scale-105 group-hover:bg-accent-subtle/50 group-hover:text-action">
        <Icon strokeWidth={2.2} className="w-[16px] h-[16px] sm:w-[20px] sm:h-[20px] opacity-95" />
      </span>

      <div className="min-w-0 pr-0 sm:pr-1 text-left">
        <h3 className="font-display text-[12px] sm:text-[15px] font-bold text-text-primary leading-tight group-hover:text-action transition-colors break-normal">
          {title}
        </h3>
        <p className="mt-0.5 sm:mt-1.5 text-[10px] sm:text-[11px] font-semibold leading-normal sm:leading-4 text-text-secondary">
          {description}
        </p>
      </div>
    </>
  );

  if (href.startsWith("/juegos?")) {
    const params = new URLSearchParams(href.slice(href.indexOf("?") + 1));

    return (
      <form action="/juegos" method="get" className="contents">
        {Array.from(params.entries()).map(([name, value], index) => (
          <input key={`${name}-${value}-${index}`} type="hidden" name={name} value={value} />
        ))}
        <button type="submit" className={cardClassName} style={cardStyle}>
          {content}
        </button>
      </form>
    );
  }

  return (
    <Link
      href={href}
      prefetch={false}
      className={cardClassName}
      style={cardStyle}
    >
      {content}
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
      prefetch={false}
      className="group rounded-lg border border-border-subtle bg-gradient-to-br from-paper to-surface-muted/30 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-accent/40 hover:from-white hover:to-paper"
    >
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-accent-subtle text-accent">
        <Icon size={20} strokeWidth={2.1} absoluteStrokeWidth />
      </span>
      <h3 className="font-display mt-3 text-xl font-bold text-text-primary transition group-hover:text-action">{title}</h3>
      <p className="mt-2 text-sm font-semibold leading-6 text-text-secondary">{description}</p>
      <p className="mt-4 text-xs font-bold uppercase tracking-eyebrow text-accent">{action}</p>
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
      <h3 className="tavern-title text-2xl text-text-primary">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-text-secondary">{description}</p>
      <Link href={href} prefetch={false} className="mt-5 inline-flex text-sm font-bold text-action transition hover:text-action-hover">
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
  if (match && !Object.keys(extraFilters).length) {
    return `/categorias/${slugify(match)}`;
  }

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
