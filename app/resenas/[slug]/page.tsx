import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowDown, ArrowRight, BookOpen, ChevronLeft, ChevronRight, Clock3 } from "lucide-react";
import { BrandIcon } from "@/components/BrandIcon";
import { GameCoverImage } from "@/components/GameCoverImage";
import { PublicShell } from "@/components/PublicShell";
import { ReviewCard } from "@/components/ReviewCard";
import { SectionHeader } from "@/components/SectionHeader";
import { ReadingProgressBar } from "@/components/reviews/ReadingProgressBar";
import { ReviewActions } from "@/components/reviews/ReviewActions";
import { ReviewContent, getReviewHeadings } from "@/components/reviews/ReviewContent";
import { ReviewRatingBadge } from "@/components/reviews/ReviewRatingBadge";
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
  return reviews.map((review) => ({ slug: review.slug }));
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
  const [review, allReviews] = await Promise.all([getReviewBySlug(slug), getReviews()]);

  if (!review) notFound();

  const wordCount = review.body.trim() ? review.body.trim().split(/\s+/).length : 0;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));
  const headings = getReviewHeadings(review.body);
  const relatedReviews = allReviews.filter((item) => item.slug !== review.slug).slice(0, 3);
  const currentIndex = allReviews.findIndex((item) => item.slug === review.slug);
  const prevReview = currentIndex > 0 ? allReviews[currentIndex - 1] : null;
  const nextReview = currentIndex >= 0 && currentIndex < allReviews.length - 1
    ? allReviews[currentIndex + 1]
    : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: review.title,
    description: review.summary,
    datePublished: review.publishedAt,
    author: {
      "@type": "Person",
      name: review.authorName,
      ...(review.authorUsername ? { url: `${siteConfig.url}/u/${review.authorUsername}` } : {})
    },
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      url: siteConfig.url
    },
    about: {
      "@type": "Thing",
      name: review.gameTitle,
      url: `${siteConfig.url}/juegos/${review.gameSlug}`
    },
    ...(hasVerifiedCoverImage(review) && review.coverImageUrl ? { image: review.coverImageUrl } : {}),
    mainEntityOfPage: `${siteConfig.url}/resenas/${review.slug}`
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
          <header className="relative isolate overflow-hidden bg-[#2a170f] text-white">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_8%,rgba(201,130,31,0.3),transparent_30rem),linear-gradient(115deg,#2a170f_0%,#3a2118_56%,#1b0f0a_100%)]" />
            <div className="container-page grid gap-10 py-10 sm:py-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(380px,0.75fr)] lg:items-center lg:py-16">
              <div className="min-w-0 max-w-5xl">
                <nav className="flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-[0.13em]" aria-label="Breadcrumb">
                  <Link
                    href="/resenas"
                    className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 text-parchment/75 transition hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0b95f]"
                  >
                    <ChevronLeft size={15} aria-hidden="true" />
                    Reseñas
                  </Link>
                  <span className="text-white/30" aria-hidden="true">/</span>
                  <span className="inline-flex min-h-11 items-center rounded-full border border-[#f0b95f]/30 bg-[#f0b95f]/10 px-4 text-[#f0b95f]">
                    {review.gameTitle}
                  </span>
                </nav>

                <p className="mt-7 text-xs font-black uppercase tracking-[0.16em] text-[#f0b95f]">
                  Análisis de la taberna
                </p>
                <h1 className="font-display mt-3 max-w-5xl text-[2.55rem] font-bold leading-[0.98] text-white sm:text-5xl lg:text-6xl">
                  {review.title}
                </h1>
                <p className="mt-6 max-w-3xl border-l-2 border-[#f0b95f] pl-5 text-lg font-semibold leading-8 text-parchment/80">
                  {review.summary}
                </p>

                <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm font-bold text-parchment/75">
                  <span className="inline-flex items-center gap-2">
                    <BrandIcon name="user" size={16} className="text-[#f0b95f]" />
                    Por {review.authorUsername ? (
                      <Link href={`/u/${review.authorUsername}`} className="text-white underline decoration-white/30 underline-offset-4 hover:text-[#f0b95f]">
                        {review.authorName}
                      </Link>
                    ) : review.authorName}
                  </span>
                  <span className="h-1 w-1 rounded-full bg-white/30" aria-hidden="true" />
                  <span className="inline-flex items-center gap-2">
                    <BrandIcon name="calendar" size={16} className="text-[#f0b95f]" />
                    {formatDate(review.publishedAt)}
                  </span>
                  <span className="h-1 w-1 rounded-full bg-white/30" aria-hidden="true" />
                  <span className="inline-flex items-center gap-2">
                    <Clock3 size={16} className="text-[#f0b95f]" aria-hidden="true" />
                    {readingTime} min de lectura
                  </span>
                </div>

                <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-start">
                  <Link
                    href="#analisis"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#f0b95f] px-4 text-sm font-black text-[#2a170f] transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#2a170f]"
                  >
                    Empezar a leer
                    <ArrowDown size={16} aria-hidden="true" />
                  </Link>
                  <ReviewActions title={review.title} tone="dark" className="review-hero-actions" />
                </div>
              </div>

              <ReviewGamePanel review={review} />
            </div>
          </header>

          <section id="analisis" className="container-page grid scroll-mt-20 gap-8 py-10 lg:grid-cols-[minmax(0,780px)_minmax(280px,360px)] lg:justify-center lg:items-start lg:py-14">
            <div className="min-w-0 overflow-hidden rounded-2xl border border-walnut/10 bg-white shadow-[0_18px_50px_rgba(54,32,22,0.09)]">
              <div className="border-b border-walnut/10 bg-[#f6f0e5] px-5 py-4 sm:px-8">
                <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-ember">
                  <BookOpen size={16} aria-hidden="true" />
                  Análisis completo
                </p>
              </div>
              <div className="p-5 sm:p-8 lg:p-10">
                <ReviewContent body={review.body} />
              </div>

              <div className="border-t border-walnut/10 bg-[linear-gradient(135deg,#fff8e8,#f5e9d6)] p-5 sm:p-8">
                <p className="tavern-eyebrow text-ember">Después de leer</p>
                <h2 className="font-display mt-2 text-2xl font-bold leading-tight text-wood">
                  ¿Encaja en tu mesa? Comprueba la ficha antes de decidir
                </h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-walnut/75">
                  Revisa jugadores, duración, dificultad, alternativas y opiniones de la comunidad.
                </p>
                <Link href={`/juegos/${review.gameSlug}`} prefetch={false} className="button-primary mt-5">
                  Ver ficha de {review.gameTitle}
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>
            </div>

            <aside className="space-y-4 lg:sticky lg:top-24">
              {headings.length ? (
                <nav className="rounded-2xl border border-walnut/10 bg-white p-5 shadow-soft" aria-label="En este análisis">
                  <p className="tavern-eyebrow text-ember">En este análisis</p>
                  <ol className="mt-4 grid gap-1">
                    {headings.map((heading, index) => (
                      <li key={heading.id} className={heading.level === 3 ? "pl-4" : ""}>
                        <a
                          href={`#${heading.id}`}
                          className="group flex min-h-11 items-start gap-3 rounded-lg px-2 py-2 text-sm font-bold leading-5 text-walnut/75 transition hover:bg-ember/5 hover:text-ember focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember"
                        >
                          <span className="mt-0.5 text-xs font-black text-ember/60">{String(index + 1).padStart(2, "0")}</span>
                          <span>{heading.text}</span>
                        </a>
                      </li>
                    ))}
                  </ol>
                </nav>
              ) : null}

              <section className="rounded-2xl border border-ember/20 bg-[#fff8e8] p-5 shadow-soft">
                <p className="tavern-eyebrow text-ember">Tu siguiente paso</p>
                <h2 className="font-display mt-2 text-2xl font-bold leading-tight text-wood">
                  Convierte la lectura en partida
                </h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-walnut/75">
                  Consulta la ficha o aporta tu propia experiencia para completar la conversación.
                </p>
                <div className="mt-5 grid gap-2">
                  <Link href={`/juegos/${review.gameSlug}`} prefetch={false} className="button-primary justify-center">
                    <BrandIcon name="dice" size={16} />
                    Ver datos y alternativas
                  </Link>
                  <Link href={`/juegos/${review.gameSlug}/resena`} prefetch={false} className="button-secondary justify-center">
                    <BrandIcon name="document" size={16} />
                    Escribir mi reseña
                  </Link>
                </div>
              </section>

              <section className="rounded-2xl border border-walnut/10 bg-white p-5 shadow-soft">
                <p className="tavern-eyebrow">Ficha rápida</p>
                <dl className="mt-4 space-y-3 text-sm font-semibold text-walnut/75">
                  <ReviewFact icon="dice" label="Juego" value={review.gameTitle} />
                  <ReviewFact icon="star" label="Nota del juego" value={`${formatRating(review.rating)}/10`} />
                  <ReviewFact icon="user" label="Autor" value={review.authorName} />
                  <ReviewFact icon="clock" label="Lectura" value={`${readingTime} min`} />
                </dl>
              </section>
            </aside>
          </section>

          {prevReview || nextReview ? (
            <section className="container-page pb-12" aria-label="Navegar entre reseñas">
              <div className="grid gap-4 sm:grid-cols-2">
                {prevReview ? (
                  <ReviewNavigationLink
                    href={`/resenas/${prevReview.slug}`}
                    label="Anterior"
                    title={prevReview.title}
                    direction="previous"
                  />
                ) : <span />}
                {nextReview ? (
                  <ReviewNavigationLink
                    href={`/resenas/${nextReview.slug}`}
                    label="Siguiente"
                    title={nextReview.title}
                    direction="next"
                  />
                ) : null}
              </div>
            </section>
          ) : null}

          {relatedReviews.length ? (
            <section className="border-y border-walnut/10 bg-white/55 py-12 lg:py-14">
              <div className="container-page">
                <SectionHeader
                  eyebrow="Sigue explorando"
                  title="Más análisis para tu próxima mesa"
                  description="Otras lecturas recientes para comparar sensaciones y encontrar la experiencia adecuada."
                />
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {relatedReviews.map((item) => (
                    <ReviewCard key={item.slug} review={item} compact />
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          <footer className="container-page py-10">
            <div className="flex flex-col gap-5 border-t border-walnut/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-walnut/75">¿Quieres seguir decidiendo con contexto?</p>
                <p className="mt-1 text-sm text-walnut/60">Explora el archivo completo o vuelve al catálogo.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/resenas" className="button-secondary">Ver más reseñas</Link>
                <Link href="/juegos" prefetch={false} className="button-secondary">Explorar juegos</Link>
              </div>
            </div>
          </footer>
        </article>
      </main>
    </PublicShell>
  );
}

function ReviewGamePanel({ review }: { review: NonNullable<Awaited<ReturnType<typeof getReviewBySlug>>> }) {
  return (
    <aside className="min-w-0 overflow-hidden rounded-3xl border border-white/15 bg-white/10 p-3 shadow-[0_24px_70px_rgba(0,0,0,0.3)] backdrop-blur">
      <div className="relative overflow-hidden rounded-[1.2rem] bg-[#1b0f0a]">
        <GameCoverImage
          {...review}
          gameTitle={review.gameTitle}
          variant="detail"
          priority
          showPlaceholderLabel={false}
          className="rounded-[1.2rem]"
          imageSizes="(max-width: 1024px) 92vw, 460px"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,rgba(7,18,13,0.94)_100%)]" />
        <span className="absolute left-4 top-4 inline-flex min-h-8 items-center gap-2 rounded-full border border-white/20 bg-[#2a170f]/90 px-3 text-[11px] font-black uppercase tracking-[0.13em] text-[#f0b95f] backdrop-blur">
          <BrandIcon name="book" size={14} />
          Juego reseñado
        </span>
        <ReviewRatingBadge rating={review.rating} size="md" tone="dark" className="absolute right-4 top-4" />
        <div className="absolute inset-x-0 bottom-0 p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#f0b95f]">Nota actual de la ficha</p>
          <h2 className="font-display mt-1 text-2xl font-bold text-white">{review.gameTitle}</h2>
        </div>
      </div>
      <Link
        href={`/juegos/${review.gameSlug}`}
        prefetch={false}
        className="mt-3 flex min-h-12 items-center justify-between rounded-xl border border-white/10 bg-black/10 px-4 text-sm font-black text-white transition hover:border-[#f0b95f]/40 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0b95f]"
      >
        Abrir ficha del juego
        <ArrowRight size={17} className="text-[#f0b95f]" aria-hidden="true" />
      </Link>
    </aside>
  );
}

function ReviewNavigationLink({
  href,
  label,
  title,
  direction
}: {
  href: string;
  label: string;
  title: string;
  direction: "previous" | "next";
}) {
  const Icon = direction === "previous" ? ChevronLeft : ChevronRight;

  return (
    <Link
      href={href}
      className={`group flex min-h-24 items-center gap-4 rounded-2xl border border-walnut/10 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-ember/30 hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 motion-reduce:transform-none ${direction === "next" ? "justify-end text-right" : ""}`}
    >
      {direction === "previous" ? (
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ember/10 text-ember"><Icon size={19} /></span>
      ) : null}
      <span className="min-w-0">
        <span className="text-[11px] font-black uppercase tracking-[0.13em] text-ember">{label}</span>
        <span className="mt-1 line-clamp-2 block font-display text-lg font-bold leading-tight text-wood">{title}</span>
      </span>
      {direction === "next" ? (
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ember/10 text-ember"><Icon size={19} /></span>
      ) : null}
    </Link>
  );
}

function ReviewFact({
  icon,
  label,
  value
}: {
  icon: "dice" | "star" | "user" | "clock";
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-walnut/10 pb-3 last:border-b-0 last:pb-0">
      <dt className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-walnut/60">
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
