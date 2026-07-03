import type { Metadata } from "next";
import Link from "next/link";
import { GameCoverImage } from "@/components/GameCoverImage";
import { PublicShell } from "@/components/PublicShell";
import { ReviewCard } from "@/components/ReviewCard";
import { ReviewRatingBadge } from "@/components/reviews/ReviewRatingBadge";
import { GuestOnlyCta } from "@/components/auth-cta/GuestOnlyCta";
import { getReviews, type Review } from "@/lib/catalog";
import { buildInstagramReviewHref } from "@/lib/instagramSharing";

export const metadata: Metadata = {
  title: "MeepleTavern en Instagram",
  description:
    "Últimas reseñas, recomendaciones y juegos destacados de MeepleTavern para quienes llegan desde Instagram."
};

export const revalidate = 3600;

export default async function InstagramPage() {
  const reviews = await getReviews();
  const featured = reviews[0];
  const latest = reviews.slice(1, 7);

  return (
    <PublicShell>
      <main>
        <section className="relative overflow-hidden border-b border-moss/25 bg-[#16211d] text-white">
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(201,130,31,0.22),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.05),transparent_42%),repeating-linear-gradient(90deg,rgba(255,255,255,0.035)_0_1px,transparent_1px_42px)]" />
          <div className="container-page relative grid gap-8 py-10 sm:py-12 lg:grid-cols-[minmax(0,1fr)_minmax(340px,460px)] lg:items-center">
            <div className="max-w-4xl">
              <p className="tavern-eyebrow text-[#eab35c]">Desde Instagram</p>
              <h1 className="font-display mt-3 max-w-4xl text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
                Últimas reseñas y recomendaciones de MeepleTavern
              </h1>
              <p className="mt-5 max-w-3xl text-base font-medium leading-8 text-parchment/82 sm:text-lg">
                Entra directo a la reseña, mira la ficha del juego y guarda lo que quieras probar en tu mesa.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/resenas?utm_source=instagram&utm_medium=social&utm_campaign=link_in_bio&utm_content=all_reviews"
                  className="button-primary"
                >
                  Ver todas las reseñas
                </Link>
                <Link
                  href="/juegos"
                  className="button-secondary bg-white/92"
                >
                  Explorar catálogo
                </Link>
              </div>
            </div>

            {featured ? <InstagramFeaturedReview review={featured} /> : null}
          </div>
        </section>

        <section className="container-page py-10 lg:py-14">
          <div className="mb-6 max-w-3xl">
            <p className="tavern-eyebrow">Lo nuevo</p>
            <h2 className="font-display mt-2 text-3xl font-bold leading-tight text-wood sm:text-4xl">
              Reseñas recientes
            </h2>
          </div>

          {reviews.length ? (
            <div className="grid gap-5 lg:grid-cols-2">
              {(latest.length ? latest : reviews).map((review) => (
                <ReviewCard
                  key={review.slug}
                  review={review}
                  href={buildInstagramReviewHref(review.slug, `recent_${review.slug}`)}
                />
              ))}
            </div>
          ) : (
            <section className="surface-muted p-6 shadow-soft">
              <p className="text-sm font-semibold text-ink/65">
                Las reseñas aparecerán aquí cuando se publique la primera crónica.
              </p>
            </section>
          )}
        </section>

        <section className="container-page pb-14">
          <GuestOnlyCta
            title="Guarda lo que descubras"
            description="Crea tu ludoteca, deja reseñas y vuelve a las recomendaciones que te interesan."
            buttonLabel="Crear cuenta"
            next="/instagram"
            context="review"
            intent="review_game"
          />
        </section>
      </main>
    </PublicShell>
  );
}

function InstagramFeaturedReview({ review }: { review: Review }) {
  return (
    <Link
      href={buildInstagramReviewHref(review.slug, "featured_review")}
      className="group relative block min-w-0 overflow-hidden rounded-md border border-white/12 bg-white/8 shadow-[0_24px_60px_rgba(0,0,0,0.28)] backdrop-blur transition hover:-translate-y-1 hover:border-[#eab35c]/50"
      aria-label={`Leer reseña destacada de ${review.title}`}
    >
      <div className="grid gap-0 sm:grid-cols-[150px_minmax(0,1fr)] lg:grid-cols-1">
        <div className="relative min-h-48 sm:min-h-full lg:min-h-72">
          <GameCoverImage
            {...review}
            gameTitle={review.gameTitle}
            variant="detail"
            priority
            className="h-full rounded-none"
            imageSizes="(max-width: 1024px) 50vw, 460px"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.35))]" />
          <ReviewRatingBadge rating={review.rating} size="lg" tone="dark" className="absolute bottom-3 right-3" />
        </div>
        <div className="min-w-0 p-5">
          <p className="text-[11px] font-black uppercase leading-4 tracking-[0.14em] text-[#eab35c]">
            Empieza aquí
          </p>
          <h2 className="font-display mt-2 text-2xl font-bold leading-tight text-white transition group-hover:text-[#eab35c]">
            {review.title}
          </h2>
          <p className="mt-3 line-clamp-3 text-sm font-medium leading-6 text-parchment/80">
            {review.summary}
          </p>
          <span className="mt-5 inline-flex items-center rounded-md bg-[#eab35c] px-3 py-2 text-sm font-black text-[#1f160f] transition group-hover:bg-white">
            Leer reseña
          </span>
        </div>
      </div>
    </Link>
  );
}
