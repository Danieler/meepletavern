import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Brain, Clock3, House, Shield, Users, Users2 } from "lucide-react";
import { BrandIcon } from "@/components/BrandIcon";
import { GameCard } from "@/components/GameCard";
import { GameSearch } from "@/components/GameSearch";
import { PublicShell } from "@/components/PublicShell";
import { RankingList } from "@/components/RankingList";
import { ReviewCard } from "@/components/ReviewCard";
import { SectionHeader } from "@/components/SectionHeader";
import { SEOTextBlock } from "@/components/SEOTextBlock";
import {
  getBeginnerGames,
  getCategoryTerms,
  getEffectiveRatingScore,
  getNewGames,
  getPopularGames,
  getReviews,
  termHref,
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

export const revalidate = 300;

export default async function Home() {
  const [popularGames, reviews, beginnerGames, newGames, categoryTerms] = await Promise.all([
    getPopularGames(6),
    getReviews(),
    getBeginnerGames(4),
    getNewGames(4),
    getCategoryTerms()
  ]);

  const latestReviews = reviews.slice(0, 3);
  const ratedGames = popularGames.filter((game) => typeof getEffectiveRatingScore(game) === "number");
  const showRatingsSection = ratedGames.length >= 3;
  const editorsPick = ratedGames[0] || popularGames[0] || beginnerGames[0] || null;
  const editorsPickScore = editorsPick ? getEffectiveRatingScore(editorsPick) : null;
  const featuredGames = dedupeGames([
    ...(editorsPick ? [editorsPick] : []),
    ...beginnerGames,
    ...popularGames
  ]).slice(0, 6);
  const featuredCategories = pickFeaturedCategories(categoryTerms).slice(0, 6);
  const heroLinks = buildHeroLinks(categoryTerms);
  const intentCards = buildIntentCards(categoryTerms);

  return (
    <PublicShell>
      <main>
        <section className="container-page pt-5">
          <div className="tavern-panel relative min-h-[500px] overflow-hidden p-5 sm:p-8 lg:p-10">
            <Image
              src="/design-assets/home-background.png"
              alt="Mesa de juegos de mesa con cartas, dados y meeples"
              fill
              priority
              sizes="100vw"
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(247,241,230,0.97),rgba(247,241,230,0.88)_46%,rgba(59,33,22,0.24)_100%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(255,251,243,0.65),transparent_34%)]" />

            <div className="relative z-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-center">
              <div className="flex flex-col justify-center py-3 lg:py-8">
                <p className="tavern-eyebrow">Recomendaciones de juegos de mesa</p>
                <h1 className="font-display mt-3 max-w-3xl text-4xl font-bold leading-[0.98] text-wood sm:text-5xl lg:text-6xl">
                  Encuentra tu próximo juego de mesa
                </h1>
                <p className="mt-5 max-w-2xl text-lg font-medium leading-8 text-walnut/80">
                  Busca, compara y descubre juegos según tu grupo, tiempo y estilo de partida.
                </p>
                <div className="mt-7 max-w-3xl">
                  <GameSearch variant="hero" submitLabel="Buscar juegos" />
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link href="#recomendaciones" className="button-secondary">
                    Ver recomendaciones
                  </Link>
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-2 text-xs font-extrabold leading-5 text-walnut">
                  <span>Explora rápido:</span>
                  {heroLinks.map((chip) => (
                    <Link
                      key={chip.label}
                      href={chip.href}
                      className="tavern-pill transition hover:border-ember/40 hover:bg-white hover:text-wood"
                    >
                      {chip.label}
                    </Link>
                  ))}
                </div>
              </div>

              <aside className="relative z-10 self-center lg:justify-self-end">
                {editorsPick ? (
                  <Link
                    href={`/juegos/${editorsPick.slug}`}
                    className="tavern-card block overflow-hidden transition hover:-translate-y-0.5 hover:border-ember/45"
                  >
                    <div className="relative h-11 bg-ember text-center font-display text-lg font-bold uppercase leading-[44px] text-white">
                      Empieza por aqui
                    </div>
                    <div className="relative h-32">
                      <img
                        src={editorsPick.coverImageUrl || siteConfig.markImage}
                        alt={editorsPick.coverImageAlt || editorsPick.title}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="p-5">
                      <p className="tavern-eyebrow">Recomendacion destacada</p>
                      <h2 className="font-display mt-2 text-2xl font-bold leading-tight text-wood">
                        {editorsPick.title}
                      </h2>
                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-walnut/80">
                        {editorsPick.reviewSummary}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-3 text-xs font-bold text-walnut/75">
                        <span className="inline-flex items-center gap-1">
                          <BrandIcon name="users" size={15} />
                          {editorsPick.playersLabel || "Jugadores"}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <BrandIcon name="clock" size={15} />
                          {editorsPick.playtime || "Duracion"}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <BrandIcon name="gauge" size={15} />
                          {editorsPick.complexity || "Peso"}
                        </span>
                      </div>
                      <div className="mt-5 flex items-center justify-between gap-3 border-t border-walnut/10 pt-4">
                        {typeof editorsPickScore === "number" ? (
                          <span className="rating-chip">
                            <BrandIcon name="star" size={14} />
                            {editorsPickScore.toFixed(1)}
                          </span>
                        ) : (
                          <span className="tavern-meta">Seleccion editorial</span>
                        )}
                        <span className="text-sm font-extrabold text-ember">Ver ficha</span>
                      </div>
                    </div>
                  </Link>
                ) : (
                  <EmptyStatePanel
                    title="Empieza explorando"
                    description="Usa el buscador para encontrar juegos por jugadores, duracion o categoria desde la primera visita."
                    href="/juegos"
                    linkLabel="Ir al catalogo"
                  />
                )}
              </aside>
            </div>
          </div>
        </section>

        <section className="container-page py-10 lg:py-12">
          <SectionHeader
            eyebrow="Exploracion guiada"
            title="Que quieres jugar hoy?"
            description="Accesos directos pensados para situaciones reales: pareja, familia, cooperativos, partidas rapidas, grupos grandes o mesas mas exigentes."
          />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {intentCards.map((card) => (
              <IntentCard key={card.title} {...card} />
            ))}
          </div>
        </section>

        <section id="recomendaciones" className="border-y border-walnut/15 bg-[#fffaf0]/70 py-12 lg:py-16">
          <div className="container-page">
            <SectionHeader
              eyebrow="Juegos recomendados"
              title="Recomendaciones destacadas para encontrar mesa rapido"
              description="Una seleccion pensada para comparar juegos de mesa por sensaciones, duracion, dificultad y numero de jugadores sin perder tiempo."
            />
            {featuredGames.length ? (
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {featuredGames.map((game) => (
                  <GameCard key={game.slug} game={game} />
                ))}
              </div>
            ) : (
              <EmptyStatePanel
                title="Estamos preparando mas recomendaciones"
                description="Mientras tanto, puedes usar el catalogo para explorar juegos por categoria, mecanica o tipo de grupo."
                href="/juegos"
                linkLabel="Explorar el catalogo"
              />
            )}
          </div>
        </section>

        {showRatingsSection ? (
          <section className="container-page py-12 lg:py-16">
            <SectionHeader
              eyebrow="Valoraciones con contexto"
              title="Juegos mejor valorados por ahora"
              description="Mostramos esta seleccion solo cuando hay senal suficiente para que la comparacion resulte realmente util."
            />
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
              <RankingList games={ratedGames.slice(0, 5)} />
              <div className="tavern-card p-5">
                <p className="tavern-eyebrow">Lectura rapida</p>
                <h3 className="font-display mt-2 text-2xl font-bold text-wood">
                  Prioriza lo que encaja con tu mesa
                </h3>
                <p className="mt-3 text-sm leading-6 text-walnut/80">
                  Una nota alta ayuda, pero en MeepleTavern tambien importa si el juego funciona
                  con tu grupo, el tiempo que tienes y el tipo de experiencia que buscas.
                </p>
                <div className="mt-5 grid gap-3 text-sm font-semibold text-walnut/75">
                  <span className="inline-flex items-center gap-2">
                    <BrandIcon name="users" size={16} />
                    Compara numero de jugadores y rango ideal.
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <BrandIcon name="clock" size={16} />
                    Filtra por partidas cortas, medias o largas.
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <BrandIcon name="gauge" size={16} />
                    Evita pesos que no encajan con la mesa de hoy.
                  </span>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <section className="container-page py-12 lg:py-16">
          <SectionHeader
            eyebrow="Ultimas resenas"
            title="Resenas recientes para decidir mejor"
            description="Articulos en espanol centrados en lo que mas suele importar antes de comprar, recomendar o sacar un juego a mesa."
          />
          {latestReviews.length ? (
            <div className="grid gap-5 lg:grid-cols-3">
              {latestReviews.map((review) => (
                <ReviewCard key={review.slug} review={review} compact />
              ))}
            </div>
          ) : (
            <EmptyStatePanel
              title="Las resenas nuevas estan en camino"
              description="Por ahora puedes explorar las fichas publicadas y volver pronto para ver analisis mas en profundidad."
              href="/resenas"
              linkLabel="Ver archivo de resenas"
            />
          )}
        </section>

        <section className="container-page pb-12 lg:pb-16">
          <div className="tavern-panel overflow-hidden p-6 sm:p-7 lg:p-8">
            <SectionHeader
              eyebrow="Por que usar MeepleTavern"
              title="Menos ruido, mas contexto para elegir bien"
              description="La idea no es ensenarte un catalogo infinito, sino ayudarte a decidir antes que juego encaja contigo y con tu grupo."
            />
            <div className="grid gap-4 md:grid-cols-3">
              {VALUE_POINTS.map((item) => (
                <article key={item.title} className="surface-muted p-5">
                  <h3 className="font-display text-xl font-bold text-wood">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-walnut/80">{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="container-page py-12 lg:py-16">
          <SectionHeader
            eyebrow="Explora por categorias"
            title="Atajos para seguir descubriendo juegos de mesa"
            description="Navega por categorias reales del archivo para encontrar juegos familiares, cooperativos, estrategicos o pensados para perfiles concretos."
          />
          {featuredCategories.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {featuredCategories.map((term) => (
                <Link
                  key={term}
                  href={termHref("category", term)}
                  className="tavern-card block p-5 transition hover:-translate-y-0.5 hover:border-ember/35"
                >
                  <p className="tavern-eyebrow">Categoria</p>
                  <h3 className="font-display mt-2 text-2xl font-bold text-wood">{term}</h3>
                  <p className="mt-3 text-sm leading-6 text-walnut/80">{describeCategory(term)}</p>
                  <p className="mt-5 text-sm font-extrabold text-ember">Ver juegos</p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <QuickLink href="/categorias" title="Categorias" icon="crown" />
              <QuickLink href="/mecanicas" title="Mecanicas" icon="settings" />
              <QuickLink href="/tematicas" title="Tematicas" icon="tag" />
              <QuickLink href="/juegos" title="Catalogo completo" icon="grid" />
            </div>
          )}
        </section>

        <section className="border-t border-walnut/15 bg-parchment py-12 lg:py-16">
          <div className="container-page">
            <SectionHeader
              eyebrow="Nuevas fichas"
              title="Juegos recien anadidos"
              description="Entradas recientes del archivo para seguir ampliando opciones sin saturar la home."
            />
            {newGames.length ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {newGames.map((game) => (
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

        <section className="container-page py-12 lg:py-16">
          <SEOTextBlock title="Recomendaciones de juegos de mesa en espanol">
            <p>
              MeepleTavern organiza fichas, resenas y recomendaciones de juegos de mesa para que
              sea mas facil encontrar que jugar segun el grupo, la duracion disponible y el tipo de
              experiencia que apetece. Si buscas juegos de mesa familiares, cooperativos, para 2
              jugadores o nuevas ideas para tu mesa, esta home esta pensada para llevarte rapido al
              siguiente paso.
            </p>
          </SEOTextBlock>
        </section>
      </main>
    </PublicShell>
  );
}

const VALUE_POINTS = [
  {
    title: "Decide mas rapido",
    description:
      "Resumen claro de jugadores, duracion, dificultad y tipo de experiencia para comparar sin leer veinte fichas."
  },
  {
    title: "Encuentra juegos para tu grupo",
    description:
      "Filtra segun con quien juegas y cuanto tiempo tienes para aterrizar opciones que si encajan con la sesion."
  },
  {
    title: "Compara antes de comprar",
    description:
      "Consulta fichas, resenas, valoraciones y alternativas similares antes de comprometer una compra o una recomendacion."
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
      className="tavern-card group block p-5 transition hover:-translate-y-0.5 hover:border-ember/40"
    >
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-md bg-ember/10 text-ember transition group-hover:bg-ember/15">
        <Icon size={22} strokeWidth={2.1} absoluteStrokeWidth />
      </span>
      <h3 className="font-display mt-4 text-2xl font-bold text-wood">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-walnut/80">{description}</p>
      <p className="mt-5 text-sm font-extrabold text-ember">Explorar juegos</p>
    </Link>
  );
}

function QuickLink({
  href,
  title,
  icon
}: {
  href: string;
  title: string;
  icon: "crown" | "grid" | "settings" | "tag";
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-md border border-walnut/15 bg-[#fffaf0]/75 p-4 font-bold text-walnut shadow-sm transition hover:border-ember hover:text-wood"
    >
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-ember/10">
        <BrandIcon name={icon} size={22} />
      </span>
      {title}
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

function buildHeroLinks(categoryTerms: string[]) {
  return [
    { label: "Para 2 jugadores", href: buildCatalogHref({ players: "2" }) },
    {
      label: "Familiares",
      href: getCategoryMatchHref(categoryTerms, ["familiar"], { q: "familiar" })
    },
    {
      label: "Cooperativos",
      href: getCategoryMatchHref(categoryTerms, ["cooperativo"], { q: "cooperativo" })
    },
    { label: "Partidas rapidas", href: buildCatalogHref({ duration: "45" }) },
    { label: "Miniaturas", href: buildCatalogHref({ q: "miniaturas" }) },
    {
      label: "Para principiantes",
      href: getCategoryMatchHref(categoryTerms, ["gateway", "familiar"], { q: "principiantes" })
    }
  ];
}

function buildIntentCards(categoryTerms: string[]) {
  return [
    {
      title: "Juego para 2",
      description: "Perfectos para pareja o partidas mano a mano.",
      href: buildCatalogHref({ players: "2" }),
      icon: Users2
    },
    {
      title: "Para jugar en familia",
      description: "Faciles de explicar y buenos para todos.",
      href: getCategoryMatchHref(categoryTerms, ["familiar"], { q: "familiar" }),
      icon: House
    },
    {
      title: "Cooperativos",
      description: "Gana o pierde en equipo.",
      href: getCategoryMatchHref(categoryTerms, ["cooperativo"], { q: "cooperativo" }),
      icon: Shield
    },
    {
      title: "Partidas rapidas",
      description: "Juegos de menos de 30-45 minutos.",
      href: buildCatalogHref({ duration: "45" }),
      icon: Clock3
    },
    {
      title: "Para grupos grandes",
      description: "Ideales para reuniones y risas.",
      href: buildCatalogHref({ players: "6" }),
      icon: Users
    },
    {
      title: "Para jugones",
      description: "Mas estrategia, mas profundidad.",
      href: buildCatalogHref({ weight: "duro" }),
      icon: Brain
    }
  ];
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

function appendQueryValues(params: URLSearchParams, key: string, value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    for (const entry of value) {
      if (entry) {
        params.append(key, entry);
      }
    }
    return;
  }

  if (value) {
    params.set(key, value);
  }
}

function pickFeaturedCategories(terms: string[]) {
  const preferredOrder = [
    "familiar",
    "cooperativo",
    "gateway",
    "estrategia",
    "party",
    "aventur",
    "campa",
    "cartas"
  ];
  const uniqueTerms = [...new Set(terms)];
  const prioritized: string[] = [];

  for (const needle of preferredOrder) {
    const match = uniqueTerms.find((term) => term.toLowerCase().includes(needle));
    if (match && !prioritized.includes(match)) {
      prioritized.push(match);
    }
  }

  for (const term of uniqueTerms) {
    if (!prioritized.includes(term)) {
      prioritized.push(term);
    }
  }

  return prioritized;
}

function describeCategory(term: string) {
  const normalized = term.toLowerCase();

  if (normalized.includes("familiar")) {
    return "Juegos de mesa familiares con reglas claras y buen encaje para mesas mixtas.";
  }

  if (normalized.includes("cooperativo")) {
    return "Propuestas para coordinarse, compartir decisiones y superar la partida en equipo.";
  }

  if (normalized.includes("gateway")) {
    return "Buenas puertas de entrada para nuevos jugadores que quieren aprender sin friccion.";
  }

  if (normalized.includes("party")) {
    return "Opciones ligeras y sociales para grupos grandes, risas y explicaciones cortas.";
  }

  if (normalized.includes("estrateg")) {
    return "Juegos con mas decisiones, planificacion y profundidad para quienes disfrutan optimizando.";
  }

  return `Explora juegos de mesa de la categoria ${term} y compara duracion, jugadores y sensaciones antes de elegir.`;
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
