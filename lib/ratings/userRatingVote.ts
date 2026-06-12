import type { Prisma } from "@prisma/client";
import { calculateExternalRating } from "@/lib/ratings/calculateExternalRating";
import { normalizeGameRatings } from "@/lib/ratings/gameRatings";
import type { ExternalSignal } from "@/lib/ratings/types";

export function applyUserRatingVote(currentRatings: Prisma.JsonValue | null | undefined, score: number): Prisma.JsonObject {
  const ratings = normalizeGameRatings(currentRatings);
  const cleanScore = clamp(score, 1, 10);
  const currentAverage = ratings.users.averageScore;
  const currentVotes = ratings.users.votesCount || 0;
  const nextVotes = currentVotes + 1;
  const nextAverage =
    typeof currentAverage === "number"
      ? roundOneDecimal((currentAverage * currentVotes + cleanScore) / nextVotes)
      : roundOneDecimal(cleanScore);
  const baseSignals = (ratings.external?.signals || []).filter((signal) => signal.sourceName !== "Comunidad MeepleTavern");
  const communitySignal: ExternalSignal = {
    sourceName: "Comunidad MeepleTavern",
    sourceType: "community_sentiment",
    score: nextAverage,
    rawRating: nextAverage,
    rawScale: 10,
    reviewCount: nextVotes,
    confidence: nextVotes >= 20 ? "high" : nextVotes >= 5 ? "medium" : "low",
    isExactMatch: true
  };
  const combined = calculateExternalRating([...baseSignals, communitySignal]);

  return {
    ...(ratings.external ? { external: ratings.external } : {}),
    combined,
    users: {
      votesCount: nextVotes,
      averageScore: nextAverage,
      enabled: true
    }
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundOneDecimal(value: number) {
  return Math.round(value * 10) / 10;
}
