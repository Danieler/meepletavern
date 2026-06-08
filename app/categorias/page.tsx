import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/PublicShell";
import { SEOTextBlock } from "@/components/SEOTextBlock";
import { getCatalogGames, getCategoryTerms } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Categorías de juegos de mesa",
  description:
    "Explora categorías de juegos de mesa como familiar, estrategia, party, cooperativo, narrativo, dungeon crawler, eurogame, ameritrash o abstracto."
};

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const [terms, games] = await Promise.all([getCategoryTerms(), getCatalogGames()]);

  return (
    <PublicShell>
      <TermPage
        eyebrow="Mapas de la taberna"
        title="Categorías de juegos de mesa"
        description="Una entrada rápida para explorar el catálogo por tipo de experiencia."
        terms={terms}
        games={games.map((game) => ({ categories: game.categories }))}
        param="category"
      />
    </PublicShell>
  );
}

function TermPage({
  eyebrow,
  title,
  description,
  terms,
  games,
  param
}: {
  eyebrow: string;
  title: string;
  description: string;
  terms: string[];
  games: Array<{ categories: string[] }>;
  param: string;
}) {
  return (
    <main>
      <section className="bg-ink py-12 text-white">
        <div className="container-page">
          <p className="text-sm font-bold uppercase text-ember">{eyebrow}</p>
          <h1 className="mt-3 text-4xl font-black sm:text-5xl">{title}</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-white/76">{description}</p>
        </div>
      </section>
      <section className="container-page grid gap-4 py-12 sm:grid-cols-2 lg:grid-cols-3">
        {terms.map((term) => {
          const count = games.filter((game) => game.categories.includes(term)).length;
          return (
            <Link
              key={term}
              href={`/juegos?${param}=${encodeURIComponent(term)}`}
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
        <SEOTextBlock title={`${title} para descubrir mejor`}>
          <p>
            Estas páginas funcionan como puertas SEO hacia el catálogo. Cada término conecta con
            juegos relacionados para navegar por estilos, sensaciones y tipos de mesa.
          </p>
        </SEOTextBlock>
      </section>
    </main>
  );
}
