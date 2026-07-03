import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicShell } from "@/components/PublicShell";
import { GameCard } from "@/components/GameCard";
import { SEOTextBlock } from "@/components/SEOTextBlock";
import { filterGames, getCategoryTerms } from "@/lib/catalog";
import { slugify } from "@/lib/slug";
import { siteConfig } from "@/lib/site";
import { Pagination } from "@/components/Pagination";

type CategoryPageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    page?: string;
  }>;
};

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const terms = await getCategoryTerms();
  const term = terms.find((t) => slugify(t) === slug);

  if (!term) {
    return {
      title: "Categoría no encontrada",
      robots: { index: false, follow: false }
    };
  }

  const title = `Mejores juegos de mesa de categoría ${term}`;
  const description = `Descubre los mejores juegos de mesa de tipo ${term}. Ranking, opiniones, duración y características para elegir tu próximo juego.`;

  return {
    title,
    description,
    alternates: {
      canonical: `${siteConfig.url}/categorias/${slug}`
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: `${siteConfig.url}/categorias/${slug}`
    }
  };
}

export const revalidate = 3600;

export async function generateStaticParams() {
  const terms = await getCategoryTerms();
  return terms.map((term) => ({
    slug: slugify(term)
  }));
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { slug } = await params;
  const terms = await getCategoryTerms();
  const term = terms.find((t) => slugify(t) === slug);

  if (!term) {
    notFound();
  }

  const { page } = await searchParams;
  const { games, total, totalPages, page: currentPage } = await filterGames({
    category: term,
    page: page || "1",
    sort: "valoracion"
  });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `Juegos de mesa ${term}`,
    description: `Catálogo de juegos de mesa de categoría ${term}`,
    url: `${siteConfig.url}/categorias/${slug}`,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: games.map((game, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${siteConfig.url}/juegos/${game.slug}`
      }))
    }
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
            <p className="tavern-eyebrow">Categoría de juego</p>
            <h1 className="page-hero-title">Juegos de mesa {term}</h1>
            <p className="page-hero-copy">
              Explora los {total} mejores juegos etiquetados como {term}, ordenados por valoración de la comunidad y crítica.
            </p>
          </div>
        </section>

        <section className="container-page py-10 lg:py-14">
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {games.map((game) => (
              <GameCard key={game.slug} game={game} />
            ))}
          </div>
          
          <div className="mt-10">
            {totalPages > 1 ? (
              <Pagination
                active={{ category: term }}
                totalPages={totalPages}
                currentPage={currentPage}
                basePath={`/categorias/${slug}`}
                omitQueryKeys={["category"]}
              />
            ) : null}
          </div>
        </section>

        <section className="container-page pb-14">
          <SEOTextBlock title={`¿Qué define a un juego ${term}?`}>
            <p>
              En MeepleTavern clasificamos los juegos con la etiqueta <strong>{term}</strong> cuando esta es la 
              experiencia principal que vas a encontrar en la mesa. Estos juegos destacan en sus mecánicas 
              y público objetivo, y esta lista recoge los títulos más recomendados y populares de esta categoría.
            </p>
          </SEOTextBlock>
        </section>
      </main>
    </PublicShell>
  );
}
