import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChevronRight } from "lucide-react";
import { BrandIcon } from "@/components/BrandIcon";
import { BuyLinks } from "@/components/BuyLinks";
import { CategoryTag } from "@/components/CategoryTag";
import { GameCard } from "@/components/GameCard";
import { GameComments } from "@/components/GameComments";
import { GameCoverImage } from "@/components/GameCoverImage";
import { GameLibraryPanel } from "@/components/GameLibraryPanel";
import { GameRatingSummary } from "@/components/GameRatingSummary";
import { GameStats } from "@/components/GameStats";
import { MechanicTag } from "@/components/MechanicTag";
import { ProsCons } from "@/components/ProsCons";
import { PublicShell } from "@/components/PublicShell";
import { SectionHeader } from "@/components/SectionHeader";
import { SEOTextBlock } from "@/components/SEOTextBlock";
import { UserRatingVote } from "@/components/UserRatingVote";
import { getGameBySlug, getRelatedGames, termHref, type CatalogGame } from "@/lib/catalog";
import { getGameComments } from "@/lib/gameComments";
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
  const comments = await getGameComments(game.id);
  const hasRichEditorialTags = game.mechanics.length > 0 || game.themes.length > 0;
  const shouldShowCategories = game.categories.length > 0 && !hasRichEditorialTags;
  const introDescription = isRedundantText(game.reviewSummary, game.description) ? "" : game.reviewSummary;
  const bodyDescription = isWeakBodyDescription(game.description, introDescription, game) ? "" : game.description;
  const leadDescription = introDescription || bodyDescription;
  const detailDescription = introDescription ? bodyDescription : "";

  return (
    <PublicShell>
      <main>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <section className="wood-surface border-b border-ember/30 text-white">
          <div className="container-page py-4">
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
          </div>
        </section>

        <section className="container-page -mt-2 pb-14">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
            <div className="grid gap-6">
              <div className="tavern-panel p-4 sm:p-6">
                <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)] xl:items-start">
                  <aside className="space-y-5">
                    <GameCoverImage {...game} gameTitle={game.title} variant="detail" priority className="border border-walnut/20 shadow-tavern" />
                    {shouldShowCategories || game.mechanics.length || game.themes.length ? (
                      <section className="rounded-2xl border border-walnut/15 bg-white/70 p-4 shadow-soft">
                        <div className="grid gap-3">
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
                      </section>
                    ) : null}
                    <GameLibraryPanel gameId={game.id} />
                  </aside>

                  <article className="space-y-5 xl:pr-2">
                    <div>
                      <p className="text-sm font-bold text-walnut">
                        {[game.publishedAt ? new Date(game.publishedAt).getFullYear() : null, game.categories[0]].filter(Boolean).join(" · ")}
                      </p>
                      <h1 className="font-display mt-2 text-5xl font-black text-wood sm:text-6xl">{game.title}</h1>
                    </div>

                    {leadDescription ? (
                      <p className="text-lg font-semibold leading-8 text-ink lg:text-xl lg:leading-9">{leadDescription}</p>
                    ) : null}

                    <GameStats game={game} />

                    <div className="grid gap-2 sm:grid-cols-2">
                      <Link className="button-secondary justify-start" href={`/juegos/${game.slug}/resena`}>
                        <BrandIcon name="document" size={20} />
                        Escribir reseña
                      </Link>
                      <Link className="button-secondary justify-start" href="#comentarios">
                        <BrandIcon name="chat" size={20} />
                        Comentar
                      </Link>
                    </div>
                  </article>

                  <div className="grid gap-6 lg:col-span-2 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] xl:items-start">
                    {detailDescription ? (
                      <section className="rounded-2xl border border-walnut/15 bg-white/55 p-5 sm:p-6">
                        <SectionHeader
                          eyebrow="En mesa"
                          title="Cómo se juega y qué ritmo tiene"
                          description="Contexto para entender la experiencia sin repetir los datos rápidos de arriba."
                        />
                        <p className="text-base leading-8 text-ink/85">{detailDescription}</p>
                      </section>
                    ) : null}

                    <section className="rounded-2xl border border-walnut/15 bg-white/55 p-5 sm:p-6">
                      <SectionHeader
                        eyebrow="Veredicto rápido"
                        title="Lo mejor, lo peor y para quién"
                        description="Una lectura editorial pensada para decidir rápido si este juego merece hueco en tu mesa."
                      />
                      <div className="space-y-4">
                        {game.pros.length || game.cons.length ? <ProsCons pros={game.pros} cons={game.cons} /> : null}

                        {game.recommendedFor || game.notRecommendedFor ? (
                          <div className="grid gap-4 md:grid-cols-2">
                            {game.recommendedFor ? <TextPanel title="Para quién es este juego" body={game.recommendedFor} /> : null}
                            {game.notRecommendedFor ? <TextPanel title="Para quién no es" body={game.notRecommendedFor} /> : null}
                          </div>
                        ) : null}
                      </div>
                    </section>
                  </div>
                </div>
              </div>

              <GameComments gameId={game.id} gameSlug={game.slug} initialComments={comments} />
            </div>

            <aside className="space-y-5">
              <Panel title="Nota y tu voto">
                <div className="flex justify-center">
                  <GameRatingSummary initialRatings={game.ratings} />
                </div>
                <UserRatingVote gameId={game.id} initialVotesCount={game.ratings.users.votesCount} />
              </Panel>
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
    <div className="rounded-2xl border border-walnut/15 bg-white/75 p-4">
      <h3 className="text-sm font-black uppercase tracking-[0.16em] text-walnut/60">{title}</h3>
      <div className="mt-3 flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function GalleryPreview({ game }: { game: CatalogGame }) {
  const previewImages = game.galleryImages.slice(0, 4);
  const extraImages = game.galleryImages.slice(4);

  if (!previewImages.length) {
    return null;
  }

  return (
    <Panel title="Galería">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(86px,1fr))] gap-3">
        {previewImages.map((image) => (
          <GalleryImageTile key={image.url} image={image} />
        ))}
      </div>
      {extraImages.length ? (
        <details className="group mt-4">
          <summary className="button-secondary w-full cursor-pointer list-none justify-center px-4 py-3 text-xs uppercase tracking-wide">
            Ver {extraImages.length} imágenes más
          </summary>
          <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(86px,1fr))] gap-3">
            {extraImages.map((image) => (
              <GalleryImageTile key={image.url} image={image} />
            ))}
          </div>
        </details>
      ) : null}
    </Panel>
  );
}

