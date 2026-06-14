import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GameCoverImage } from "@/components/GameCoverImage";
import { PublicShell } from "@/components/PublicShell";
import { SEOTextBlock } from "@/components/SEOTextBlock";
import { getReviewBySlug } from "@/lib/catalog";
import { hasVerifiedCoverImage } from "@/lib/gameImages";
import { siteConfig } from "@/lib/site";

type ReviewPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: ReviewPageProps): Promise<Metadata> {
  const { slug } = await params;
  const review = await getReviewBySlug(slug);

  if (!review) {
    return {
      title: "Reseña no encontrada",
      robots: { index: false, follow: false }
    };
  }

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
      images: hasVerifiedCoverImage(review) && review.coverImageUrl ? [{ url: review.coverImageUrl, alt: review.coverImageAlt }] : []
    }
  };
}

export default async function ReviewPage({ params }: ReviewPageProps) {
  const { slug } = await params;
  const review = await getReviewBySlug(slug);

  if (!review) {
    notFound();
  }

  return (
    <PublicShell>
      <main>
        <article>
          <section className="page-hero">
            <div className="container-page grid gap-8 py-12 lg:grid-cols-[1fr_360px] lg:items-center">
              <div>
                <p className="tavern-eyebrow">{review.gameTitle}</p>
                <h1 className="page-hero-title">{review.title}</h1>
                <p className="mt-5 max-w-3xl text-lg font-medium leading-8 text-parchment/80">{review.summary}</p>
                <p className="mt-4 text-sm font-extrabold uppercase tracking-[0.12em] text-white/60">
                  Por {review.authorName}
                </p>
                <Link className="button-secondary mt-7 border-white/20 bg-white/10 text-white hover:text-parchment" href={`/juegos/${review.gameSlug}`}>
                  Ver ficha de {review.gameTitle}
                </Link>
              </div>
              <GameCoverImage
                {...review}
                gameTitle={review.gameTitle}
                variant="detail"
                priority
                className="border border-white/12 shadow-soft"
              />
            </div>
          </section>
          <section className="container-page grid gap-8 py-12 lg:grid-cols-[minmax(0,760px)_240px]">
            <div className="space-y-6 text-lg leading-9 text-ink/80">
              {review.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            <aside />
          </section>
        </article>
        <section className="container-page pb-14">
          <SEOTextBlock title={`${review.title}: opinión en español`}>
            <p>
              Esta reseña complementa la ficha de juego con contexto editorial, sensaciones de mesa
              y recomendaciones para decidir si encaja en tu grupo.
            </p>
          </SEOTextBlock>
        </section>
      </main>
    </PublicShell>
  );
}
