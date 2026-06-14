import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/PublicShell";
import { SEOTextBlock } from "@/components/SEOTextBlock";
import { getCatalogGames, getMechanicTerms } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Mecánicas de juegos de mesa",
  description:
    "Explora juegos por mecánicas: colocación de trabajadores, construcción de mazos, mayorías, draft, dados, legacy, campaña y más."
};

export const dynamic = "force-dynamic";

export default async function MechanicsPage() {
  const [mechanicTerms, games] = await Promise.all([getMechanicTerms(), getCatalogGames()]);

  return (
    <PublicShell>
      <main>
        <section className="page-hero">
          <div className="container-page">
            <p className="tavern-eyebrow">Herramientas de juego</p>
            <h1 className="page-hero-title">Mecánicas de juegos de mesa</h1>
            <p className="page-hero-copy">
              Rutas para encontrar juegos por cómo se juegan: cartas, dados, mayorías, campaña,
              control de áreas o construcción de motores.
            </p>
          </div>
        </section>
        <section className="container-page grid gap-4 py-12 sm:grid-cols-2 lg:grid-cols-3">
          {mechanicTerms.map((term) => {
            const count = games.filter((game) => game.mechanics.includes(term)).length;
            return (
              <Link
                key={term}
                href={`/juegos?mechanic=${encodeURIComponent(term)}`}
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
          <SEOTextBlock title="Mecánicas para comparar sensaciones">
            <p>
              Las mecánicas ayudan a distinguir juegos que quizá comparten tema, pero se sienten
              completamente distintos en mesa. Por eso cada ficha conecta sus sistemas principales.
            </p>
          </SEOTextBlock>
        </section>
      </main>
    </PublicShell>
  );
}
