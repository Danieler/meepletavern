import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/PublicShell";
import { SEOTextBlock } from "@/components/SEOTextBlock";
import { getCatalogGames, getThemeTerms } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Temáticas de juegos de mesa",
  description:
    "Explora juegos de mesa por temáticas: fantasía, ciencia ficción, terror, Cthulhu, medieval, pulp, piratas, espacio, Marvel, Disney y zombies."
};

export const dynamic = "force-dynamic";

export default async function ThemesPage() {
  const [themeTerms, games] = await Promise.all([getThemeTerms(), getCatalogGames()]);

  return (
    <PublicShell>
      <main>
        <section className="page-hero">
          <div className="container-page">
            <p className="tavern-eyebrow">Historias y mundos</p>
            <h1 className="page-hero-title">Temáticas de juegos de mesa</h1>
            <p className="page-hero-copy">
              Fantasía, ciencia ficción, terror, espacio, mazmorras y otros mundos para elegir la
              mesa por lo que apetece vivir.
            </p>
          </div>
        </section>
        <section className="container-page grid gap-4 py-12 sm:grid-cols-2 lg:grid-cols-3">
          {themeTerms.map((term) => {
            const count = games.filter((game) => game.themes.includes(term)).length;
            return (
              <Link
                key={term}
                href={`/juegos?theme=${encodeURIComponent(term)}`}
                className="term-card"
              >
                <h2 className="font-display text-xl font-extrabold leading-tight text-ink">{term}</h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-ink/55">
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
