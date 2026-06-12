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
    <div className="flex self-start rounded-[18px] border-2 border-ember bg-walnut px-5 py-4 text-white shadow-soft lg:flex-col lg:items-center lg:text-center">
      <div className="flex flex-1 items-center gap-4 lg:flex-col lg:gap-1">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-parchment lg:max-w-28">Nota de la taberna</p>
        <p className="font-display text-5xl font-black leading-none">{featuredRating.score.toFixed(1)}</p>
      </div>
      <div className="ml-4 flex items-center gap-2 border-l border-parchment/20 pl-4 lg:ml-0 lg:mt-2 lg:border-l-0 lg:border-t lg:pl-0 lg:pt-2">
        <BrandIcon name="star" size={18} />
        <p className="font-display text-base font-black text-ember">{featuredRating.label}</p>
      </div>
    </div>
  );
}
