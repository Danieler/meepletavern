import { RatingBadge } from "@/components/RatingBadge";
import type { CatalogGame } from "@/lib/catalog";

export function GameRatings({ game }: { game: CatalogGame }) {
  const externalRating = game.ratings.external;

  if (!externalRating) {
    return null;
  }

  const externalScore = externalRating.score;
  const showScore = typeof externalRating.score === "number" && externalRating.confidence !== "low";

  return (
    <section className="container-page pb-10">
      <article className="rounded-md border border-ink/10 bg-white p-5 shadow-soft">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            {showScore ? <RatingBadge rating={externalScore as number} size="lg" label="CE" /> : null}
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-ruby">Consenso externo</p>
              <h2 className="mt-1 text-xl font-black text-ink">
                {showScore ? externalRating.label : "Señales externas limitadas"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-ink/65">{externalRating.explanation}</p>
            </div>
          </div>
          <div className="rounded-md border border-ink/10 bg-parchment/40 px-3 py-2 text-xs font-semibold text-ink/60">
            {externalRating.sourcesCount} puntuaciones · confianza {confidenceLabel(externalRating.confidence)}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-ink/50">
          <span>Estimación basada en señales públicas externas</span>
          <span>·</span>
          <span>actualizado el {formatDate(externalRating.lastCheckedAt)}</span>
        </div>

        {externalRating.signals?.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {externalRating.signals.slice(0, 4).map((signal) => (
              <span key={`${signal.sourceName}-${signal.sourceType}`} className="rounded-full bg-ink/5 px-3 py-1 text-xs font-semibold text-ink/70">
                {signal.sourceName}
                {signal.score !== undefined ? ` · ${signal.score.toFixed(1)}/10` : ""}
              </span>
            ))}
          </div>
        ) : null}
      </article>
    </section>
  );
}

function confidenceLabel(value: "low" | "medium" | "high") {
  if (value === "high") {
    return "alta";
  }

  if (value === "medium") {
    return "media";
  }

  return "baja";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}
