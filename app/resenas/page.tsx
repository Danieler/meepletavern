import type { Metadata } from "next";
import { Suspense } from "react";
import { PublicShell } from "@/components/PublicShell";
import { GuestOnlyCta } from "@/components/auth-cta/GuestOnlyCta";
import { ReviewCard } from "@/components/ReviewCard";
import { SectionHeader } from "@/components/SectionHeader";
import { SEOTextBlock } from "@/components/SEOTextBlock";
import { ReviewsResultsSkeleton } from "@/components/loading/PublicPageSkeletons";
import { getReviews } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Reseñas de juegos de mesa",
  description:
    "Reseñas de juegos de mesa en español con puntuación, resumen, opinión, pros, contras y recomendaciones para distintas mesas."
};

export const revalidate = 3600;

export default async function ReviewsPage() {
  return (
    <PublicShell>
      <main>
        <section className="page-hero">
          <div className="container-page">
            <p className="tavern-eyebrow">Crónicas</p>
            <h1 className="page-hero-title">Reseñas de juegos de mesa</h1>
            <p className="page-hero-copy">
              Opinión útil, contexto de mesa y señales prácticas antes de comprar, enseñar o sacar
              un juego.
            </p>
          </div>
        </section>
        <div className="container-page pt-7">
          <GuestOnlyCta
            title="Comparte tu opinión en la taberna"
            description="Crea tu cuenta gratis para comentar, reseñar y guardar tus juegos favoritos."
            buttonLabel="Crear cuenta gratis"
            next="/resenas"
            context="review"
            intent="review_game"
          />
        </div>
        <Suspense fallback={<ReviewsResultsSkeleton />}>
          <ReviewsResults />
        </Suspense>
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

async function ReviewsResults() {
  const reviews = await getReviews();

  return (
    <section className="container-page py-12">
      <SectionHeader title="Últimas reseñas" />
      {reviews.length ? (
        <div className="grid gap-5">
          {reviews.map((review) => <ReviewCard key={review.slug} review={review} />)}
        </div>
      ) : (
        <section className="surface-muted p-6 shadow-soft">
          <p className="text-sm font-semibold text-ink/65">
            De momento las reseñas se publicarán manualmente. Esta sección todavía no tiene contenido.
          </p>
        </section>
      )}
    </section>
  );
}
