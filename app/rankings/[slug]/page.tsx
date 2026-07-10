import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicShell } from "@/components/PublicShell";
import { RankingList } from "@/components/RankingList";
import { SEOTextBlock } from "@/components/SEOTextBlock";
import { getRankingBySlug, getRankingGames, getRankings } from "@/lib/catalog";
import { siteConfig } from "@/lib/site";

type RankingPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const revalidate = 3600;

export async function generateStaticParams() {
  const rankings = await getRankings();
  return rankings.map((ranking) => ({
    slug: ranking.slug
  }));
}

export async function generateMetadata({ params }: RankingPageProps): Promise<Metadata> {
  const { slug } = await params;
  const ranking = await getRankingBySlug(slug);

  if (!ranking) {
    return {
      title: "Ranking no encontrado",
      robots: { index: false, follow: false }
    };
  }

  return {
    title: ranking.title,
    description: ranking.description,
    alternates: {
      canonical: `${siteConfig.url}/rankings/${ranking.slug}`
    },
    openGraph: {
      title: ranking.title,
      description: ranking.description,
      type: "website",
      url: `${siteConfig.url}/rankings/${ranking.slug}`
    },
    twitter: {
      card: "summary_large_image",
      title: ranking.title,
      description: ranking.description
    }
  };
}

export default async function RankingPage({ params }: RankingPageProps) {
  const { slug } = await params;
  const ranking = await getRankingBySlug(slug);

  if (!ranking) {
    notFound();
  }

  const games = await getRankingGames(ranking);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: ranking.title,
    description: ranking.description,
    url: `${siteConfig.url}/rankings/${ranking.slug}`,
    itemListElement: games.map((game, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${siteConfig.url}/juegos/${game.slug}`
    }))
  };

  return (
    <PublicShell>
      <main>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <section className="page-hero">
          <div className="container-page">
            <p className="tavern-eyebrow">Ranking MeepleTavern</p>
            <h1 className="page-hero-title">{ranking.title}</h1>
            <p className="page-hero-copy">{ranking.description}</p>
          </div>
        </section>
        <section className="container-page py-12">
          <RankingList games={games} />
        </section>
        <section className="container-page pb-14">
          <SEOTextBlock title={`${ranking.title}: guía de selección`}>
            <p>
              Esta lista combina valoración editorial, facilidad de recomendación y encaje en mesa.
              Cada juego enlaza a su ficha para ampliar duración, jugadores, dificultad, pros,
              contras y juegos parecidos.
            </p>
          </SEOTextBlock>
        </section>
      </main>
    </PublicShell>
  );
}
