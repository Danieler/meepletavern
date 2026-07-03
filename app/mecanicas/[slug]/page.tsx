import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicShell } from "@/components/PublicShell";
import { GameCard } from "@/components/GameCard";
import { SEOTextBlock } from "@/components/SEOTextBlock";
import { filterGames, getMechanicTerms } from "@/lib/catalog";
import { slugify } from "@/lib/slug";
import { siteConfig } from "@/lib/site";
import { Pagination } from "@/components/Pagination";

type MechanicPageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    page?: string;
  }>;
};

export async function generateMetadata({ params }: MechanicPageProps): Promise<Metadata> {
  const { slug } = await params;
  const terms = await getMechanicTerms();
  const term = terms.find((t) => slugify(t) === slug);

  if (!term) {
    return {
      title: "Mecánica no encontrada",
      robots: { index: false, follow: false }
    };
  }

  const title = `Mejores juegos de mesa con mecánica de ${term}`;
  const description = `Descubre los mejores juegos de mesa que utilizan la mecánica de ${term}. Ranking, opiniones, duración y características para elegir tu próximo juego.`;

  return {
    title,
    description,
    alternates: {
      canonical: `${siteConfig.url}/mecanicas/${slug}`
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: `${siteConfig.url}/mecanicas/${slug}`
    }
  };
}

export const revalidate = 3600;

export async function generateStaticParams() {
  const terms = await getMechanicTerms();
  return terms.map((term) => ({
    slug: slugify(term)
  }));
}

export default async function MechanicPage({ params, searchParams }: MechanicPageProps) {
  const { slug } = await params;
  const terms = await getMechanicTerms();
  const term = terms.find((t) => slugify(t) === slug);

  if (!term) {
    notFound();
  }

  const { page } = await searchParams;
  const { games, total, totalPages, page: currentPage } = await filterGames({
    mechanic: term,
    page: page || "1",
    sort: "valoracion"
  });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `Juegos de mesa con mecánica de ${term}`,
    description: `Catálogo de juegos de mesa con la mecánica principal de ${term}`,
    url: `${siteConfig.url}/mecanicas/${slug}`,
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
            <p className="tavern-eyebrow">Mecánica de juego</p>
            <h1 className="page-hero-title">Juegos de mesa de {term}</h1>
            <p className="page-hero-copy">
              Explora los {total} mejores juegos que implementan de forma excelente la mecánica de {term}, ordenados por valoración.
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
                active={{ mechanic: term }}
                totalPages={totalPages}
                currentPage={currentPage}
                basePath={`/mecanicas/${slug}`}
                omitQueryKeys={["mechanic"]}
              />
            ) : null}
          </div>
        </section>

        <section className="container-page pb-14">
          <SEOTextBlock title={`¿En qué consiste la mecánica de ${term}?`}>
            <p>
              En MeepleTavern clasificamos los juegos con la etiqueta <strong>{term}</strong> cuando esta mecánica 
              es un pilar fundamental en el desarrollo de la partida. Si te gusta este estilo de juego y las 
              sensaciones que aporta, esta selección incluye los títulos más destacados con esta mecánica.
            </p>
          </SEOTextBlock>
        </section>
      </main>
    </PublicShell>
  );
}
