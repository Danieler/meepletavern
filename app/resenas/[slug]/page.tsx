import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BrandIcon } from "@/components/BrandIcon";
import { GameCoverImage } from "@/components/GameCoverImage";
import { PublicShell } from "@/components/PublicShell";
import { ReviewContent } from "@/components/reviews/ReviewContent";
import { ReviewRatingBadge } from "@/components/reviews/ReviewRatingBadge";
import { ReadingProgressBar } from "@/components/reviews/ReadingProgressBar";
import { ReviewCard } from "@/components/ReviewCard";
import { getReviewBySlug, getReviews } from "@/lib/catalog";
import { hasVerifiedCoverImage } from "@/lib/gameImages";
import { siteConfig } from "@/lib/site";

type ReviewPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const revalidate = 3600;

export async function generateStaticParams() {
  const reviews = await getReviews();
  return reviews.map((review) => ({
    slug: review.slug
  }));
}

export async function generateMetadata({ params }: ReviewPageProps): Promise<Metadata> {
  const { slug } = await params;
  const review = await getReviewBySlug(slug);

  if (!review) {
    return {
      title: "Reseña no encontrada",
      robots: { index: false, follow: false }
    };
  }

  const imageUrl = hasVerifiedCoverImage(review) && review.coverImageUrl ? review.coverImageUrl : null;

  return {
    title: review.title,
    description: review.summary,
    alternates: {
      canonical: `${siteConfig.url}/resenas/${review.slug}`
    },
    openGraph: {
      title: review.title,
      description: review.summary,
      type: "article",
      images: imageUrl ? [{ url: imageUrl, alt: review.coverImageAlt }] : []
    },
    twitter: {
      card: "summary_large_image",
      title: review.title,
      description: review.summary,
      images: imageUrl ? [imageUrl] : []
    }
  };
}

