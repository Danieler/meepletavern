import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Compass, Search, Sparkles } from "lucide-react";
import { BrandIcon } from "@/components/BrandIcon";
import { GameCoverImage } from "@/components/GameCoverImage";
import { PublicShell } from "@/components/PublicShell";
import { SEOTextBlock } from "@/components/SEOTextBlock";
import { ReviewRatingBadge } from "@/components/reviews/ReviewRatingBadge";
import { ReviewsExplorer } from "@/components/reviews/ReviewsExplorer";
import { getReviews, type Review } from "@/lib/catalog";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Reseñas de juegos de mesa",
  description:
    "Reseñas de juegos de mesa en español con puntuación, resumen, opinión, pros, contras y recomendaciones para distintas mesas.",
  alternates: {
    canonical: "/resenas"
  },
  openGraph: {
    title: "Reseñas de juegos de mesa | MeepleTavern",
    description:
      "Reseñas de juegos de mesa en español para saber cómo funciona cada juego, para quién encaja y cuándo merece la pena.",
    url: "/resenas",
    type: "website"
  }
};

export const revalidate = 3600;

export default async function ReviewsPage() {
  const reviews = await getReviews();
  const featured = reviews[0];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Reseñas de juegos de mesa",
    description: "Reseñas de juegos de mesa en español para decidir mejor qué sacar a mesa.",
    url: `${siteConfig.url}/resenas`,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: reviews.map((review, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${siteConfig.url}/resenas/${review.slug}`
      }))
    }
  };

  return (
    <PublicShell>
      <main className="bg-surface-base">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        <ReviewsHero featured={featured} reviewCount={reviews.length} />

        <section className="border-b border-border-subtle bg-white/60">
          <div className="container-page grid gap-0 sm:grid-cols-3">
            <EditorialPromise
              icon={Compass}
              title="Encaje de mesa"
              copy="Jugadores, ritmo y fricción real."
            />
            <EditorialPromise
              icon={BookOpen}
              title="Criterio editorial"
              copy="Qué aporta y dónde se queda corto."
            />
            <EditorialPromise
              icon={Sparkles}
              title="Siguiente paso"
              copy="Alternativas si este no es el tuyo."
            />
          </div>
        </section>

        <section id="archivo-resenas" className="container-page scroll-mt-24 py-12 lg:py-16" aria-labelledby="reviews-archive-title">
          <div className="mb-7 max-w-3xl">
            <p className="tavern-eyebrow text-accent">Archivo editorial</p>
            <h2 id="reviews-archive-title" className="font-display mt-2 text-3xl font-bold leading-tight text-text-primary sm:text-4xl lg:text-5xl">
              Encuentra una reseña para tu próxima decisión
            </h2>
            <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-text-secondary">
              Busca por título o juego, filtra por nota y ordena el archivo según lo que necesites ahora.
            </p>
          </div>

          {reviews.length ? (
            <ReviewsExplorer reviews={reviews} />
          ) : (
            <div className="rounded-lg border border-border-subtle bg-paper p-6 shadow-soft">
              <p className="text-sm font-semibold leading-6 text-text-secondary">
                Estamos preparando los primeros análisis de la taberna.
              </p>
            </div>
          )}

          <ReviewsContributionEndcap />
        </section>

        <section className="container-page pb-14">
          <SEOTextBlock title="Reseñas largas, fichas rápidas y recomendaciones">
            <p>
              Las reseñas de MeepleTavern complementan el catálogo: resumen rápido en cada ficha y
              artículos más largos cuando merece la pena explicar ritmo, sensaciones, público
              recomendado y alternativas.
            </p>
          </SEOTextBlock>
        </section>
      </main>
    </PublicShell>
  );
}

function ReviewsHero({ featured, reviewCount }: { featured?: Review; reviewCount: number }) {
  return (
    <section className="relative isolate overflow-hidden bg-surface-dark text-white">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_10%,rgba(193,123,26,0.2),transparent_30rem),linear-gradient(120deg,#1C1210_0%,#2A1B14_54%,#130C08_100%)]" />
      <div className="container-page grid gap-10 py-12 sm:py-16 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)] lg:items-center lg:py-20">
        <div className="max-w-3xl">
          <p className="inline-flex min-h-8 items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 text-xs font-bold uppercase tracking-eyebrow text-accent-light">
            <BookOpen size={15} aria-hidden="true" />
            Reseñas de juegos de mesa
          </p>
          <h1 className="font-display mt-5 text-5xl font-bold leading-[0.96] text-white sm:text-6xl lg:text-7xl">
            Menos hype. <span className="text-accent-light">Mejores partidas.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg font-medium leading-8 text-text-on-dark/85">
            Análisis para saber qué aporta un juego, con quién funciona y si realmente merece un sitio en tu mesa.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="#archivo-resenas" className="button-primary min-h-12 px-5">
              <Search size={17} aria-hidden="true" />
              Explorar {reviewCount ? `${reviewCount} reseñas` : "reseñas"}
            </Link>
            <Link
              href="/juegos"
              className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-5 text-sm font-bold text-white transition hover:border-white/40 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action"
            >
              Ver catálogo
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>

        {featured ? <FeaturedReviewPanel review={featured} /> : null}
      </div>
    </section>
  );
}

function FeaturedReviewPanel({ review }: { review: Review }) {
  return (
    <article className="group min-w-0 overflow-hidden rounded-xl border border-white/15 bg-white/[0.04] p-3 shadow-[0_24px_70px_rgba(0,0,0,0.3)] backdrop-blur">
      <Link
        href={`/resenas/${review.slug}`}
        className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-4 focus-visible:ring-offset-surface-dark"
        aria-label={`Leer reseña destacada de ${review.title}`}
      >
        <div className="relative overflow-hidden rounded-lg bg-surface-dark">
          <GameCoverImage
            {...review}
            gameTitle={review.gameTitle}
            variant="detail"
            priority
            showPlaceholderLabel={false}
            className="rounded-lg transition duration-500 group-hover:scale-[1.02] motion-reduce:transform-none"
            imageSizes="(max-width: 1024px) 92vw, 620px"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_30%,rgba(6,16,12,0.96)_100%)]" />
          <span className="absolute left-4 top-4 inline-flex min-h-8 items-center gap-2 rounded-full border border-white/20 bg-surface-dark/90 px-3 text-micro font-bold uppercase tracking-eyebrow text-accent-light backdrop-blur">
            <BrandIcon name="flame" size={14} />
            Análisis destacado
          </span>
          <ReviewRatingBadge rating={review.rating} size="sm" tone="dark" className="absolute right-4 top-4" />

          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
            <p className="text-xs font-bold uppercase tracking-eyebrow text-accent-light">{review.gameTitle}</p>
            <h2 className="font-display mt-2 text-2xl font-bold leading-tight text-white sm:text-3xl">
              {review.title}
            </h2>
            <p className="mt-3 line-clamp-2 text-sm font-medium leading-6 text-text-on-dark/85">
              {review.summary}
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/15 pt-4">
              <p className="text-xs font-medium uppercase tracking-eyebrow text-text-on-dark/65">
                Por {review.authorName} · {formatDate(review.publishedAt)}
              </p>
              <span className="inline-flex items-center gap-2 text-sm font-bold text-accent-light">
                Leer análisis <ArrowRight size={16} aria-hidden="true" />
              </span>
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}

function EditorialPromise({
  icon: Icon,
  title,
  copy
}: {
  icon: typeof Compass;
  title: string;
  copy: string;
}) {
  return (
    <div className="flex min-w-0 gap-3 border-b border-border-subtle py-5 last:border-b-0 sm:border-b-0 sm:border-r sm:px-5 sm:first:pl-0 sm:last:border-r-0 sm:last:pr-0">
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-subtle text-accent">
        <Icon size={19} aria-hidden="true" />
      </span>
      <div>
        <p className="font-display text-lg font-bold leading-tight text-text-primary">{title}</p>
        <p className="mt-1 text-sm font-semibold leading-5 text-text-secondary">{copy}</p>
      </div>
    </div>
  );
}

function ReviewsContributionEndcap() {
  return (
    <section className="mt-12 overflow-hidden rounded-lg border border-accent/20 bg-gradient-to-br from-paper to-surface-muted p-5 sm:p-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-2xl">
          <p className="tavern-eyebrow text-accent">Tu experiencia también ayuda</p>
          <h2 className="font-display mt-2 text-2xl font-bold leading-tight text-text-primary sm:text-3xl">
            Comparte lo que aprendiste en tu mesa
          </h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-text-secondary">
            Busca el juego y publica una opinión útil cuando tengas algo que pueda ayudar a otra persona a decidir.
          </p>
        </div>
        <Link href="/juegos" className="button-secondary shrink-0 justify-center">
          <BrandIcon name="search" size={16} />
          Buscar juego
        </Link>
      </div>
    </section>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}
