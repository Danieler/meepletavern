import type { Metadata } from "next";
import Link from "next/link";
import { BrandIcon, type BrandIconName } from "@/components/BrandIcon";
import { PublicShell } from "@/components/PublicShell";
import { ReviewCard } from "@/components/ReviewCard";
import { ReviewRatingBadge } from "@/components/reviews/ReviewRatingBadge";
import { SectionHeader } from "@/components/SectionHeader";
import { SEOTextBlock } from "@/components/SEOTextBlock";
import { GameCoverImage } from "@/components/GameCoverImage";
import { getReviews, type Review } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Reseñas de juegos de mesa",
  description:
    "Reseñas de juegos de mesa en español con puntuación, resumen, opinión, pros, contras y recomendaciones para distintas mesas."
};

export const revalidate = 3600;

export default async function ReviewsPage() {
  const reviews = await getReviews();

  return (
    <PublicShell>
      <main>
        <ReviewsHero featured={reviews[0]} totalReviews={reviews.length} />
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

function ReviewsHero({ featured, totalReviews }: { featured?: Review; totalReviews: number }) {
  return (
    <section className="relative overflow-hidden border-b border-moss/30 bg-[#16211d] text-white">
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(201,130,31,0.2),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.05),transparent_42%),repeating-linear-gradient(90deg,rgba(255,255,255,0.035)_0_1px,transparent_1px_42px)]" />
      <div className="container-page relative grid gap-8 py-10 sm:py-14 lg:grid-cols-[minmax(0,1fr)_minmax(340px,460px)] lg:items-center">
        <div className="max-w-4xl">
          <p className="tavern-eyebrow text-[#eab35c] animate-fade-in-up">Crónicas de mesa</p>
          <h1 className="font-display mt-3 max-w-4xl text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl animate-fade-in-up-delay-1">
            Reseñas que ayudan a decidir la próxima partida
          </h1>
          <p className="mt-5 max-w-3xl text-base font-medium leading-8 text-parchment/82 sm:text-lg animate-fade-in-up-delay-2">
            Opinión útil, ritmo real en mesa, para quién funciona y cuándo conviene mirar otra caja.
          </p>
          <div className="mt-7 grid max-w-2xl gap-3 sm:grid-cols-3 animate-fade-in-up-delay-3">
            <HeroSignal icon="document" value={totalReviews || "Pronto"} label="reseñas publicadas" />
            <HeroSignal icon="clock" value="5 min" label="lectura práctica" />
            <HeroSignal icon="dice" value="Mesa" label="sensaciones reales" />
          </div>
        </div>

        {featured ? (
          <Link
            href={`/resenas/${featured.slug}`}
            className="group relative block min-w-0 overflow-hidden rounded-md border border-white/12 bg-white/8 shadow-[0_24px_60px_rgba(0,0,0,0.28)] backdrop-blur transition hover:-translate-y-1 hover:border-[#eab35c]/50 animate-fade-in-up-delay-2"
            aria-label={`Leer reseña destacada de ${featured.title}`}
          >
            <div className="grid gap-0 sm:grid-cols-[150px_minmax(0,1fr)] lg:grid-cols-1">
              <div className="relative min-h-48 sm:min-h-full lg:min-h-72">
                <GameCoverImage
                  {...featured}
                  gameTitle={featured.gameTitle}
                  variant="detail"
                  priority
                  className="h-full rounded-none"
                  imageSizes="(max-width: 1024px) 50vw, 460px"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.35))]" />
                <ReviewRatingBadge rating={featured.rating} size="lg" tone="dark" className="absolute bottom-3 right-3" />
              </div>
              <div className="min-w-0 p-5">
                <p className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase leading-4 tracking-[0.14em] text-[#eab35c]">
                  <BrandIcon name="star" size={13} />
                  Última reseña
                </p>
                <h2 className="font-display mt-2 text-2xl font-bold leading-tight text-white transition group-hover:text-[#eab35c]">
                  {featured.title}
                </h2>
                <p className="mt-3 line-clamp-3 text-sm font-medium leading-6 text-parchment/80">
                  {featured.summary}
                </p>
                <span className="mt-5 inline-flex items-center gap-2 rounded-md bg-[#eab35c] px-4 py-2.5 text-sm font-black text-[#1f160f] transition group-hover:bg-white">
                  Leer reseña
                  <span aria-hidden="true">-&gt;</span>
                </span>
              </div>
            </div>
          </Link>
        ) : null}
      </div>
    </section>
  );
}

function HeroSignal({ icon, value, label }: { icon: BrandIconName; value: string | number; label: string }) {
  return (
    <div className="rounded-md border border-white/12 bg-white/8 px-4 py-3 shadow-sm backdrop-blur transition hover:border-[#eab35c]/30 hover:bg-white/12">
      <div className="flex items-center gap-2">
        <BrandIcon name={icon} size={18} className="text-[#eab35c]" />
        <p className="font-display text-2xl font-bold leading-none text-white">{value}</p>
      </div>
      <p className="mt-1.5 text-xs font-black uppercase leading-4 tracking-[0.12em] text-parchment/62">{label}</p>
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
    <section className="container-page py-12">
      <SectionHeader
        title="Más reseñas recientes"
        description="Piezas pensadas para escanear rápido y entrar al detalle cuando un juego te llama."
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
    <section className="mt-8 grid gap-4 rounded-md border border-moss/15 bg-[#f3faf7] p-5 shadow-soft sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div>
        <p className="tavern-eyebrow text-moss">Tu mesa también cuenta</p>
        <h2 className="font-display mt-2 text-2xl font-bold leading-tight text-wood">
          Publica tu reseña desde la ficha del juego
        </h2>
        <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-walnut/70">
          Busca el juego, entra en su ficha y deja una opinión cuando tengas algo que aportar a otros jugadores.
        </p>
      </div>
      <Link href="/juegos" className="button-secondary justify-center">
        Buscar juego
      </Link>
    </section>
  );
}
