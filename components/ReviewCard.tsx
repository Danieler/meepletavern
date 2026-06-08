import Image from "next/image";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import type { Review } from "@/lib/catalog";

export function ReviewCard({ review }: { review: Review }) {
  return (
    <article className="overflow-hidden rounded-md border border-ink/10 bg-white shadow-soft">
      <Link href={`/resenas/${review.slug}`} className="grid gap-0 md:grid-cols-[220px_1fr]">
        {review.image ? (
          <div className="relative min-h-52 bg-ink/5">
            <Image src={review.image} alt={review.title} fill sizes="(min-width: 768px) 220px, 100vw" className="object-cover" />
          </div>
        ) : (
          <div className="flex min-h-52 items-center justify-center bg-ink px-5 text-center text-lg font-black text-white">
            {review.gameTitle}
          </div>
        )}
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase text-ruby">{review.gameTitle}</p>
              <h2 className="mt-2 text-2xl font-black text-ink">{review.title}</h2>
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
