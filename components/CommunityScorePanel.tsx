"use client";

import { useEffect, useState } from "react";
import { getPublicRatingPresentation } from "@/lib/ratings/publicRating";
import type { GameRatingsData } from "@/lib/ratings/types";

export function CommunityScorePanel({ initialRatings }: { initialRatings: GameRatingsData }) {
  const [ratings, setRatings] = useState(initialRatings);
  const publicRating = getPublicRatingPresentation(ratings);
  const userAverage = publicRating.users.averageScore;
  const votesCount = publicRating.users.votesCount;

  useEffect(() => {
    function handleRatingsUpdated(event: Event) {
      const nextRatings = (event as CustomEvent<GameRatingsData>).detail;
      if (nextRatings?.users) {
        setRatings(nextRatings);
      }
    }

    window.addEventListener("meepletavern:ratings-updated", handleRatingsUpdated);
    return () => window.removeEventListener("meepletavern:ratings-updated", handleRatingsUpdated);
  }, []);

  return (
    <div className="flex items-center gap-5">
      <div className="flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-full border-4 border-ember bg-walnut font-display font-bold text-white">
        <span className="text-4xl">{publicRating.users.visibleOnDetail && typeof userAverage === "number" ? userAverage.toFixed(1) : "MT"}</span>
        <span className="text-xs text-ember">{votesCount ? "Jugadores" : "Sin votos"}</span>
      </div>
      <div className="flex-1">
        <p className="text-lg font-black text-wood">
          {votesCount ? `${votesCount} ${votesCount === 1 ? "jugador ha puntuado" : "jugadores han puntuado"}` : "Aún no hay notas de jugadores"}
        </p>
        <p className="mt-2 text-sm leading-6 text-walnut/70">
          {votesCount
            ? `La media de jugadores es ${userAverage?.toFixed(1)}/10. La mostramos separada de la recepción externa.`
            : "Sé el primero en dejar tu nota y estrenar la media de jugadores."}
        </p>
        {typeof publicRating.cardScore === "number" ? (
          <div className="mt-3 rounded-xl border border-ember/20 bg-ember/10 px-3 py-2 text-sm font-black text-wood">
            Recepción externa: {publicRating.cardScore.toFixed(1)}/10
          </div>
        ) : null}
      </div>
    </div>
  );
}
