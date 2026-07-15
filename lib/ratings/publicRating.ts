import { normalizeGameRatings } from "@/lib/ratings/gameRatings";
import type { ExternalRating, GameRatingsData } from "@/lib/ratings/types";

export type PublicRatingPresentation = {
  cardScore: number | null;
  cardLabel: string | null;
  external: ExternalRating | null;
  users: {
    votesCount: number;
    averageScore: number | null;
    visibleOnDetail: boolean;
    eligibleForRanking: boolean;
  };
};

export function getPublicRatingPresentation(value: unknown): PublicRatingPresentation {
  const ratings = normalizeGameRatings(value);
  const external = getEligibleExternalRating(ratings.external);
  const userVotes = Math.max(0, ratings.users.votesCount || 0);
  const userAverage = typeof ratings.users.averageScore === "number" ? ratings.users.averageScore : null;

  return {
    cardScore: typeof external?.score === "number" ? external.score : null,
    cardLabel: external?.label || null,
    external,
    users: {
      votesCount: userVotes,
      averageScore: userAverage,
      visibleOnDetail: userVotes > 0 && typeof userAverage === "number",
      eligibleForRanking: userVotes >= 10 && typeof userAverage === "number"
    }
  };
}

export function getPublicRatingScore(value: unknown) {
  return getPublicRatingPresentation(value).cardScore;
}

function getEligibleExternalRating(rating: ExternalRating | undefined) {
  if (!rating || typeof rating.score !== "number") return null;
  if (rating.confidence === "low") return null;
  if (rating.sourcesCount >= 2) return rating;

  const strongProductSignal = rating.signals.some(
    (signal) =>
      signal.sourceType === "product_rating" &&
      signal.confidence !== "low" &&
      typeof signal.reviewCount === "number" &&
      signal.reviewCount >= 100
  );

  return strongProductSignal ? rating : null;
}
