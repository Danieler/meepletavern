"use client";

import { useState } from "react";
import type { GameRatingsData } from "@/lib/ratings/types";

export function UserRatingVote({
  gameId,
  initialVotesCount,
  onRated
}: {
  gameId: string;
  initialVotesCount: number;
  onRated?: (ratings: GameRatingsData) => void;
}) {
  const [score, setScore] = useState("8");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/account/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId, score: Number(score) })
      });
      const payload = await response.json();

      if (!response.ok) {
        setMessage(payload.error || "Inicia sesión para puntuar.");
        return;
      }

      onRated?.(payload.ratings);
      window.dispatchEvent(new CustomEvent("meepletavern:ratings-updated", { detail: payload.ratings }));
      setMessage("Tu nota ya cuenta en la valoración.");
    } catch {
      setMessage("No se pudo guardar tu nota.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-ember/20 bg-white/70 p-3">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-ember">¿Qué nota le das?</p>
      <div className="mt-3 flex gap-2">
        <select
          className="field-input min-h-10 min-w-0 flex-1 py-2 text-sm font-black"
          value={score}
          onChange={(event) => setScore(event.target.value)}
          aria-label="Tu nota"
        >
          {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((value) => (
            <option key={value} value={value}>
              {value}/10
            </option>
          ))}
        </select>
        <button className="button-primary min-h-10 shrink-0 px-4 py-2 text-sm" type="button" onClick={submit} disabled={pending}>
          {pending ? "Guardando..." : "Puntuar"}
        </button>
      </div>
      <p className="mt-2 text-xs font-semibold text-walnut/60">
        {initialVotesCount ? "Tu nota actualiza la media al momento." : "Tu nota estrenará la media de jugadores."}
      </p>
      {message ? <p className="mt-2 text-xs font-bold text-wood">{message}</p> : null}
    </div>
  );
}
