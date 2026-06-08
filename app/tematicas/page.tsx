import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/PublicShell";
import { SEOTextBlock } from "@/components/SEOTextBlock";
import { catalogGames, themeTerms } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Temáticas de juegos de mesa",
  description:
    "Explora juegos de mesa por temáticas: fantasía, ciencia ficción, terror, Cthulhu, medieval, pulp, piratas, espacio, Marvel, Disney y zombies."
};

export default function ThemesPage() {
  return (
    <PublicShell>
      <main>
        <section className="bg-ink py-12 text-white">
          <div className="container-page">
            <p className="text-sm font-bold uppercase text-ember">Historias y mundos</p>
            <h1 className="mt-3 text-4xl font-black sm:text-5xl">Temáticas de juegos de mesa</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-white/76">
              Fantasía, ciencia ficción, terror, espacio, mazmorras y otros mundos para elegir la
              mesa por lo que apetece vivir.
            </p>
          </div>
        </section>
        <section className="container-page grid gap-4 py-12 sm:grid-cols-2 lg:grid-cols-3">
          {themeTerms.map((term) => {
            const count = catalogGames.filter((game) => game.themes.includes(term)).length;
            return (
              <Link
                key={term}
                href={`/juegos?theme=${encodeURIComponent(term)}`}
                className="rounded-md border border-ink/10 bg-white p-5 shadow-soft transition hover:border-moss/40"
              >
                <h2 className="text-xl font-black text-ink">{term}</h2>
                <p className="mt-2 text-sm font-semibold text-ink/55">
                  {count ? `${count} juegos en el archivo` : "Preparado para nuevas fichas"}
                </p>
              </Link>
            );
          })}
        </section>
        <section className="container-page pb-14">
          <SEOTextBlock title="Temáticas para encontrar la partida adecuada">
            <p>
              La temática marca la primera promesa de una partida. En MeepleTavern se combina con
              mecánicas, duración y peso para que la recomendación sea útil, no solo vistosa.
            </p>
          </SEOTextBlock>
        </section>
      </main>
    </PublicShell>
  );
}

