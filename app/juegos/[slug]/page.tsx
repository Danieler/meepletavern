import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChevronRight, Clock, Gauge, Users } from "lucide-react";
import { BuyLinks } from "@/components/BuyLinks";
import { CategoryTag } from "@/components/CategoryTag";
import { CollectionButtons } from "@/components/CollectionButtons";
import { GameCard } from "@/components/GameCard";
import { GameCoverImage } from "@/components/GameCoverImage";
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
        <section className="border-b border-ink/10 bg-ink text-white">
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
                <p className="text-sm font-bold uppercase text-ember">Ficha de juego</p>
                <h1 className="mt-3 text-4xl font-black text-white sm:text-6xl">{game.title}</h1>
                <p className="mt-3 text-sm font-semibold text-white/60">
                  {[game.playersLabel, game.playtime, game.complexity].filter(Boolean).join(" · ")}
                </p>
                {game.reviewSummary ? (
                  <p className="mt-5 max-w-3xl text-lg leading-8 text-white/78">{game.reviewSummary}</p>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section className="container-page -mt-6 pb-8">
          <GameStats game={game} />
        </section>

        <GameRatings game={game} />

        <section className="container-page grid gap-8 pb-14 lg:grid-cols-[280px_minmax(0,1fr)_300px]">
          <aside className="space-y-5">
            <GameCoverImage {...game} gameTitle={game.title} variant="detail" priority className="border border-ink/10 shadow-soft" />
            <Panel title="Colección">
              <CollectionButtons />
            </Panel>
          </aside>

          <article className="space-y-9">
            {game.description ? (
              <section>
                <h2 className="text-2xl font-black text-ink">Descripción editorial</h2>
                <p className="mt-4 text-base leading-8 text-ink/74">{game.description}</p>
              </section>
            ) : null}

            {game.pros.length || game.cons.length ? <ProsCons pros={game.pros} cons={game.cons} /> : null}

            {game.recommendedFor || game.notRecommendedFor ? (
              <div className="grid gap-4 md:grid-cols-2">
                {game.recommendedFor ? <TextPanel title="Para quién es este juego" body={game.recommendedFor} /> : null}
                {game.notRecommendedFor ? <TextPanel title="Para quién no es" body={game.notRecommendedFor} /> : null}
              </div>
            ) : null}

            {shouldShowCategories || game.mechanics.length || game.themes.length ? (
              <section className="space-y-4">
                <SectionHeader title={hasRichEditorialTags ? "Mecánicas y temática" : "Claves del juego"} />
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
                        className="rounded-md bg-ruby/10 px-3 py-1.5 text-sm font-semibold text-ruby transition hover:bg-ruby hover:text-white"
                      >
                        {theme}
                      </Link>
                    ))}
                  </TagSection>
                ) : null}
              </section>
            ) : null}
          </article>

          <aside className="space-y-5">
            {game.playersLabel || game.playtime || game.complexity ? (
              <Panel title="Datos de la ficha">
                <div className="grid grid-cols-2 gap-3">
                  {game.playersLabel ? <MiniMetric icon={Users} label="Jugadores" value={game.playersLabel} /> : null}
                  {game.playtime ? <MiniMetric icon={Clock} label="Duración" value={game.playtime} /> : null}
                  {game.complexity ? <MiniMetric icon={Gauge} label="Complejidad" value={game.complexity} /> : null}
                </div>
              </Panel>
            ) : null}
            {game.buyLinks.length ? (
              <Panel title="Enlaces de compra">
                <BuyLinks links={game.buyLinks} />
              </Panel>
            ) : null}
            <Suspense fallback={null}>
              <RelatedGamesPanel game={game} />
            </Suspense>
          </aside>
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

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-ink/10 bg-white p-5 shadow-soft">
      <h2 className="text-lg font-black text-ink">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function TextPanel({ title, body }: { title: string; body: string }) {
  return (
    <section className="rounded-md border border-ink/10 bg-white p-5 shadow-soft">
      <h2 className="text-xl font-black text-ink">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-ink/70">{body}</p>
    </section>
  );
}

function TagSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-ink/10 bg-white p-5 shadow-soft">
      <h3 className="text-sm font-bold uppercase text-ink/45">{title}</h3>
      <div className="mt-3 flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function MiniMetric({
  icon: Icon,
  label,
  value
}: {
  icon: React.ComponentType<{ size?: number; className?: string; "aria-hidden"?: boolean }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md bg-ink/5 p-3">
      <Icon size={18} className="text-moss" aria-hidden={true} />
      <p className="mt-2 text-xs font-bold uppercase text-ink/45">{label}</p>
      <p className="text-lg font-black text-ink">{value}</p>
    </div>
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
