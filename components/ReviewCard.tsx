import Link from "next/link";
import { BrandIcon } from "@/components/BrandIcon";
import { GameCoverImage } from "@/components/GameCoverImage";
import { ReviewRatingBadge } from "@/components/reviews/ReviewRatingBadge";
import type { Review } from "@/lib/catalog";

type ReviewCardProps = {
  review: Review;
  compact?: boolean;
  list?: boolean;
  featured?: boolean;
  href?: string;
};

export function ReviewCard({ review, compact = false, list = false, featured = false, href = `/resenas/${review.slug}` }: ReviewCardProps) {
  if (list) {
    return (
      <article className="border-b border-border-subtle pb-3 last:border-b-0 last:pb-0">
        <Link href={href} className="grid grid-cols-[74px_minmax(0,1fr)_auto] gap-3 rounded-lg transition hover:bg-accent/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2" aria-label={`Abrir reseña de ${review.title}`}>
          <GameCoverImage {...review} gameTitle={review.gameTitle} variant="ranking" showPlaceholderLabel={false} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold leading-5 text-text-primary">{review.title}</span>
            <span className="mt-1 line-clamp-2 text-xs leading-5 text-text-secondary">{review.summary}</span>
            <span className="mt-1 flex flex-wrap gap-3 text-xs font-semibold leading-5 text-text-tertiary">
              <span>{review.gameTitle}</span>
              <span className="inline-flex items-center gap-1"><BrandIcon name="calendar" size={14} />{formatDate(review.publishedAt)}</span>
            </span>
          </span>
          <span className="rating-chip self-start">
            <BrandIcon name="star" size={14} />
            {formatRating(review.rating)}
          </span>
        </Link>
      </article>
    );
  }

  if (featured) {
    return (
      <article className="review-card-featured review-card-premium group relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-accent/70" />
        <Link
          href={href}
          className="grid min-w-0 cursor-pointer touch-manipulation gap-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-action md:grid-cols-[minmax(0,380px)_minmax(0,1fr)]"
          aria-label={`Abrir reseña de ${review.title}`}
        >
          <div className="relative min-h-64 overflow-hidden bg-ink/5 md:min-h-80">
            <GameCoverImage
              {...review}
              gameTitle={review.gameTitle}
              variant="detail"
              className="h-full rounded-none transition duration-500 group-hover:scale-[1.03] motion-reduce:transform-none"
              imageSizes="(max-width: 768px) 100vw, 380px"
            />
            <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_50%,rgba(0,0,0,0.15))]" />
            <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-lg border border-accent-light/30 bg-accent-light/15 px-2.5 py-1 text-micro font-bold uppercase leading-4 tracking-eyebrow text-accent-light backdrop-blur">
              <BrandIcon name="star" size={13} />
              Destacada
            </span>
            <ReviewRatingBadge rating={review.rating} size="lg" tone="dark" className="absolute bottom-3 right-3" />
          </div>
          <div className="flex min-w-0 flex-col p-5 sm:p-7">
            <div className="flex-1">
              <span className="tavern-eyebrow">{review.gameTitle}</span>
              <h2 className="font-display mt-3 text-2xl font-bold leading-tight text-text-primary transition group-hover:text-action sm:text-3xl">
                {review.title}
              </h2>
              <p className="tavern-meta mt-2">Por {review.authorName}</p>
              <p className="mt-4 line-clamp-4 text-sm font-medium leading-7 text-text-secondary sm:text-base">
                {review.summary}
              </p>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <p className="tavern-meta inline-flex items-center gap-2 text-text-tertiary">
                <BrandIcon name="calendar" size={16} />
                {formatDate(review.publishedAt)}
              </p>
              <span className="inline-flex items-center gap-2 rounded-lg border border-action-hover/30 bg-action px-4 py-2 text-sm font-bold text-white shadow-sm transition group-hover:bg-action-hover">
                Leer reseña completa
                <span aria-hidden="true">-&gt;</span>
              </span>
            </div>
          </div>
        </Link>
      </article>
    );
  }

  const linkClassName = compact
    ? "grid h-full min-h-[230px] grid-cols-[116px_minmax(0,1fr)] sm:flex sm:min-h-0 sm:flex-col"
    : "grid min-w-0 gap-0 md:grid-cols-[minmax(0,190px)_minmax(0,1fr)]";

  return (
    <article className="review-card-premium group relative h-full overflow-hidden rounded-xl border border-border-subtle bg-paper shadow-soft">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-accent/70" />
      <Link
        href={href}
        className={`${linkClassName} cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-action`}
        aria-label={`Abrir reseña de ${review.title}`}
      >
        <div className={`relative overflow-hidden bg-ink/5 ${compact ? "min-h-[230px] sm:min-h-48" : "min-h-48"}`}>
          <GameCoverImage
              {...review}
              gameTitle={review.gameTitle}
              variant={compact ? "card" : "review"}
              className="h-full rounded-none transition duration-500 group-hover:scale-[1.02] motion-reduce:transform-none"
              imageSizes={compact ? "(max-width: 768px) 100vw, 360px" : "(max-width: 768px) 100vw, 260px"}
          />
          <span className="absolute left-3 top-3 rounded-full border border-white/20 bg-surface-dark/80 px-3 py-1 text-micro font-bold uppercase leading-4 tracking-eyebrow text-white backdrop-blur">
            Reseña
          </span>
          <div className="absolute bottom-3 right-3 flex flex-col items-end gap-1">
            <span className="hidden rounded-full bg-surface-dark/85 px-2 py-1 text-[9px] font-bold uppercase tracking-eyebrow text-text-on-dark-muted/80 backdrop-blur sm:inline-flex">
              Nota del juego
            </span>
            <ReviewRatingBadge rating={review.rating} size="sm" tone="dark" />
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col p-5">
          <div className="flex flex-1 flex-col">
            <div className="min-w-0">
              <p className="tavern-eyebrow">{review.gameTitle}</p>
              <h2 className="font-display mt-2 line-clamp-2 text-xl font-bold leading-tight text-text-primary transition group-hover:text-action sm:text-2xl">{review.title}</h2>
              <p className="tavern-meta mt-2 text-text-tertiary">Por {review.authorName}</p>
            </div>
            <p className="mt-4 line-clamp-3 text-sm font-medium leading-6 text-text-secondary">{review.summary}</p>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="tavern-meta inline-flex items-center gap-2 text-text-tertiary">
              <BrandIcon name="calendar" size={16} />
              {formatDate(review.publishedAt)}
            </p>
            <span className="inline-flex items-center gap-2 rounded-lg border border-action/20 bg-white/70 px-3 py-1.5 text-xs font-bold text-action shadow-sm transition group-hover:border-action-hover group-hover:bg-action group-hover:text-white">
              Leer ahora
              <span aria-hidden="true">-&gt;</span>
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}

function formatRating(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(new Date(value));
}
