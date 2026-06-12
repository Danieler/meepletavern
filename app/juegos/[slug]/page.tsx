import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChevronRight } from "lucide-react";
import { BrandIcon, type BrandIconName } from "@/components/BrandIcon";
import { BuyLinks } from "@/components/BuyLinks";
import { CategoryTag } from "@/components/CategoryTag";
import { GameCard } from "@/components/GameCard";
import { GameCoverImage } from "@/components/GameCoverImage";
import { GameLibraryPanel } from "@/components/GameLibraryPanel";
import { GameStats } from "@/components/GameStats";
import { GameRatings } from "@/components/GameRatings";
import { MechanicTag } from "@/components/MechanicTag";
import { ProsCons } from "@/components/ProsCons";
import { PublicShell } from "@/components/PublicShell";
import { SectionHeader } from "@/components/SectionHeader";
import { SEOTextBlock } from "@/components/SEOTextBlock";
import { getGameBySlug, getRelatedGames, termHref, type CatalogGame } from "@/lib/catalog";
import { hasVerifiedCoverImage } from "@/lib/gameImages";
import { siteConfig } from "@/lib/site";

type GamePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: GamePageProps): Promise<Metadata> {
  const { slug } = await params;
  const game = await getGameBySlug(slug);

  if (!game) {
    return {
      title: "Juego no encontrado",
      robots: { index: false, follow: false }
    };
  }

  const title = `${game.title}: ficha, duración y jugadores`;
  const description = `${game.title} en MeepleTavern: jugadores, duración, dificultad, resumen editorial, pros, contras, categorías, mecánicas y juegos parecidos.`;

  return {
    title,
    description,
    alternates: {
      canonical: `${siteConfig.url}/juegos/${game.slug}`
    },
    openGraph: {
      title,
      description,
      type: "article",
      url: `${siteConfig.url}/juegos/${game.slug}`,
      images: hasVerifiedCoverImage(game) && game.coverImageUrl ? [{ url: game.coverImageUrl, alt: game.coverImageAlt }] : []
    }
  };
}

export const revalidate = 300;

