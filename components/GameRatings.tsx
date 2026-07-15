"use client";

import { useState } from "react";
import { RatingBadge } from "@/components/RatingBadge";
import { UserRatingVote } from "@/components/UserRatingVote";
import type { CatalogGame } from "@/lib/catalog";
import { getPublicRatingPresentation } from "@/lib/ratings/publicRating";
import type { GameRatingsData } from "@/lib/ratings/types";

export function GameRatings({ game, compact = false }: { game: CatalogGame; compact?: boolean }) {
  const [ratings, setRatings] = useState<GameRatingsData>(game.ratings);
  const publicRating = getPublicRatingPresentation(ratings);
  const externalRating = publicRating.external;
  const userAverage = publicRating.users.averageScore;
  const userVotes = publicRating.users.votesCount;

  if (!externalRating && !publicRating.users.visibleOnDetail) {
    return null;
  }

  const showScore = typeof publicRating.cardScore === "number";

  return (
    <section className={compact ? "" : "container-page pb-10"}>
      <article className="relative overflow-hidden rounded-md border border-ember/20 bg-gradient-to-br from-[#fff8e8] via-[#f8edda] to-[#ead2a9] p-4 shadow-soft">
        <div className="relative flex items-start gap-3">
          {showScore ? <RatingBadge rating={publicRating.cardScore as number} size="md" label="EXT" /> : null}
          <div className="min-w-0">
            <p className="tavern-eyebrow">Recepción y jugadores</p>
            <h2 className="font-display mt-1 text-2xl font-bold leading-tight text-wood">
              {showScore ? externalRating?.label : "Por descubrir"}
            </h2>
            <p className="mt-2 text-sm leading-5 text-walnut/75">
              La recepción externa y las notas de jugadores se muestran por separado para no mezclar muestras distintas.
            </p>
          </div>
        </div>

        <div className="relative mt-4 space-y-2">
          <RatingLine
            label="Recepción"
            value={externalRating?.score !== undefined ? `${externalRating.score.toFixed(1)}/10` : "Pendiente"}
            helper={externalRating?.sourcesCount ? `${externalRating.sourcesCount} señales fiables` : "Sin señales suficientes"}
          />
          <RatingLine
            label="Jugadores de MeepleTavern"
            value={publicRating.users.visibleOnDetail && typeof userAverage === "number" ? `${userAverage.toFixed(1)}/10` : "Sin votos aún"}
            helper={userVotes ? `${userVotes} ${userVotes === 1 ? "jugador ha votado" : "jugadores han votado"}` : "Sé quien estrene la mesa"}
          />
        </div>

        {externalRating?.signals?.length ? (
          <div className="relative mt-4 flex flex-wrap gap-2">
            {externalRating.signals.slice(0, 5).map((signal) => (
              <span key={`${signal.sourceName}-${signal.sourceType}`} className="tavern-pill">
                {signal.sourceName}
                {signal.score !== undefined ? ` · ${signal.score.toFixed(1)}/10` : ""}
              </span>
            ))}
          </div>
        ) : null}

        <UserRatingVote gameId={game.id} initialVotesCount={userVotes} onRated={setRatings} />
      </article>
    </section>
  );
}

function RatingLine({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-white/70 bg-white/65 px-3 py-2">
      <div className="min-w-0">
        <p className="tavern-meta">{label}</p>
        <p className="truncate text-xs font-semibold text-walnut/60">{helper}</p>
      </div>
      <p className="shrink-0 text-base font-black text-wood">{value}</p>
    </div>
  );
}
