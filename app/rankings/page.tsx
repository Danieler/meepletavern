import type { Metadata } from "next";
import Link from "next/link";
import { Flame } from "lucide-react";
import { PublicShell } from "@/components/PublicShell";
import { RankingList } from "@/components/RankingList";
import { SectionHeader } from "@/components/SectionHeader";
import { SEOTextBlock } from "@/components/SEOTextBlock";
import { getRankingGames, rankings } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Rankings de juegos de mesa",
  description:
    "Rankings de MeepleTavern con top juegos de mesa, familiares, cooperativos, party, narrativos, estratégicos, para dos y para principiantes."
};

export default function RankingsPage() {
  return (
    <PublicShell>
      <main>
        <section className="bg-ink py-12 text-white">
          <div className="container-page">
            <p className="text-sm font-bold uppercase text-ember">Salón de la fama</p>
            <h1 className="mt-3 text-4xl font-black sm:text-5xl">Rankings de juegos de mesa</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-white/76">
              Listas editoriales para comparar por tipo de mesa, momento, género y nivel de
              experiencia.
            </p>
          </div>
        </section>

        <section className="container-page grid gap-8 py-12 lg:grid-cols-2">
          {rankings.map((ranking) => (
            <article key={ranking.slug} className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <SectionHeader title={ranking.title} description={ranking.description} />
                <Link className="button-secondary shrink-0" href={`/rankings/${ranking.slug}`}>
                  <Flame size={17} aria-hidden="true" />
                  Ver ranking
                </Link>
              </div>
              <RankingList games={getRankingGames(ranking).slice(0, 5)} />
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

