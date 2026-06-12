import Link from "next/link";
import { BrandIcon } from "@/components/BrandIcon";
import { GameCoverImage } from "@/components/GameCoverImage";
import type { Review } from "@/lib/catalog";

export function ReviewCard({ review, compact = false, list = false }: { review: Review; compact?: boolean; list?: boolean }) {
  if (list) {
    return (
      <article className="border-b border-walnut/15 pb-3 last:border-b-0 last:pb-0">
        <Link href={`/resenas/${review.slug}`} className="grid grid-cols-[74px_1fr_auto] gap-3" aria-label={`Abrir reseña de ${review.title}`}>
          <GameCoverImage {...review} gameTitle={review.gameTitle} variant="ranking" showPlaceholderLabel={false} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-black text-wood">{review.title}</span>
            <span className="mt-1 line-clamp-2 text-xs leading-5 text-walnut/75">{review.summary}</span>
            <span className="mt-1 flex flex-wrap gap-3 text-xs font-semibold text-walnut/65">
              <span>{review.gameTitle}</span>
              <span className="inline-flex items-center gap-1"><BrandIcon name="calendar" size={14} />{formatDate(review.publishedAt)}</span>
            </span>
          </span>
          <span className="inline-flex items-start gap-1 pt-1 text-sm font-black text-ember">
            <BrandIcon name="star" size={14} />
            MT
          </span>
        </Link>
      </article>
    );
  }

  const linkClassName = compact
    ? "block"
    : "grid min-w-0 gap-0 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)]";

  return (
    <article className="tavern-card overflow-hidden">
      <Link
        href={`/resenas/${review.slug}`}
        className={`${linkClassName} touch-manipulation cursor-pointer`}
        aria-label={`Abrir reseña de ${review.title}`}
      >
        <GameCoverImage {...review} gameTitle={review.gameTitle} variant={compact ? "card" : "review"} />
        <div className="min-w-0 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase text-ember">{review.gameTitle}</p>
              <h2 className="font-display mt-2 text-2xl font-black text-wood">{review.title}</h2>
              <p className="mt-2 text-xs font-semibold uppercase text-walnut/55">Por {review.authorName}</p>
            </div>
          </div>
          <p className="mt-3 text-sm leading-6 text-walnut/80">{review.summary}</p>
          <p className="mt-5 inline-flex items-center gap-2 text-xs font-bold uppercase text-walnut/55">
            <BrandIcon name="calendar" size={16} />
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
