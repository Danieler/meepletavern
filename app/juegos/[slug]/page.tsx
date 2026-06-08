import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Crown, ScrollText } from "lucide-react";
import { BuyLinks } from "@/components/BuyLinks";
import { CategoryTag } from "@/components/CategoryTag";
import { CollectionButtons } from "@/components/CollectionButtons";
import { GameCard } from "@/components/GameCard";
import { GameStats } from "@/components/GameStats";
import { MechanicTag } from "@/components/MechanicTag";
import { ProsCons } from "@/components/ProsCons";
import { PublicShell } from "@/components/PublicShell";
import { RatingBadge } from "@/components/RatingBadge";
import { SectionHeader } from "@/components/SectionHeader";
import { SEOTextBlock } from "@/components/SEOTextBlock";
import { catalogGames, getGameBySlug, getRelatedGames, termHref, type CatalogGame } from "@/lib/catalog";
import { siteConfig } from "@/lib/site";

type GamePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: GamePageProps): Promise<Metadata> {
  const { slug } = await params;
  const game = getGameBySlug(slug);

  if (!game) {
    return {
      title: "Juego no encontrado",
      robots: { index: false, follow: false }
    };
  }

  const title = `${game.title}: reseña, puntuación, duración y jugadores`;
  const description = `${game.title} en MeepleTavern: puntuación, ranking, jugadores, duración, dificultad, reseña, pros, contras, categorías, mecánicas y juegos parecidos.`;

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
      images: [{ url: game.image, alt: game.title }]
    }
  };
}

export function generateStaticParams() {
  return catalogGames.map((game) => ({ slug: game.slug }));
}

export default async function GamePage({ params }: GamePageProps) {
  const { slug } = await params;
  const game = getGameBySlug(slug);

  if (!game) {
    notFound();
  }

  const relatedGames = getRelatedGames(game);
  const jsonLd = buildJsonLd(game);

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
                  {game.originalTitle !== game.title ? `${game.originalTitle} · ` : ""}
                  {game.year} · {game.publisher}
                </p>
                <p className="mt-5 max-w-3xl text-lg leading-8 text-white/78">{game.reviewSummary}</p>
              </div>
              <div className="flex items-center gap-4">
                <RatingBadge rating={game.rating} size="lg" />
                <div className="rounded-md border border-white/12 bg-white/10 p-4">
                  <p className="text-xs font-bold uppercase text-parchment">Ranking</p>
                  <p className="mt-1 text-3xl font-black text-white">#{game.rank}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container-page -mt-6 pb-8">
          <GameStats game={game} />
        </section>

        <section className="container-page grid gap-8 pb-14 lg:grid-cols-[280px_minmax(0,1fr)_300px]">
          <aside className="space-y-5">
            <div className="overflow-hidden rounded-md border border-ink/10 bg-white shadow-soft">
              <Image
                src={game.image}
                alt={`Imagen principal de ${game.title}`}
                width={720}
                height={560}
                priority
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
            <Panel title="Colección">
              <CollectionButtons />
            </Panel>
            <Panel title="Datos rápidos">
              <dl className="space-y-3 text-sm">
                <Fact label="Año" value={String(game.year)} />
                <Fact label="Editorial" value={game.publisher} />
                <Fact label="Diseñador" value={game.designer} />
                <Fact label="Artistas" value={game.artists.join(", ")} />
              </dl>
            </Panel>
          </aside>

          <article className="space-y-9">
            <section>
              <h2 className="text-2xl font-black text-ink">Descripción editorial</h2>
              <p className="mt-4 text-base leading-8 text-ink/74">{game.description}</p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-ink">Reseña MeepleTavern</h2>
              <p className="mt-4 text-base leading-8 text-ink/74">{game.reviewSummary}</p>
            </section>

            <ProsCons pros={game.pros} cons={game.cons} />

            <div className="grid gap-4 md:grid-cols-2">
              <TextPanel title="Para quién es este juego" body={game.recommendedFor} />
              <TextPanel title="Para quién no es" body={game.notRecommendedFor} />
            </div>

            <section className="space-y-4">
              <SectionHeader title="Características" />
              <TagSection title="Categorías">
                {game.categories.map((category) => (
                  <CategoryTag key={category} value={category} />
                ))}
              </TagSection>
              <TagSection title="Mecánicas">
                {game.mechanics.map((mechanic) => (
                  <MechanicTag key={mechanic} value={mechanic} />
                ))}
              </TagSection>
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
            </section>
          </article>

          <aside className="space-y-5">
            <Panel title="Puntuación y ranking">
              <div className="grid grid-cols-2 gap-3">
                <MiniMetric icon={Crown} label="Ranking" value={`#${game.rank}`} />
                <MiniMetric icon={ScrollText} label="Peso" value={game.weight.toFixed(1)} />
              </div>
            </Panel>
            <Panel title="Enlaces de compra">
              <BuyLinks links={game.buyLinks} />
            </Panel>
            <Panel title="Juegos parecidos">
              <div className="grid gap-3">
                {relatedGames.map((related) => (
                  <GameCard key={related.slug} game={related} compact />
                ))}
              </div>
            </Panel>
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

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-ink/10 bg-white p-5 shadow-soft">
      <h2 className="text-lg font-black text-ink">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase text-ink/45">{label}</dt>
      <dd className="mt-1 font-semibold leading-6 text-ink/72">{value}</dd>
    </div>
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
      image: game.image,
      description: game.description,
      brand: game.publisher,
      category: game.categories.join(", "),
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: game.rating,
        bestRating: 10,
        ratingCount: Math.max(25, Math.round(game.popularity * 11))
      },
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
