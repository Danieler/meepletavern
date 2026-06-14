import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChevronRight } from "lucide-react";
import { BrandIcon } from "@/components/BrandIcon";
import { BuyButton } from "@/components/BuyButton";
import { BuyLinks } from "@/components/BuyLinks";
import { CategoryTag } from "@/components/CategoryTag";
import { GameCard } from "@/components/GameCard";
import { GameComments } from "@/components/GameComments";
import { GameCoverImage } from "@/components/GameCoverImage";
import { GameLibraryPanel } from "@/components/GameLibraryPanel";
import { GameRatingSummary } from "@/components/GameRatingSummary";
import { GameStats } from "@/components/GameStats";
import { MechanicTag } from "@/components/MechanicTag";
import { PublicShell } from "@/components/PublicShell";
import { SectionHeader } from "@/components/SectionHeader";
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
  const primaryBuyUrl = game.buyLinks[0]?.url || null;

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

        <section className="container-page -mt-2 pb-10">
          <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
            <div className="grid min-w-0 gap-6">
              <div className="tavern-panel p-4 sm:p-6">
                <div className="grid min-w-0 gap-6 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)] xl:items-start">
                  <aside className="min-w-0 space-y-5">
                    <GameCoverImage {...game} gameTitle={game.title} variant="detail" priority className="border border-walnut/20 shadow-tavern" />
                    {shouldShowCategories || game.mechanics.length || game.themes.length ? (
                      <section className="rounded-md border border-walnut/15 bg-white/70 p-4 shadow-soft">
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

                  <article className="min-w-0 space-y-5 xl:pr-2">
                    <div>
                      <p className="text-sm font-bold text-walnut">
                        {[game.publishedAt ? new Date(game.publishedAt).getFullYear() : null, game.categories[0]].filter(Boolean).join(" · ")}
                      </p>
                      <h1 className="font-display mt-2 break-words text-4xl font-black leading-tight text-wood sm:text-5xl lg:text-6xl">{game.title}</h1>
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

                    <QuickDecision game={game} />
                  </article>
                </div>
              </div>

              {detailDescription ? (
                <section className="tavern-panel p-5 sm:p-6">
                  <SectionHeader
                    eyebrow="En mesa"
                    title="Cómo se juega y qué ritmo tiene"
                    description="Contexto para entender la experiencia sin repetir los datos rápidos de arriba."
                  />
                  <p className="max-w-4xl text-base leading-8 text-ink/85">{detailDescription}</p>
                </section>
              ) : null}

              <GameComments gameId={game.id} gameSlug={game.slug} initialComments={comments} />
            </div>

            <aside className="min-w-0 space-y-5">
              <Panel title="Nota y tu voto">
                <div className="flex justify-center">
                  <GameRatingSummary initialRatings={game.ratings} />
                </div>
                <UserRatingVote gameId={game.id} initialVotesCount={game.ratings.users.votesCount} />
              </Panel>
              {primaryBuyUrl ? (
                <Panel title="Compra rápida">
                  <BuyButton url={primaryBuyUrl} />
                </Panel>
              ) : null}
              {game.buyLinks.length > 1 ? (
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

function TagSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-walnut/15 bg-white/75 p-3">
      <h3 className="text-sm font-black uppercase tracking-[0.16em] text-walnut/60">{title}</h3>
      <div className="mt-3 flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function QuickDecision({ game }: { game: CatalogGame }) {
  const bestItems = game.pros.slice(0, 3);
  const cautionItems = game.cons.slice(0, 3);
  const idealItems = splitDecisionText(game.recommendedFor).slice(0, 3);

  if (!bestItems.length && !cautionItems.length && !idealItems.length && !game.notRecommendedFor) {
    return null;
  }

  return (
    <section className="rounded-md border border-walnut/15 bg-white/65 p-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-ember">Decisión rápida</p>
          <h2 className="font-display mt-1 text-2xl font-black text-wood">¿Es para ti?</h2>
        </div>
        <p className="max-w-xs text-xs font-semibold leading-5 text-walnut/65">
          Lo esencial para decidir sin bajar por toda la ficha.
        </p>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <DecisionColumn title="Lo mejor" items={bestItems} icon="star" />
        <DecisionColumn title="Ten en cuenta" items={cautionItems} icon="bookmark" />
        <DecisionColumn title="Ideal para" items={idealItems} icon="users" fallback={game.recommendedFor} />
      </div>
      {game.notRecommendedFor ? (
        <p className="mt-4 rounded-md border border-ruby/10 bg-ruby/5 px-4 py-3 text-sm font-semibold leading-6 text-walnut/75">
          No es para: {game.notRecommendedFor}
        </p>
      ) : null}
    </section>
  );
}

function DecisionColumn({
  title,
  items,
  icon,
  fallback
}: {
  title: string;
  items: string[];
  icon: "bookmark" | "star" | "users";
  fallback?: string;
}) {
  const visibleItems = items.length ? items : fallback ? [fallback] : ["Pendiente de completar"];

  return (
    <article className="rounded-md border border-walnut/15 bg-white/75 p-4">
      <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-walnut/60">
        <BrandIcon name={icon} size={18} />
        {title}
      </h3>
      <ul className="mt-3 space-y-2 text-sm font-semibold leading-6 text-walnut/80">
        {visibleItems.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </article>
  );
}

function splitDecisionText(value: string) {
  return value
    .split(/[,.;]\s+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 2);
}

function GalleryPreview({ game }: { game: CatalogGame }) {
  const previewImages = game.galleryImages.slice(0, 4);
  const extraImages = game.galleryImages.slice(4);

  if (previewImages.length <= 1) {
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
