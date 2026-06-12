"use client";

import { useState } from "react";
import { RatingBadge } from "@/components/RatingBadge";
import { UserRatingVote } from "@/components/UserRatingVote";
import type { CatalogGame } from "@/lib/catalog";
import type { GameRatingsData } from "@/lib/ratings/types";

export function GameRatings({ game, compact = false }: { game: CatalogGame; compact?: boolean }) {
  const [ratings, setRatings] = useState<GameRatingsData>(game.ratings);
  const externalRating = ratings.external;
  const combinedRating = ratings.combined;
  const visibleRating = combinedRating || externalRating;
  const userAverage = ratings.users.averageScore;
  const userVotes = ratings.users.votesCount;

  if (!visibleRating) {
    return null;
  }

  const showScore = typeof visibleRating.score === "number";

  return (
    <section className={compact ? "" : "container-page pb-10"}>
      <article className="relative overflow-hidden rounded-2xl border border-ember/20 bg-gradient-to-br from-[#fff8e8] via-[#f8edda] to-[#ecd6b4] p-4 shadow-soft">
        <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-ember/20 blur-3xl" aria-hidden="true" />
        <div className="relative flex items-start gap-3">
          {showScore ? <RatingBadge rating={visibleRating.score as number} size="md" label="MT" /> : null}
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-ember">Nota de la taberna</p>
            <h2 className="font-display mt-1 text-2xl font-black leading-tight text-wood">
              {showScore ? visibleRating.label : "Por descubrir"}
            </h2>
            <p className="mt-2 text-sm leading-5 text-walnut/75">
              {combinedRating
                ? "Nuestra foto más completa: recepción pública más notas de jugadores."
                : "Una primera lectura de cómo está funcionando este juego fuera de la taberna."}
            </p>
          </div>
        </div>

        <div className="relative mt-4 space-y-2">
          <RatingLine
            label="Recepción"
            value={externalRating?.score !== undefined ? `${externalRating.score.toFixed(1)}/10` : "Pendiente"}
            helper={externalRating?.sourcesCount ? `${externalRating.sourcesCount} señales encontradas` : "Sin señales suficientes"}
          />
          <RatingLine
            label="La taberna"
            value={typeof userAverage === "number" ? `${userAverage.toFixed(1)}/10` : "Sin votos aún"}
            helper={userVotes ? `${userVotes} ${userVotes === 1 ? "jugador ha votado" : "jugadores han votado"}` : "Sé quien estrene la mesa"}
          />
        </div>

        {visibleRating.signals?.length ? (
          <div className="relative mt-4 flex flex-wrap gap-2">
            {visibleRating.signals.slice(0, 5).map((signal) => (
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
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/70 bg-white/60 px-3 py-2">
      <div className="min-w-0">
        <p className="text-xs font-black uppercase tracking-wide text-walnut/50">{label}</p>
        <p className="truncate text-xs font-semibold text-walnut/60">{helper}</p>
      </div>
      <p className="shrink-0 text-base font-black text-wood">{value}</p>
    </div>
  );
}