export default async function GamePage({ params }: GamePageProps) {
  const { slug } = await params;
  const game = await getGameBySlug(slug);

  if (!game) {
    notFound();
  }

  const jsonLd = buildJsonLd(game);
  const hasRichEditorialTags = game.mechanics.length > 0 || game.themes.length > 0;
  const shouldShowCategories = game.categories.length > 0 && !hasRichEditorialTags;

  return (
    <PublicShell>
      <main>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <section className="wood-surface border-b border-ember/30 text-white">
          <div className="container-page py-6">
            <nav className="flex flex-wrap items-center gap-2 text-sm text-white/70" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-white">
                Inicio
              </Link>
              <ChevronRight size={15} aria-hidden="true" />
              <Link href="/juegos" className="hover:text-white">
                Juegos
              </Link>
              <ChevronRight size={15} aria-hidden="true" />
              <span>{game.title}</span>
            </nav>
            <div className="grid gap-8 py-8 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-ember">Ficha de juego</p>
                <h1 className="font-display mt-3 text-5xl font-black text-white sm:text-7xl">{game.title}</h1>
                <p className="mt-3 text-sm font-semibold text-parchment/70">
                  {[game.playersLabel, game.playtime, game.complexity].filter(Boolean).join(" · ")}
                </p>
                {game.reviewSummary ? (
                  <p className="mt-5 max-w-3xl text-lg leading-8 text-parchment/80">{game.reviewSummary}</p>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section className="container-page -mt-6 pb-14">
          <div className="tavern-panel grid gap-6 p-4 sm:p-6 lg:grid-cols-[380px_minmax(0,1fr)_360px]">
            <aside className="space-y-5">
              <GameCoverImage {...game} gameTitle={game.title} variant="detail" priority className="border border-walnut/20 shadow-tavern" />
              <GameLibraryPanel gameId={game.id} />
              <Link className="button-secondary w-full justify-start" href={`/juegos/${game.slug}/resena`}>
                <BrandIcon name="document" size={20} />
                Escribir una reseña
              </Link>
              <CommunityScore game={game} />
            </aside>

            <article className="space-y-7">
              <div className="grid gap-5 lg:grid-cols-[1fr_auto]">
                <div>
                  <p className="text-sm font-bold text-walnut">
                    {[game.publishedAt ? new Date(game.publishedAt).getFullYear() : null, game.categories[0]].filter(Boolean).join(" · ")}
                  </p>
                  <h2 className="font-display mt-2 text-5xl font-black text-wood">{game.title}</h2>
                  {game.description ? (
                    <p className="mt-5 max-w-3xl text-base leading-8 text-ink">{game.description}</p>
                  ) : null}
                </div>
                {game.ratings.external?.score ? (
                  <div className="flex min-w-40 flex-col items-center justify-center rounded-[18px] border-4 border-ember bg-walnut p-5 text-center text-white shadow-tavern">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-parchment">Valoración general</p>
                    <p className="font-display text-6xl font-black">{game.ratings.external.score.toFixed(1)}</p>
                    <p className="font-display text-lg font-black text-ember">{game.ratings.external.label}</p>
                    <BrandIcon name="star" size={26} className="mt-2" />
                  </div>
                ) : null}
              </div>

              <GameStats game={game} />

              {shouldShowCategories || game.mechanics.length || game.themes.length ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {shouldShowCategories ? (
                    <TagSection title="Categorías">
                      {game.categories.map((category) => (
                        <CategoryTag key={category} value={category} />
                      ))}
                    </TagSection>
                  ) : null}
                  {game.mechanics.length ? (
                    <TagSection title="Mecánicas">
                      {game.mechanics.map((mechanic) => (
                        <MechanicTag key={mechanic} value={mechanic} />
                      ))}
                    </TagSection>
                  ) : null}
                  {game.themes.length ? (
                    <TagSection title="Temáticas">
                      {game.themes.map((theme) => (
                        <Link
                          key={theme}
                          href={termHref("theme", theme)}
                          className="tavern-pill transition hover:border-ember"
                        >
                          {theme}
                        </Link>
                      ))}
                    </TagSection>
                  ) : null}
                </div>
              ) : null}

              <div className="wood-surface grid overflow-hidden rounded-md border border-ember/30 text-sm font-black uppercase tracking-wide text-parchment sm:grid-cols-4">
                {["Resumen", "Reseña", "Detalles", "Juegos relacionados"].map((label, index) => (
                  <span key={label} className={`border-ember/20 px-4 py-4 text-center ${index ? "sm:border-l" : "text-ember"}`}>
                    {label}
                  </span>
                ))}
              </div>

            {game.description ? (
              <section className="tavern-card p-6">
                <h2 className="font-display text-2xl font-black text-wood">Resumen de la reseña</h2>
                <p className="mt-4 text-base leading-8 text-walnut/80">{game.description}</p>
              </section>
            ) : null}

            {game.pros.length || game.cons.length ? <ProsCons pros={game.pros} cons={game.cons} /> : null}

            {game.recommendedFor || game.notRecommendedFor ? (
              <div className="grid gap-4 md:grid-cols-2">
                {game.recommendedFor ? <TextPanel title="Para quién es este juego" body={game.recommendedFor} /> : null}
                {game.notRecommendedFor ? <TextPanel title="Para quién no es" body={game.notRecommendedFor} /> : null}
              </div>
            ) : null}

            </article>

            <aside className="space-y-5">
              <GameRatings game={game} compact />
              {game.buyLinks.length ? (
                <Panel title="Enlaces de compra">
                  <BuyLinks links={game.buyLinks} />
                </Panel>
              ) : null}
              <GalleryPreview game={game} />
              <Suspense fallback={null}>
                <RelatedGamesPanel game={game} />
              </Suspense>
            </aside>
          </div>
        </section>

        <section className="container-page pb-14">
          <SEOTextBlock title={`${game.title}: opinión, duración y juegos parecidos`}>
            <p>
              Esta ficha está preparada para responder búsquedas habituales sobre {game.title}:
              número de jugadores, duración aproximada, dificultad, si merece la pena, categorías,
              mecánicas y alternativas con sensaciones parecidas.
            </p>
          </SEOTextBlock>
        </section>
      </main>
    </PublicShell>
  );
}

async function RelatedGamesPanel({ game }: { game: CatalogGame }) {
  const relatedGames = await getRelatedGames(game);

  if (!relatedGames.length) {
    return null;
  }

  return (
    <Panel title="Juegos parecidos">
      <div className="grid gap-3">
        {relatedGames.map((related) => (
          <GameCard key={related.slug} game={related} compact />
        ))}
      </div>
    </Panel>
  );
}

function Panel({ title, children, wood = false }: { title: string; children: React.ReactNode; wood?: boolean }) {
  return (
    <section className={`${wood ? "wood-surface text-white" : "tavern-card"} rounded-md p-5`}>
      <h2 className={`font-display text-lg font-black ${wood ? "text-white" : "text-wood"}`}>{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function TextPanel({ title, body }: { title: string; body: string }) {
  return (
    <section className="tavern-card p-5">
      <h2 className="font-display text-xl font-black text-wood">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-walnut/80">{body}</p>
    </section>
  );
}

function TagSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-r border-walnut/15 pr-4 last:border-r-0">
      <h3 className="text-sm font-black uppercase tracking-wide text-walnut/60">{title}</h3>
      <div className="mt-3 flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function MiniMetric({
  icon,
  label,
  value
}: {
  icon: BrandIconName;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md bg-ink/5 p-3">
      <BrandIcon name={icon} size={24} />
      <p className="mt-2 text-xs font-bold uppercase text-ink/45">{label}</p>
      <p className="text-lg font-black text-ink">{value}</p>
    </div>
  );
}

function CommunityScore({ game }: { game: CatalogGame }) {
  const score = game.ratings.external?.score;

  return (
    <Panel title="Valoración de la comunidad">
      <div className="flex items-center gap-5">
        <div className="flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-full border-4 border-ember bg-walnut font-display font-black text-white">
          <span className="text-4xl">{score ? score.toFixed(1) : "MT"}</span>
          <span className="text-xs text-ember">{game.ratings.external?.label || "Nota"}</span>
        </div>
        <div className="grid flex-1 gap-2">
          {[5, 4, 3, 2, 1].map((value) => (
            <div key={value} className="grid grid-cols-[18px_1fr_34px] items-center gap-2 text-xs font-bold text-walnut">
              <span>{value}</span>
              <span className="h-2 overflow-hidden rounded-full bg-walnut/12">
                <span className="block h-full rounded-full bg-ember" style={{ width: `${value * 14}%` }} />
              </span>
              <span>{value === 5 ? "58%" : value === 4 ? "28%" : value === 3 ? "10%" : value === 2 ? "3%" : "1%"}</span>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

function GalleryPreview({ game }: { game: CatalogGame }) {
  return (
    <Panel title="Galería">
      <div className="grid grid-cols-4 gap-2">
        {[0, 1, 2].map((item) => (
          <div key={item} className="relative aspect-square overflow-hidden rounded-md border border-walnut/20">
            <GameCoverImage {...game} gameTitle={game.title} variant="ranking" showPlaceholderLabel={false} />
          </div>
        ))}
        <div className="flex aspect-square items-center justify-center rounded-md bg-wood text-center text-sm font-black uppercase text-white">
          +12<br />más
        </div>
      </div>
      <Link href={`/juegos/${game.slug}`} className="button-secondary mt-4 w-full text-xs uppercase tracking-wide">
        Ver todas las imágenes
      </Link>
    </Panel>
  );
}

function buildJsonLd(game: CatalogGame) {
  const url = `${siteConfig.url}/juegos/${game.slug}`;

  return [
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: game.title,
      ...(hasVerifiedCoverImage(game) && game.coverImageUrl ? { image: game.coverImageUrl } : {}),
      description: game.description,
      category: game.categories.join(", "),
      url
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Inicio",
          item: siteConfig.url
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Juegos",
          item: `${siteConfig.url}/juegos`
        },
        {
          "@type": "ListItem",
          position: 3,
          name: game.title,
          item: url
        }
      ]
    }
  ];
}
