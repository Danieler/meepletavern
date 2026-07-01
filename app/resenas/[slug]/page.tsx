import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BrandIcon } from "@/components/BrandIcon";
import { GameCoverImage } from "@/components/GameCoverImage";
import { PublicShell } from "@/components/PublicShell";
import { ReviewContent } from "@/components/reviews/ReviewContent";
import { getReviewBySlug } from "@/lib/catalog";
import { hasVerifiedCoverImage } from "@/lib/gameImages";
import { siteConfig } from "@/lib/site";

type ReviewPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const revalidate = 3600;
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
  const review = await getReviewBySlug(slug);

  if (!review) {
    notFound();
  }

  const wordCount = review.body ? review.body.split(/\s+/).length : 0;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

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
      <main className="min-h-screen">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <article>
          <header className="relative overflow-hidden border-b border-moss/25 bg-[#16211d] text-white">
            <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(201,130,31,0.22),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.05),transparent_42%),repeating-linear-gradient(90deg,rgba(255,255,255,0.035)_0_1px,transparent_1px_42px)]" />
            <div className="container-page relative grid gap-8 py-9 sm:py-12 lg:grid-cols-[minmax(0,1fr)_minmax(340px,430px)] lg:items-end">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href="/resenas" className="rounded-md border border-white/12 bg-white/8 px-2.5 py-1 text-[11px] font-black uppercase leading-4 tracking-[0.14em] text-parchment/86 transition hover:border-[#eab35c]/45 hover:text-white">
                    Reseñas
                  </Link>
                  <span className="rounded-md border border-[#eab35c]/25 bg-[#eab35c]/12 px-2.5 py-1 text-[11px] font-black uppercase leading-4 tracking-[0.14em] text-[#eab35c]">
                    {review.gameTitle}
                  </span>
                </div>

                <h1 className="font-display mt-5 max-w-5xl text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">
                  {review.title}
                </h1>

                <p className="mt-5 max-w-3xl border-l-4 border-[#eab35c] pl-5 text-lg font-semibold leading-8 text-parchment/88 sm:text-xl">
                  {review.summary}
                </p>

                <div className="mt-6 flex flex-wrap gap-2">
                  <MetaChip>
                    Por{" "}
                    {review.authorUsername ? (
                      <Link href={`/u/${review.authorUsername}`} className="underline decoration-white/30 underline-offset-4 hover:text-white">
                        {review.authorName}
                      </Link>
                    ) : (
                      review.authorName
                    )}
                  </MetaChip>
                  <MetaChip>{formatDate(review.publishedAt)}</MetaChip>
                  <MetaChip>{readingTime} min de lectura</MetaChip>
                </div>

                <div className="mt-7 flex flex-wrap gap-3">
                  {review.gameSlug ? (
                    <Link href={`/juegos/${review.gameSlug}`} prefetch={false} className="button-primary">
                      Ver ficha del juego
                    </Link>
                  ) : null}
                  <Link href="/resenas" className="button-secondary bg-white/92">
                    Más reseñas
                  </Link>
                </div>
              </div>

              <div className="min-w-0">
                <div className="overflow-hidden rounded-md border border-white/12 bg-white/8 p-2 shadow-[0_24px_60px_rgba(0,0,0,0.28)] backdrop-blur">
                  <GameCoverImage
                    {...review}
                    gameTitle={review.gameTitle}
                    variant="detail"
                    priority
                    className="w-full rounded-md"
                    imageSizes="(max-width: 1024px) 90vw, 430px"
                  />
                </div>
              </div>
            </div>
          </header>

          <section className="container-page grid gap-8 py-10 lg:grid-cols-[minmax(0,860px)_minmax(260px,1fr)] lg:items-start lg:py-14">
            <div className="min-w-0 rounded-md border border-walnut/12 bg-white/72 p-5 shadow-soft sm:p-8 lg:p-10">
              <ReviewContent body={review.body} className="text-[#1f1f1f]/90" />
            </div>

            <aside className="space-y-4 lg:sticky lg:top-24">
              <section className="rounded-md border border-moss/15 bg-[#f3faf7] p-5 shadow-soft">
                <p className="tavern-eyebrow text-moss">Siguiente paso</p>
                <h2 className="font-display mt-2 text-2xl font-bold leading-tight text-wood">
                  Convierte la reseña en partida
                </h2>
                <div className="mt-5 grid gap-2">
                  {review.gameSlug ? (
                    <Link href={`/juegos/${review.gameSlug}`} prefetch={false} className="button-primary justify-center">
                      Ver datos y alternativas
                    </Link>
                  ) : null}
                  <Link href={`/juegos/${review.gameSlug}/resena`} prefetch={false} className="button-secondary justify-center">
                    Escribir mi reseña
                  </Link>
                </div>
              </section>

              <section className="rounded-md border border-walnut/12 bg-paper p-5 shadow-soft">
                <p className="tavern-eyebrow">Ficha rápida</p>
                <dl className="mt-4 space-y-3 text-sm font-semibold text-walnut/78">
                  <ReviewFact label="Juego" value={review.gameTitle} />
                  <ReviewFact label="Autor" value={review.authorName} />
                  <ReviewFact label="Publicado" value={formatDate(review.publishedAt)} />
                  <ReviewFact label="Lectura" value={`${readingTime} min`} />
                </dl>
              </section>
            </aside>
          </section>

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
    <span className="inline-flex min-h-8 items-center rounded-md border border-white/12 bg-white/8 px-3 py-1 text-xs font-black uppercase leading-4 tracking-[0.11em] text-parchment/80">
      {children}
    </span>
  );
}

function ReviewFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-walnut/10 pb-3 last:border-b-0 last:pb-0">
      <dt className="text-xs font-black uppercase tracking-[0.12em] text-walnut/55">{label}</dt>
      <dd className="max-w-[14rem] text-right text-wood">{value}</dd>
    </div>
  );
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
