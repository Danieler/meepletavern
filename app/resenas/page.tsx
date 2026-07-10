import type { Metadata } from "next";
import Link from "next/link";
import { BrandIcon, type BrandIconName } from "@/components/BrandIcon";
import { GameCoverImage } from "@/components/GameCoverImage";
import { PublicShell } from "@/components/PublicShell";
import { ReviewCard } from "@/components/ReviewCard";
import { ReviewRatingBadge } from "@/components/reviews/ReviewRatingBadge";
import { SectionHeader } from "@/components/SectionHeader";
import { SEOTextBlock } from "@/components/SEOTextBlock";
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
    description: "Reseñas de juegos de mesa en español con puntuación, resumen, opinión, pros, contras y recomendaciones para distintas mesas.",
    url: "/resenas",
    type: "website"
  }
};

export const revalidate = 3600;

export default async function ReviewsPage() {
  const reviews = await getReviews();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Reseñas de juegos de mesa",
    description: "Reseñas de juegos de mesa en español con puntuación, resumen, opinión, pros, contras y recomendaciones para distintas mesas.",
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
      <main className="bg-[#fbf7ee]">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <ReviewsHero featured={reviews[0]} recentReviews={reviews.slice(1, 3)} />
        <ReviewsResults reviews={reviews} />
        <section className="container-page pb-14">
          <SEOTextBlock title="Reseñas largas, fichas rápidas y recomendaciones">
            <p>
              Las reseñas de MeepleTavern están pensadas para complementar el catálogo: resumen
              rápido en cada ficha y artículos más largos cuando merece la pena explicar ritmo,
              sensaciones, público recomendado y alternativas.
            </p>
          </SEOTextBlock>
        </section>
      </main>
    </PublicShell>
  );
}

