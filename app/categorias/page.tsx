import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/PublicShell";
import { SEOTextBlock } from "@/components/SEOTextBlock";
import { getCategoryGameCounts, getCategoryTerms } from "@/lib/catalog";
import { slugify } from "@/lib/slug";

export const metadata: Metadata = {
  title: "Categorías de juegos de mesa",
  description:
    "Explora categorías de juegos de mesa como familiar, estrategia, party, cooperativo, narrativo, dungeon crawler, eurogame, ameritrash o abstracto."
};

export const revalidate = 3600;

export default async function CategoriesPage() {
  const [terms, counts] = await Promise.all([getCategoryTerms(), getCategoryGameCounts()]);

  return (
    <PublicShell>
      <TermPage
        eyebrow="Mapas de la taberna"
        title="Categorías de juegos de mesa"
        description="Una entrada rápida para explorar el catálogo por tipo de experiencia."
        terms={terms}
        counts={counts}
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
  counts,
  param
}: {
  eyebrow: string;
  title: string;
  description: string;
  terms: string[];
  counts: Record<string, number>;
  param: string;
}) {
  return (
    <main>
      <section className="page-hero">
        <div className="container-page">
          <p className="tavern-eyebrow">{eyebrow}</p>
          <h1 className="page-hero-title">{title}</h1>
          <p className="page-hero-copy">{description}</p>
        </div>
      </section>
      <section className="container-page grid gap-4 py-12 sm:grid-cols-2 lg:grid-cols-3">
        {terms.map((term) => {
          const count = counts[term] || 0;
          return (
            <Link
              key={term}
              href={`/categorias/${slugify(term)}`}
              className="term-card"
            >
              <h2 className="font-display text-xl font-bold leading-tight text-ink">{term}</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-ink/55">
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
