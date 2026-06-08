import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicShell } from "@/components/PublicShell";
import { RatingBadge } from "@/components/RatingBadge";
import { SEOTextBlock } from "@/components/SEOTextBlock";
import { getReviewBySlug, getReviewGame, reviews } from "@/lib/catalog";
import { siteConfig } from "@/lib/site";

type ReviewPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return reviews.map((review) => ({ slug: review.slug }));
}

export async function generateMetadata({ params }: ReviewPageProps): Promise<Metadata> {
  const { slug } = await params;
  const review = getReviewBySlug(slug);

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
      images: [{ url: review.image, alt: review.title }]
    }
  };
}

export default async function ReviewPage({ params }: ReviewPageProps) {
  const { slug } = await params;
  const review = getReviewBySlug(slug);

  if (!review) {
    notFound();
  }

  const game = getReviewGame(review);

  return (
    <PublicShell>
      <main>
        <article>
          <section className="bg-ink text-white">
            <div className="container-page grid gap-8 py-12 lg:grid-cols-[1fr_360px] lg:items-center">
              <div>
                <p className="text-sm font-bold uppercase text-ember">{game?.title || "Reseña"}</p>
                <h1 className="mt-3 text-4xl font-black sm:text-5xl">{review.title}</h1>
                <p className="mt-5 max-w-3xl text-lg leading-8 text-white/78">{review.summary}</p>
                {game ? (
                  <Link className="button-secondary mt-7 border-white/20 bg-white/10 text-white hover:text-parchment" href={`/juegos/${game.slug}`}>
                    Ver ficha de {game.title}
                  </Link>
                ) : null}
              </div>
              <div className="overflow-hidden rounded-md border border-white/12 bg-white/5 shadow-soft">
                <Image
                  src={review.image}
                  alt={review.title}
                  width={720}
                  height={560}
                  priority
                  className="aspect-[4/3] w-full object-cover"
                />
              </div>
            </div>
          </section>
          <section className="container-page grid gap-8 py-12 lg:grid-cols-[minmax(0,760px)_240px]">
            <div className="space-y-6 text-lg leading-9 text-ink/76">
              {review.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            <aside>
              <div className="rounded-md border border-ink/10 bg-white p-5 shadow-soft">
                <h2 className="text-lg font-black text-ink">Puntuación</h2>
                <div className="mt-4">
                  <RatingBadge rating={review.rating} size="lg" />
                </div>
              </div>
            </aside>
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

