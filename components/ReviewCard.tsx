import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { GameCoverImage } from "@/components/GameCoverImage";
import type { Review } from "@/lib/catalog";

export function ReviewCard({ review, compact = false }: { review: Review; compact?: boolean }) {
  const linkClassName = compact
    ? "block"
    : "grid min-w-0 gap-0 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)]";

  return (
    <article className="overflow-hidden rounded-md border border-ink/10 bg-white shadow-soft">
      <Link
        href={`/resenas/${review.slug}`}
        className={`${linkClassName} touch-manipulation cursor-pointer`}
        aria-label={`Abrir reseña de ${review.title}`}
      >
        <GameCoverImage {...review} gameTitle={review.gameTitle} variant={compact ? "card" : "review"} />
        <div className="min-w-0 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase text-ruby">{review.gameTitle}</p>
              <h2 className="mt-2 text-2xl font-black text-ink">{review.title}</h2>
              <p className="mt-2 text-xs font-semibold uppercase text-ink/45">Por {review.authorName}</p>
            </div>
          </div>
          <p className="mt-3 text-sm leading-6 text-ink/70">{review.summary}</p>
          <p className="mt-5 inline-flex items-center gap-2 text-xs font-bold uppercase text-ink/45">
            <CalendarDays size={15} aria-hidden="true" />
            {formatDate(review.publishedAt)}
          </p>
        </div>
      </Link>
    </article>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(new Date(value));
}
