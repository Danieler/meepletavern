import type { Metadata } from "next";
import { PublicShell } from "@/components/PublicShell";
import { ReviewCard } from "@/components/ReviewCard";
import { SectionHeader } from "@/components/SectionHeader";
import { SEOTextBlock } from "@/components/SEOTextBlock";
import { getReviews } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Reseñas de juegos de mesa",
  description:
    "Reseñas de juegos de mesa en español con puntuación, resumen, opinión, pros, contras y recomendaciones para distintas mesas."
};

export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  const reviews = await getReviews();

  return (
    <PublicShell>
      <main>
        <section className="bg-ink py-12 text-white">
          <div className="container-page">
            <p className="text-sm font-bold uppercase text-ember">Crónicas</p>
            <h1 className="mt-3 text-4xl font-black sm:text-5xl">Reseñas de juegos de mesa</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-white/76">
              Opinión útil, contexto de mesa y señales prácticas antes de comprar, enseñar o sacar
              un juego.
            </p>
          </div>
        </section>
        <section className="container-page py-12">
          <SectionHeader title="Últimas reseñas" />
          {reviews.length ? (
            <div className="grid gap-5">
              {reviews.map((review) => (
                <ReviewCard key={review.slug} review={review} />
              ))}
            </div>
          ) : (
            <section className="rounded-md border border-ink/10 bg-white p-6 shadow-soft">
              <p className="text-sm font-semibold text-ink/65">
                De momento las reseñas se publicarán manualmente. Esta sección todavía no tiene
                contenido.
              </p>
            </section>
          )}
        </section>
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
