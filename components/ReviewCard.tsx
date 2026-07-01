import Link from "next/link";
import { BrandIcon } from "@/components/BrandIcon";
import { GameCoverImage } from "@/components/GameCoverImage";
import type { Review } from "@/lib/catalog";

type ReviewCardProps = {
  review: Review;
  compact?: boolean;
  list?: boolean;
  href?: string;
};

export function ReviewCard({ review, compact = false, list = false, href = `/resenas/${review.slug}` }: ReviewCardProps) {
  if (list) {
    return (
      <article className="border-b border-walnut/10 pb-3 last:border-b-0 last:pb-0">
        <Link href={href} className="grid grid-cols-[74px_minmax(0,1fr)_auto] gap-3 rounded-md transition hover:bg-ember/5" aria-label={`Abrir reseña de ${review.title}`}>
          <GameCoverImage {...review} gameTitle={review.gameTitle} variant="ranking" showPlaceholderLabel={false} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-extrabold leading-5 text-wood">{review.title}</span>
            <span className="mt-1 line-clamp-2 text-xs leading-5 text-walnut/75">{review.summary}</span>
            <span className="mt-1 flex flex-wrap gap-3 text-xs font-semibold leading-5 text-walnut/65">
              <span>{review.gameTitle}</span>
              <span className="inline-flex items-center gap-1"><BrandIcon name="calendar" size={14} />{formatDate(review.publishedAt)}</span>
            </span>
          </span>
          <span className="rating-chip self-start">
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
    <article className="group relative overflow-hidden rounded-md border border-walnut/15 bg-[linear-gradient(135deg,#fffaf0_0%,#f6fbf8_54%,#f4eef3_100%)] shadow-soft transition hover:-translate-y-0.5 hover:border-moss/35 hover:shadow-tavern">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#c9821f,#2f6f62,#8b6f7a)]" />
      <Link
        href={href}
        className={`${linkClassName} touch-manipulation cursor-pointer`}
        aria-label={`Abrir reseña de ${review.title}`}
      >
        <div className="relative min-h-52 overflow-hidden bg-ink/5">
          <GameCoverImage
            {...review}
            gameTitle={review.gameTitle}
            variant={compact ? "card" : "review"}
            className="h-full rounded-none transition duration-500 group-hover:scale-[1.02]"
            imageSizes={compact ? "(max-width: 768px) 100vw, 360px" : "(max-width: 768px) 100vw, 260px"}
          />
          <span className="absolute left-3 top-3 rounded-md border border-white/20 bg-ink/75 px-2.5 py-1 text-[11px] font-black uppercase leading-4 tracking-[0.12em] text-white backdrop-blur">
            Reseña
          </span>
        </div>
        <div className="flex min-w-0 flex-col p-4 sm:p-5">
          <div className="flex flex-1 flex-col">
            <div className="min-w-0">
              <p className="tavern-eyebrow">{review.gameTitle}</p>
              <h2 className="font-display mt-2 text-2xl font-bold leading-tight text-wood transition group-hover:text-moss">{review.title}</h2>
              <p className="tavern-meta mt-2">Por {review.authorName}</p>
            </div>
            <p className="mt-4 line-clamp-3 text-sm font-medium leading-6 text-walnut/82">{review.summary}</p>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="tavern-meta inline-flex items-center gap-2">
              <BrandIcon name="calendar" size={16} />
              {formatDate(review.publishedAt)}
            </p>
            <span className="inline-flex items-center gap-2 rounded-md border border-moss/15 bg-white/70 px-3 py-1.5 text-xs font-black text-moss shadow-sm transition group-hover:border-moss/35 group-hover:bg-moss group-hover:text-white">
              Leer ahora
              <span aria-hidden="true">-&gt;</span>
            </span>
          </div>
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
