import type { Metadata } from "next";
import Link from "next/link";
import { BrandIcon } from "@/components/BrandIcon";
import { PublicShell } from "@/components/PublicShell";
import { RankingList } from "@/components/RankingList";
import { SectionHeader } from "@/components/SectionHeader";
import { SEOTextBlock } from "@/components/SEOTextBlock";
import { getRankingGames, getRankings } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Rankings de juegos de mesa",
  description:
    "Rankings de MeepleTavern con top juegos de mesa, familiares, cooperativos, party, narrativos, estratégicos, para dos y para principiantes."
};

export const dynamic = "force-dynamic";

export default async function RankingsPage() {
  const rankings = await getRankings();
  const rankingSections = await Promise.all(
    rankings.map(async (ranking) => ({
      ranking,
      games: (await getRankingGames(ranking)).slice(0, 5)
    }))
  );

  return (
    <PublicShell>
      <main>
        <section className="page-hero">
          <div className="container-page">
            <p className="tavern-eyebrow">Salón de la fama</p>
            <h1 className="page-hero-title">Rankings de juegos de mesa</h1>
            <p className="page-hero-copy">
              Listas editoriales para comparar por tipo de mesa, momento, género y nivel de
              experiencia.
            </p>
          </div>
        </section>

        <section className="container-page grid gap-8 py-12 lg:grid-cols-2">
          {rankingSections.map(({ ranking, games }) => (
            <article key={ranking.slug} className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <SectionHeader title={ranking.title} description={ranking.description} />
                <Link className="button-secondary shrink-0" href={`/rankings/${ranking.slug}`}>
                  <BrandIcon name="flame" size={18} />
                  Ver ranking
                </Link>
              </div>
              <RankingList games={games} />
            </article>
          ))}
        </section>

        <section className="container-page pb-14">
          <SEOTextBlock title="Rankings preparados para descubrir y comparar">
            <p>
              Los rankings de MeepleTavern no intentan sustituir tu mesa: sirven como punto de
              partida para encontrar juegos familiares, cooperativos, party, narrativos, duros o
              especialmente buenos a dos jugadores.
            </p>
          </SEOTextBlock>
        </section>
      </main>
    </PublicShell>
  );
}
