"use client";

import { useEffect, useState } from "react";
import { BrandIcon } from "@/components/BrandIcon";
import type { GameRatingsData } from "@/lib/ratings/types";

export function GameRatingSummary({ initialRatings }: { initialRatings: GameRatingsData }) {
  const [ratings, setRatings] = useState(initialRatings);
  const featuredRating = ratings.combined ?? ratings.external;

  useEffect(() => {
    function handleRatingsUpdated(event: Event) {
      const nextRatings = (event as CustomEvent<GameRatingsData>).detail;
      if (nextRatings) {
        setRatings(nextRatings);
      }
    }

    window.addEventListener("meepletavern:ratings-updated", handleRatingsUpdated);
    return () => window.removeEventListener("meepletavern:ratings-updated", handleRatingsUpdated);
  }, []);

  if (!featuredRating?.score) {
    return null;
  }

  return (
    <div className="flex w-full max-w-full flex-col items-center rounded-md border-2 border-ember bg-walnut px-4 py-4 text-center text-white shadow-soft sm:w-auto sm:flex-row sm:text-left lg:flex-col lg:text-center">
      <div className="flex min-w-0 flex-col items-center gap-1 sm:flex-row sm:gap-4 lg:flex-col lg:gap-1">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-parchment lg:max-w-28">Nota de la taberna</p>
        <p className="font-display text-5xl font-black leading-none">{featuredRating.score.toFixed(1)}</p>
      </div>
      <div className="mt-3 flex min-w-0 items-center justify-center gap-2 border-t border-parchment/20 pt-3 sm:ml-4 sm:mt-0 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0 lg:ml-0 lg:mt-2 lg:border-l-0 lg:border-t lg:pl-0 lg:pt-2">
        <BrandIcon name="star" size={18} />
        <p className="font-display break-words text-base font-black text-ember">{featuredRating.label}</p>
      </div>
    </div>
  );
}
