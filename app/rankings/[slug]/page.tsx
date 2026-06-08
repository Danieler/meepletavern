import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicShell } from "@/components/PublicShell";
import { RankingList } from "@/components/RankingList";
import { SEOTextBlock } from "@/components/SEOTextBlock";
import { getRankingBySlug, getRankingGames } from "@/lib/catalog";
import { siteConfig } from "@/lib/site";

type RankingPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const dynamic = "force-dynamic";

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

  return (
    <PublicShell>
      <main>
        <section className="bg-ink py-12 text-white">
          <div className="container-page">
            <p className="text-sm font-bold uppercase text-ember">Ranking MeepleTavern</p>
            <h1 className="mt-3 text-4xl font-black sm:text-5xl">{ranking.title}</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-white/76">{ranking.description}</p>
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