function ReviewsHero({
  featured,
  recentReviews
}: {
  featured?: Review;
  recentReviews: Review[];
}) {
  return (
    <section className="relative overflow-hidden border-b border-walnut/12 bg-[#fbf7ee]">
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(47,111,98,0.12),transparent_48%),linear-gradient(180deg,#fbf7ee_0%,#f2f8f4_100%)]" />
      <div className="container-page relative py-8 sm:py-10 lg:py-12">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(340px,480px)] lg:items-center">
          <div className="max-w-4xl">
            <p className="tavern-eyebrow text-moss">Reseñas de juegos de mesa</p>
            <h1 className="font-display mt-3 max-w-4xl text-4xl font-black leading-[0.98] text-wood sm:text-5xl lg:text-6xl">
              Elige mejor tu próxima partida
            </h1>
            <p className="mt-5 max-w-3xl text-base font-semibold leading-8 text-walnut/78 sm:text-lg">
              Opiniones pensadas para decidir: qué aporta el juego, para qué mesa funciona,
              cuándo merece la pena y qué mirar si no encaja.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="#archivo-resenas" className="button-primary">
                <BrandIcon name="document" size={17} />
                Ver archivo de reseñas
              </Link>
              <Link href="/juegos" className="button-secondary">
                <BrandIcon name="sliders" size={17} />
                Explorar catálogo
              </Link>
            </div>

            <div className="mt-8 grid gap-4 border-y border-walnut/12 py-5 sm:grid-cols-3">
              <ReviewPromise icon="gauge" title="Encaje de mesa" copy="Número de jugadores, ritmo y fricción real." />
              <ReviewPromise icon="star" title="Nota de ficha" copy="Puntuación sincronizada con cada juego." />
              <ReviewPromise icon="tag" title="Alternativas" copy="Qué probar si este juego no es el tuyo." />
            </div>

            {recentReviews.length ? (
              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
                <p className="tavern-meta text-walnut/55">Otros análisis</p>
                <div className="flex min-w-0 flex-wrap gap-2">
                  {recentReviews.map((review) => (
                    <Link
                      key={review.slug}
                      href={`/resenas/${review.slug}`}
                      className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-walnut/12 bg-white/70 px-2.5 py-1.5 text-xs font-black leading-4 text-wood shadow-sm transition hover:border-moss/35 hover:text-moss"
                    >
                      <BrandIcon name="chevron-right" size={13} />
                      <span className="truncate">{review.gameTitle}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {featured ? <FeaturedReviewPanel review={featured} /> : null}
        </div>
      </div>
    </section>
  );
}

function FeaturedReviewPanel({ review }: { review: Review }) {
  return (
    <article className="group relative min-w-0 max-w-full overflow-hidden rounded-md border border-walnut/15 bg-[#12221d] text-white shadow-[0_18px_42px_rgba(28,42,36,0.18)] lg:justify-self-end">
      <Link href={`/resenas/${review.slug}`} className="block min-w-0" aria-label={`Leer reseña destacada de ${review.title}`}>
        <div className="relative">
          <GameCoverImage
            {...review}
            gameTitle={review.gameTitle}
            variant="card"
            priority
            className="rounded-none lg:aspect-[2/1]"
            imageSizes="(max-width: 1024px) 100vw, 520px"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_52%,rgba(18,34,29,0.88))]" />
          <ReviewRatingBadge rating={review.rating} size="md" tone="dark" className="absolute bottom-4 right-4" />
          <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-md border border-[#eab35c]/30 bg-[#1b2d27]/80 px-2.5 py-1 text-[11px] font-black uppercase leading-4 tracking-[0.12em] text-[#eab35c] backdrop-blur">
            <BrandIcon name="flame" size={13} />
            Análisis destacado
          </span>
        </div>

        <div className="grid gap-4 p-4 sm:p-5">
          <div>
            <p className="text-xs font-black uppercase leading-4 tracking-[0.12em] text-[#eab35c]">
              {review.gameTitle}
            </p>
            <h2 className="font-display mt-2 text-xl font-bold leading-tight text-white transition group-hover:text-[#eab35c] sm:text-2xl">
              {review.title}
            </h2>
            <p className="mt-3 line-clamp-2 text-sm font-semibold leading-6 text-parchment/78">
              {review.summary}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
            <p className="inline-flex items-center gap-2 text-xs font-black uppercase leading-4 tracking-[0.12em] text-parchment/62">
              <BrandIcon name="calendar" size={15} />
              {formatDate(review.publishedAt)}
            </p>
            <span className="inline-flex items-center gap-2 rounded-md bg-[#eab35c] px-3.5 py-2 text-sm font-black text-[#1f160f] transition group-hover:bg-white">
              Leer análisis
              <span aria-hidden="true">-&gt;</span>
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}

function ReviewPromise({
  icon,
  title,
  copy
}: {
  icon: BrandIconName;
  title: string;
  copy: string;
}) {
  return (
    <div className="flex min-w-0 gap-3">
      <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-moss/10 text-moss">
        <BrandIcon name={icon} size={18} />
      </span>
      <div className="min-w-0">
        <p className="font-display text-xl font-bold leading-tight text-wood">{title}</p>
        <p className="mt-1 text-sm font-semibold leading-5 text-walnut/64">{copy}</p>
      </div>
    </div>
  );
}

function ReviewsResults({ reviews }: { reviews: Review[] }) {
  if (!reviews.length) {
    return (
      <section className="container-page py-12">
        <SectionHeader
          title="Últimas reseñas"
          description="Piezas pensadas para escanear rápido y entrar al detalle cuando un juego te llama."
        />
        <section className="surface-muted p-6 shadow-soft">
          <p className="text-sm font-semibold text-ink/65">
            De momento las reseñas se publicarán manualmente. Esta sección todavía no tiene contenido.
          </p>
        </section>
      </section>
    );
  }

  const [, ...reviewGrid] = reviews;

  return (
    <section id="archivo-resenas" className="container-page scroll-mt-24 py-10 lg:py-12">
      <SectionHeader
        eyebrow="Archivo editorial"
        title="Reseñas recientes para decidir rápido"
        description="Cada pieza conecta una opinión larga con la ficha del juego, su nota actual y el siguiente paso natural."
      />

      {reviewGrid.length > 0 ? (
        <div className="grid gap-5 lg:grid-cols-2">
          {reviewGrid.map((review) => (
            <ReviewCard key={review.slug} review={review} />
          ))}
        </div>
      ) : (
        <section className="surface-muted p-6 shadow-soft">
          <p className="text-sm font-semibold text-ink/65">
            Solo hay una reseña publicada por ahora. La siguiente aparecerá aquí sin repetir la destacada.
          </p>
        </section>
      )}

      <ReviewsContributionEndcap />
    </section>
  );
}

function ReviewsContributionEndcap() {
  return (
    <section className="mt-10 flex flex-col gap-4 border-t border-walnut/15 pt-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="max-w-2xl">
        <p className="tavern-eyebrow text-moss">Tu mesa también cuenta</p>
        <h2 className="font-display mt-2 text-2xl font-bold leading-tight text-wood">
          Publica una reseña desde la ficha del juego
        </h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-walnut/70">
          Busca el juego y aporta una opinión útil cuando tengas algo que ayude a otra mesa a decidir.
        </p>
      </div>
      <Link href="/juegos" className="button-secondary justify-center">
        <BrandIcon name="search" size={16} />
        Buscar juego
      </Link>
    </section>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(new Date(value));
}
