import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { BuyButton } from "@/components/BuyButton";
import { FAQBlock } from "@/components/FAQBlock";
import { GameQuickFacts } from "@/components/GameQuickFacts";
import { ProsCons } from "@/components/ProsCons";
import { SectionHeader } from "@/components/SectionHeader";
import { SimilarGames } from "@/components/SimilarGames";
import { asFaqItems, asSourceItems } from "@/lib/content";
import { getPublishedGameBySlug } from "@/lib/games";
import { siteConfig } from "@/lib/site";

export const dynamic = "force-dynamic";

type GamePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: GamePageProps): Promise<Metadata> {
  const { slug } = await params;
  const game = await getPublishedGameBySlug(slug);

  if (!game) {
    return {
      title: "Juego no encontrado",
      robots: { index: false, follow: false }
    };
  }

  const title = game.seoTitle || `${game.name}: reseña y opinión`;
  const description = game.seoDescription || game.shortSummary || siteConfig.subclaim;
  const url = `${siteConfig.url}/juegos/${game.slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: url
    },
    openGraph: {
      title,
      description,
      url,
      type: "article",
      images: game.imageUrl
        ? [
            {
              url: game.imageUrl,
              alt: game.name
            }
          ]
        : undefined
    }
  };
}

export default async function GamePage({ params }: GamePageProps) {
  const { slug } = await params;
  const game = await getPublishedGameBySlug(slug);

  if (!game) {
    notFound();
  }

  const faqs = asFaqItems(game.faqs);
  const sources = asSourceItems(game.sources);
  const jsonLd = buildJsonLd(game, faqs);

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className="bg-ink text-white">
        <div className="container-page py-6">
          <nav className="flex flex-wrap items-center gap-2 text-sm text-white/70" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-white">
              Inicio
            </Link>
            <ChevronRight size={15} aria-hidden="true" />
            <span>{game.name}</span>
          </nav>
          <div className="grid gap-8 py-10 lg:grid-cols-[1fr_440px] lg:items-center lg:py-14">
            <div>
              <p className="text-sm font-bold uppercase text-ember">
                Ficha de juego
              </p>
              <h1 className="mt-3 text-4xl font-black text-white sm:text-5xl">
                {game.name}
              </h1>
              {game.shortSummary ? (
                <p className="mt-5 max-w-2xl text-lg leading-8 text-white/80">{game.shortSummary}</p>
              ) : null}
              <div className="mt-7 flex flex-wrap gap-3">
                <BuyButton url={game.buyUrl} />
                <Link className="button-secondary border-white/20 bg-white/10 text-white hover:text-parchment" href="/">
                  Ver más juegos
                </Link>
              </div>
            </div>
            <div className="overflow-hidden rounded-md border border-white/12 bg-white/5 shadow-soft">
              {game.imageUrl ? (
                <Image
                  src={game.imageUrl}
                  alt={`Imagen principal de ${game.name}`}
                  width={880}
                  height={620}
                  priority
                  className="aspect-[4/3] w-full object-cover"
                />
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center bg-[linear-gradient(135deg,#2f6f62,#8f3048)] p-8 text-center text-3xl font-black">
                  {game.name}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="container-page -mt-6 pb-12">
        <GameQuickFacts game={game} />
      </section>

      <article className="container-page grid gap-10 pb-16 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-10">
          <ContentSection title="Descripción" body={game.description} />
          <ContentSection title="Reseña corta" body={game.review} />

          {(game.pros.length || game.cons.length) ? <ProsCons pros={game.pros} cons={game.cons} /> : null}

          <div className="grid gap-4 md:grid-cols-2">
            <ContentPanel title="Para quién es" body={game.bestFor} />
            <ContentPanel title="Para quién no es" body={game.notFor} />
          </div>

          <section>
            <SectionHeader title="Preguntas frecuentes" />
            <FAQBlock faqs={faqs} />
          </section>
        </div>

        <aside className="space-y-8">
          <SidebarPanel title="Mecánicas">
            <TagList items={game.mechanics} />
          </SidebarPanel>
          <SidebarPanel title="Juegos parecidos">
            <SimilarGames games={game.similarGames} />
          </SidebarPanel>
          {sources.length ? (
            <SidebarPanel title="Fuentes consultadas">
              <ul className="space-y-2 text-sm leading-6 text-ink/70">
                {sources.map((source) => (
                  <li key={`${source.label}-${source.url}`}>
                    {source.url ? (
                      <a className="font-semibold text-moss hover:underline" href={source.url}>
                        {source.label}
                      </a>
                    ) : (
                      source.label
                    )}
                  </li>
                ))}
              </ul>
            </SidebarPanel>
          ) : null}
        </aside>
      </article>
    </main>
  );
}

function ContentSection({ title, body }: { title: string; body: string | null }) {
  if (!body) {
    return null;
  }

  return (
    <section>
      <h2 className="text-2xl font-bold text-ink">{title}</h2>
      <p className="mt-4 text-base leading-8 text-ink/74">{body}</p>
    </section>
  );
}

function ContentPanel({ title, body }: { title: string; body: string | null }) {
  if (!body) {
    return null;
  }

  return (
    <section className="rounded-md border border-ink/10 bg-white p-5 shadow-soft">
      <h2 className="text-xl font-bold text-ink">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-ink/70">{body}</p>
    </section>
  );
}

function SidebarPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-ink/10 bg-white p-5 shadow-soft">
      <h2 className="text-lg font-bold text-ink">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function TagList({ items }: { items: string[] }) {
  if (!items.length) {
    return <p className="text-sm text-ink/55">Por completar.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item} className="rounded-md bg-moss/10 px-3 py-1.5 text-sm font-semibold text-moss">
          {item}
        </span>
      ))}
    </div>
  );
}

function buildJsonLd(
  game: NonNullable<Awaited<ReturnType<typeof getPublishedGameBySlug>>>,
  faqs: ReturnType<typeof asFaqItems>
) {
  const url = `${siteConfig.url}/juegos/${game.slug}`;

  return [
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: game.name,
      image: game.imageUrl || undefined,
      description: game.seoDescription || game.shortSummary || game.description || undefined,
      category: game.categories.join(", ") || "Juego de mesa",
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
          name: game.name,
          item: url
        }
      ]
    },
    faqs.length
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: faq.answer
            }
          }))
        }
      : null
  ].filter(Boolean);
}
