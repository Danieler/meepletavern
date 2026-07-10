import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicShell } from "@/components/PublicShell";
import { GameCard } from "@/components/GameCard";
import { SEOTextBlock } from "@/components/SEOTextBlock";
import { getGuiaBySlug, getGuias, getGamesForGuia } from "@/lib/guias";
import { siteConfig } from "@/lib/site";

type GuiaPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const revalidate = 3600;

export async function generateMetadata({ params }: GuiaPageProps): Promise<Metadata> {
  const { slug } = await params;
  const guia = await getGuiaBySlug(slug);

  if (!guia) {
    return {
      title: "Guía no encontrada",
      robots: { index: false, follow: false }
    };
  }

  return {
    title: guia.title,
    description: guia.description,
    alternates: {
      canonical: `${siteConfig.url}/guias/${guia.slug}`
    },
    openGraph: {
      title: guia.title,
      description: guia.description,
      type: "article",
      url: `${siteConfig.url}/guias/${guia.slug}`
    },
    twitter: {
      card: "summary_large_image",
      title: guia.title,
      description: guia.description
    }
  };
}

export async function generateStaticParams() {
  const guias = await getGuias();
  return guias.map((g) => ({
    slug: g.slug
  }));
}

export default async function GuiaPage({ params }: GuiaPageProps) {
  const { slug } = await params;
  const guia = await getGuiaBySlug(slug);

  if (!guia) {
    notFound();
  }

  const games = await getGamesForGuia(guia);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: guia.title,
    description: guia.description,
    url: `${siteConfig.url}/guias/${guia.slug}`,
    itemListElement: games.map((game, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${siteConfig.url}/juegos/${game.slug}`
    }))
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
            <p className="tavern-eyebrow">Guía de compra</p>
            <h1 className="page-hero-title">{guia.title}</h1>
            <p className="page-hero-copy">{guia.description}</p>
          </div>
        </section>
        
        <section className="container-page py-12">
          {games.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {games.map((game) => (
                <GameCard key={game.slug} game={game} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-walnut/15 bg-white p-8 text-center shadow-sm">
              <p className="text-lg font-medium text-walnut">
                Aún no hay juegos recomendados para esta guía, ¡vuelve pronto!
              </p>
            </div>
          )}
        </section>

        <section className="container-page pb-14">
          <SEOTextBlock title={`Por qué elegir ${guia.title.toLowerCase()}`}>
            <p className="whitespace-pre-wrap">{guia.content}</p>
          </SEOTextBlock>
        </section>
      </main>
    </PublicShell>
  );
}