export default async function ReviewPage({ params }: ReviewPageProps) {
  const { slug } = await params;
  const [review, allReviews] = await Promise.all([
    getReviewBySlug(slug),
    getReviews()
  ]);

  if (!review) {
    notFound();
  }

  const wordCount = review.body ? review.body.split(/\s+/).length : 0;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  // Find related reviews (other reviews, excluding current)
  const relatedReviews = allReviews
    .filter((r) => r.slug !== review.slug)
    .slice(0, 4);

  // Find prev/next for navigation
  const currentIndex = allReviews.findIndex((r) => r.slug === review.slug);
  const prevReview = currentIndex > 0 ? allReviews[currentIndex - 1] : null;
  const nextReview = currentIndex >= 0 && currentIndex < allReviews.length - 1 ? allReviews[currentIndex + 1] : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Review",
    itemReviewed: {
      "@type": ["Product", "BoardGame"],
      name: review.gameTitle,
      url: `${siteConfig.url}/juegos/${review.gameSlug}`
    },
    author: {
      "@type": "Person",
      name: review.authorName
    },
    reviewBody: review.summary,
    reviewRating: {
      "@type": "Rating",
      ratingValue: review.rating,
      bestRating: 10,
      worstRating: 1
    },
    publisher: {
      "@type": "Organization",
      name: siteConfig.name
    },
    datePublished: review.publishedAt,
    headline: review.title,
    url: `${siteConfig.url}/resenas/${review.slug}`
  };

  return (
    <PublicShell>
      <main className="min-h-screen bg-[#fbf7ee]">
        <ReadingProgressBar />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <article>
          <header className="relative overflow-hidden border-b border-walnut/12 bg-[#fbf7ee]">
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(47,111,98,0.12),transparent_48%),linear-gradient(180deg,#fbf7ee_0%,#f2f8f4_100%)]" />
            <div className="container-page relative grid gap-8 py-8 sm:py-10 lg:grid-cols-[minmax(0,1fr)_minmax(340px,460px)] lg:items-center lg:py-12">
              <div className="min-w-0">
                <nav className="flex flex-wrap items-center gap-1.5" aria-label="Breadcrumb">
                  <Link href="/resenas" className="rounded-md border border-walnut/12 bg-white/70 px-2.5 py-1 text-[11px] font-black uppercase leading-4 tracking-[0.14em] text-walnut/68 shadow-sm transition hover:border-moss/35 hover:text-moss">
                    Reseñas
                  </Link>
                  <span className="text-walnut/35" aria-hidden="true">/</span>
                  <span className="rounded-md border border-moss/20 bg-moss/8 px-2.5 py-1 text-[11px] font-black uppercase leading-4 tracking-[0.14em] text-moss">
                    {review.gameTitle}
                  </span>
                </nav>

                <h1 className="font-display mt-5 max-w-5xl text-3xl font-black leading-[1.02] text-wood sm:text-5xl sm:leading-[0.98]">
                  {review.title}
                </h1>

                <p className="mt-5 max-w-3xl border-l-4 border-moss/50 pl-5 text-base font-semibold leading-8 text-walnut/78 sm:text-lg">
                  {review.summary}
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <ReviewRatingBadge rating={review.rating} size="md" tone="dark" />
                  <MetaChip>
                    <BrandIcon name="user" size={14} className="text-moss" />
                    Por{" "}
                    {review.authorUsername ? (
                      <Link href={`/u/${review.authorUsername}`} className="underline decoration-walnut/30 underline-offset-4 hover:text-moss">
                        {review.authorName}
                      </Link>
                    ) : (
                      review.authorName
                    )}
                  </MetaChip>
                  <MetaChip>
                    <BrandIcon name="calendar" size={14} className="text-moss" />
                    {formatDate(review.publishedAt)}
                  </MetaChip>
                  <MetaChip>
                    <BrandIcon name="clock" size={14} className="text-moss" />
                    {readingTime} min de lectura
                  </MetaChip>
                </div>

                <div className="mt-7 flex flex-wrap gap-3">
                  <Link href="#analisis" className="button-primary">
                    <BrandIcon name="book" size={16} />
                    Leer análisis
                  </Link>
                  <Link href="/resenas" className="button-secondary">
                    <BrandIcon name="document" size={16} />
                    Más reseñas
                  </Link>
                </div>
              </div>

              <aside className="min-w-0 overflow-hidden rounded-md border border-walnut/15 bg-[#12221d] text-white shadow-[0_18px_42px_rgba(28,42,36,0.18)] lg:justify-self-end">
                <div className="relative">
                  <GameCoverImage
                    {...review}
                    gameTitle={review.gameTitle}
                    variant="card"
                    priority
                    className="rounded-none lg:aspect-[2/1]"
                    imageSizes="(max-width: 1024px) 100vw, 460px"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_52%,rgba(18,34,29,0.88))]" />
                  <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-md border border-[#eab35c]/30 bg-[#1b2d27]/80 px-2.5 py-1 text-[11px] font-black uppercase leading-4 tracking-[0.12em] text-[#eab35c] backdrop-blur">
                    <BrandIcon name="book" size={13} />
                    Juego reseñado
                  </span>
                </div>
                <div className="grid gap-3 p-4 sm:p-5">
                  <p className="text-xs font-black uppercase leading-4 tracking-[0.12em] text-[#eab35c]">
                    {review.gameTitle}
                  </p>
                  <p className="text-sm font-semibold leading-6 text-parchment/78">
                    Ficha viva del juego, con nota sincronizada.
                  </p>
                  <div className="flex flex-wrap gap-2 border-t border-white/10 pt-3">
                    {review.gameSlug ? (
                      <Link href={`/juegos/${review.gameSlug}`} prefetch={false} className="inline-flex items-center gap-2 rounded-md bg-[#eab35c] px-3.5 py-2 text-sm font-black text-[#1f160f] transition hover:bg-white">
                        Ver ficha
                        <span aria-hidden="true">-&gt;</span>
                      </Link>
                    ) : null}
                  </div>
                </div>
              </aside>
            </div>
          </header>

          <section id="analisis" className="container-page grid scroll-mt-24 gap-8 py-10 lg:grid-cols-[minmax(0,860px)_minmax(280px,1fr)] lg:items-start lg:py-12">
            <div className="min-w-0 rounded-md border border-walnut/12 bg-white p-5 shadow-soft sm:p-8 lg:p-10">
              <ReviewContent body={review.body} className="text-[#1f1f1f]/90" />
            </div>

            <aside className="space-y-4 lg:sticky lg:top-24">
              <section className="rounded-md border border-moss/20 bg-[linear-gradient(135deg,#f3faf7_0%,#edf7f4_50%,#f0f9f6_100%)] p-5 shadow-soft">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-moss/12 text-moss">
                    <BrandIcon name="bookmark" size={18} />
                  </span>
                  <p className="tavern-eyebrow text-moss">Tu siguiente paso</p>
                </div>
                <h2 className="font-display mt-3 text-xl font-bold leading-tight text-wood sm:text-2xl">
                  Convierte la reseña en partida
                </h2>
                <p className="mt-2 text-sm font-medium leading-6 text-walnut/70">
                  Consulta datos, alternativas y opiniones de otros jugadores antes de decidir si encaja en tu mesa.
                </p>
                <div className="mt-5 grid gap-2">
                  {review.gameSlug ? (
                    <Link href={`/juegos/${review.gameSlug}`} prefetch={false} className="button-primary justify-center">
                      <BrandIcon name="dice" size={16} />
                      Ver datos y alternativas
                    </Link>
                  ) : null}
                  <Link href={`/juegos/${review.gameSlug}/resena`} prefetch={false} className="button-secondary justify-center">
                    <BrandIcon name="document" size={16} />
                    Escribir mi reseña
                  </Link>
                </div>
              </section>

              <section className="rounded-md border border-walnut/12 bg-paper p-5 shadow-soft">
                <p className="tavern-eyebrow">Ficha rápida</p>
                <dl className="mt-4 space-y-3 text-sm font-semibold text-walnut/78">
                  <ReviewFact icon="dice" label="Juego" value={review.gameTitle} />
                  <ReviewFact icon="star" label="Nota ficha" value={`${formatRating(review.rating)}/10`} />
                  <ReviewFact icon="user" label="Autor" value={review.authorName} />
                  <ReviewFact icon="calendar" label="Publicado" value={formatDate(review.publishedAt)} />
                  <ReviewFact icon="clock" label="Lectura" value={`${readingTime} min`} />
                </dl>
              </section>
            </aside>
          </section>

          {(prevReview || nextReview) ? (
            <section className="container-page pb-10">
              <div className="grid gap-4 sm:grid-cols-2">
                {prevReview ? (
                  <Link
                    href={`/resenas/${prevReview.slug}`}
                    className="group flex items-center gap-4 rounded-md border border-walnut/12 bg-paper p-4 shadow-soft transition hover:-translate-y-0.5 hover:border-moss/30"
                  >
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-walnut/12 bg-walnut/5 text-walnut/60 transition group-hover:border-moss/25 group-hover:bg-moss/8 group-hover:text-moss">
                      <BrandIcon name="chevron-left" size={18} />
                    </span>
                    <span className="min-w-0">
                      <span className="tavern-meta block">Anterior</span>
                      <span className="mt-1 block truncate text-sm font-bold text-wood">{prevReview.title}</span>
                    </span>
                  </Link>
                ) : <span />}
                {nextReview ? (
                  <Link
                    href={`/resenas/${nextReview.slug}`}
                    className="group flex items-center justify-end gap-4 rounded-md border border-walnut/12 bg-paper p-4 text-right shadow-soft transition hover:-translate-y-0.5 hover:border-moss/30"
                  >
                    <span className="min-w-0">
                      <span className="tavern-meta block">Siguiente</span>
                      <span className="mt-1 block truncate text-sm font-bold text-wood">{nextReview.title}</span>
                    </span>
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-walnut/12 bg-walnut/5 text-walnut/60 transition group-hover:border-moss/25 group-hover:bg-moss/8 group-hover:text-moss">
                      <BrandIcon name="chevron-right" size={18} />
                    </span>
                  </Link>
                ) : null}
              </div>
            </section>
          ) : null}

          {relatedReviews.length > 0 ? (
            <section className="container-page pb-10">
              <SectionHeader
                eyebrow="Sigue leyendo"
                title="Más reseñas que te pueden interesar"
              />
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-2">
                {relatedReviews.slice(0, 2).map((r) => (
                  <ReviewCard key={r.slug} review={r} />
                ))}
              </div>
            </section>
          ) : null}

          <footer className="container-page pb-14">
            <div className="flex flex-col gap-4 border-t border-walnut/15 pt-8 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-3">
                <Link href="/resenas" className="button-secondary text-xs">
                  Ver más reseñas
                </Link>
                <Link href="/juegos" prefetch={false} className="button-secondary text-xs">
                  Explorar juegos
                </Link>
              </div>
              <Link href="/instagram?utm_source=instagram&utm_medium=social&utm_campaign=review_footer&utm_content=review_detail" className="inline-flex items-center gap-2 text-sm font-black text-moss hover:text-wood">
                <BrandIcon name="star" size={16} />
                Últimas desde Instagram
              </Link>
            </div>
          </footer>
        </article>
      </main>
    </PublicShell>
  );
}

function MetaChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-walnut/12 bg-white/70 px-3 py-1 text-xs font-black uppercase leading-4 tracking-[0.11em] text-walnut/68 shadow-sm">
      {children}
    </span>
  );
}

function ReviewFact({ icon, label, value }: { icon: "dice" | "star" | "user" | "calendar" | "clock"; label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-walnut/10 pb-3 last:border-b-0 last:pb-0">
      <dt className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-walnut/55">
        <BrandIcon name={icon} size={14} />
        {label}
      </dt>
      <dd className="max-w-[14rem] text-right text-wood">{value}</dd>
    </div>
  );
}

function formatRating(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function SectionHeader({ eyebrow, title }: { eyebrow?: string; title: string }) {
  return (
    <div className="mb-6 max-w-3xl sm:mb-7">
      {eyebrow ? (
        <p className="tavern-eyebrow mb-2">{eyebrow}</p>
      ) : null}
      <div className="flex items-start gap-3">
        <span className="mt-3 hidden h-1.5 w-9 rounded-full bg-ember sm:block" />
        <h2 className="tavern-title text-2xl sm:text-3xl lg:text-4xl">{title}</h2>
      </div>
    </div>
  );
}