function GalleryImageTile({ image }: { image: CatalogGame["galleryImages"][number] }) {
  return (
    <figure className="overflow-hidden rounded-md border border-walnut/20 bg-parchment">
      <img
        src={image.url}
        alt={image.alt}
        loading="lazy"
        decoding="async"
        className="aspect-square w-full object-cover"
      />
      {image.sourceName ? (
        <figcaption className="truncate px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide text-walnut/55">
          {image.sourceName}
        </figcaption>
      ) : null}
    </figure>
  );
}

function isWeakBodyDescription(body: string | null | undefined, intro: string | null | undefined, game: CatalogGame) {
  if (!body) {
    return true;
  }

  return Boolean(
    (intro && isRedundantText(intro, body)) ||
    isMostlyRepeatedMetadata(body, game) ||
    (hasGenericPublicCopy(body) && !hasGameplaySpecifics(body))
  );
}

function isRedundantText(left: string | null | undefined, right: string | null | undefined) {
  const normalizedLeft = normalizeComparablePublicText(left);
  const normalizedRight = normalizeComparablePublicText(right);

  if (!normalizedLeft || !normalizedRight) {
    return false;
  }

  if (normalizedLeft === normalizedRight || normalizedRight.includes(normalizedLeft) || normalizedLeft.includes(normalizedRight)) {
    return true;
  }

  const leftWords = new Set(normalizedLeft.split(" ").filter((word) => word.length > 3));
  const rightWords = normalizedRight.split(" ").filter((word) => word.length > 3);
  const sharedWords = rightWords.filter((word) => leftWords.has(word)).length;

  return leftWords.size >= 8 && sharedWords / leftWords.size > 0.72;
}

function normalizeComparablePublicText(value: string | null | undefined) {
  return (value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isMostlyRepeatedMetadata(value: string, game: CatalogGame) {
  const text = normalizeComparablePublicText(value);
  const words = text.split(" ").filter((word) => word.length > 3);

  if (words.length > 55) {
    return false;
  }

  const repeatsPlayers = Boolean(game.playersLabel && text.includes(normalizeComparablePublicText(game.playersLabel)));
  const repeatsDuration = Boolean(game.playtime && text.includes(normalizeComparablePublicText(game.playtime)));
  const repeatsAge = Boolean(game.age && text.includes(normalizeComparablePublicText(game.age)));
  const repeatedFacts = [repeatsPlayers, repeatsDuration, repeatsAge].filter(Boolean).length;

  return repeatedFacts >= 2 && !hasGameplaySpecifics(value);
}

function hasGameplaySpecifics(value: string) {
  return /(objetivo|turno|ronda|loseta|losetas|meeple|obreros?|camino|ciudad|monasterio|granja|campo|coloca|roba|juega|punt[ou]s?|mayor[ií]a|control|decisi[oó]n|estrategia|bloquea|expande|construye)/i.test(value);
}

function hasGenericPublicCopy(value: string) {
  return /(propuesta de mesa|foco en la experiencia de juego|contexto tem[aá]tico|pensad[oa] para disfrutar|ideal para grupos|ofrece una experiencia|se presenta como|din[aá]mica accesible)/i.test(value);
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
