import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/PublicShell";
import { SectionHeader } from "@/components/SectionHeader";
import { SEOTextBlock } from "@/components/SEOTextBlock";
import { getGuias } from "@/lib/guias";

import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Guías de compra y recomendaciones de juegos de mesa",
  description: "Descubre los mejores juegos de mesa con nuestras guías temáticas: para dos jugadores, familiares, cooperativos, party games y mucho más.",
  alternates: {
    canonical: "/guias"
  },
  openGraph: {
    title: "Guías de compra y recomendaciones de juegos de mesa | MeepleTavern",
    description: "Descubre los mejores juegos de mesa con nuestras guías temáticas: para dos jugadores, familiares, cooperativos, party games y mucho más.",
    url: "/guias",
    type: "website"
  }
};

export const revalidate = 3600;

export default async function GuiasIndexPage() {
  const guias = await getGuias();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Guías de compra y recomendaciones de juegos de mesa",
    description: "Colecciones y listas curadas para ayudarte a encontrar el juego de mesa perfecto para tu grupo y ocasión.",
    url: `${siteConfig.url}/guias`,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: guias.map((guia, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${siteConfig.url}/guias/${guia.slug}`
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
            <p className="tavern-eyebrow">Selecciones de la Taberna</p>
            <h1 className="page-hero-title">Guías de Compra</h1>
            <p className="page-hero-copy">
              Colecciones y listas curadas para ayudarte a encontrar el juego de mesa perfecto para tu grupo y ocasión.
            </p>
          </div>
        </section>
        
        <section className="container-page py-12">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {guias.map((guia) => (
              <Link 
                key={guia.slug} 
                href={`/guias/${guia.slug}`}
                className="group flex flex-col justify-between rounded-xl border border-walnut/15 bg-white p-6 shadow-sm transition-all hover:border-ember hover:shadow-md"
              >
                <div>
                  <h2 className="font-display text-xl font-bold text-wood group-hover:text-ember transition-colors">
                    {guia.title}
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-walnut/80">
                    {guia.description}
                  </p>
                </div>
                <div className="mt-6 flex items-center text-sm font-bold text-ember">
                  Ver guía <span className="ml-2">→</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="container-page pb-14">
          <SEOTextBlock title="¿Por qué usar nuestras guías de juegos de mesa?">
            <p>
              Sabemos que el catálogo infinito de juegos puede ser abrumador. Por eso, hemos creado estas páginas de decisión basadas en las preguntas más frecuentes de nuestra comunidad. Si buscas un regalo, algo parecido a tu juego favorito o la mejor opción para un grupo específico, aquí tienes la respuesta directa.
            </p>
          </SEOTextBlock>
        </section>
      </main>
    </PublicShell>
  );
}
