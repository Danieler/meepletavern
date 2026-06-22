import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
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
      "@type": "BoardGame",
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
        <article className="mx-auto w-full max-w-[800px] px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
          {/* Editorial Header */}
          <header className="mb-10">
            {/* Game name eyebrow */}
            <div className="flex items-center gap-2 mb-2">
              <span className="tavern-eyebrow">{review.gameTitle}</span>
            </div>

            {/* Review Title */}
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-black text-wood leading-tight tracking-tight mb-4">
              {review.title}
            </h1>

            {/* Metadata Row */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs font-bold uppercase tracking-wider text-walnut/60 mb-6">
              <span>Por {review.authorName}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-walnut/20" />
              <span>{formatDate(review.publishedAt)}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-walnut/20" />
              <span>{readingTime} min de lectura</span>
            </div>

            {/* Lead Summary */}
            <div className="border-l-4 border-ember bg-paper/60 p-5 rounded-r-md shadow-sm mb-6">
              <p className="text-lg font-medium leading-relaxed text-walnut">
                {review.summary}
              </p>
            </div>

            {/* Link to game page */}
            {review.gameSlug && (
              <div className="mb-8">
                <Link
                  href={`/juegos/${review.gameSlug}`}
                  className="inline-flex items-center gap-1.5 text-sm font-extrabold text-moss hover:text-wood hover:underline decoration-moss/35 underline-offset-4 transition"
                >
                  Ver ficha de {review.gameTitle} &rarr;
                </Link>
              </div>
            )}

            {/* Featured Image */}
            <div className="overflow-hidden rounded-xl border border-walnut/15 bg-white/65 p-2 shadow-soft">
              <GameCoverImage
                {...review}
                gameTitle={review.gameTitle}
                variant="detail"
                priority
                className="w-full rounded-lg"
              />
            </div>
          </header>

          {/* Content Area */}
          <div className="mb-12">
            <ReviewContent body={review.body} className="text-[#1f1f1f]/90" />
          </div>

          {/* Polished Closing Footer */}
          <footer className="mt-12 border-t border-walnut/15 pt-8 pb-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex flex-wrap justify-center gap-3">
                <Link href="/resenas" className="button-secondary text-xs">
                  Ver más reseñas
                </Link>
                <Link href="/juegos" className="button-secondary text-xs">
                  Explorar juegos
                </Link>
              </div>
              {review.gameSlug && (
                <Link href={`/juegos/${review.gameSlug}`} className="button-primary text-xs">
                  Ver ficha del juego
                </Link>
              )}
            </div>
          </footer>
        </article>
      </main>
    </PublicShell>
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
