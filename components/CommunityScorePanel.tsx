"use client";

import { useEffect, useState } from "react";
import type { GameRatingsData } from "@/lib/ratings/types";

export function CommunityScorePanel({ initialRatings }: { initialRatings: GameRatingsData }) {
  const [ratings, setRatings] = useState(initialRatings);
  const userAverage = ratings.users.averageScore;
  const votesCount = ratings.users.votesCount;
  const combinedScore = ratings.combined?.score;
  const score = typeof userAverage === "number" ? userAverage : combinedScore;

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
      <div className="flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-full border-4 border-ember bg-walnut font-display font-black text-white">
        <span className="text-4xl">{typeof score === "number" ? score.toFixed(1) : "MT"}</span>
        <span className="text-xs text-ember">{votesCount ? "Jugadores" : "Sin votos"}</span>
      </div>
      <div className="flex-1">
        <p className="text-lg font-black text-wood">
          {votesCount ? `${votesCount} ${votesCount === 1 ? "jugador ha puntuado" : "jugadores han puntuado"}` : "Aún no hay notas de jugadores"}
        </p>
        <p className="mt-2 text-sm leading-6 text-walnut/70">
          {votesCount
            ? `La media de jugadores es ${userAverage?.toFixed(1)}/10 y ya se suma a la nota de la taberna.`
            : "Sé el primero en dejar tu nota y estrenar la media de jugadores."}
        </p>
        {typeof combinedScore === "number" ? (
          <div className="mt-3 rounded-xl border border-ember/20 bg-ember/10 px-3 py-2 text-sm font-black text-wood">
            Nota de la taberna: {combinedScore.toFixed(1)}/10
          </div>
        ) : null}
      </div>
    </div>
  );
}
