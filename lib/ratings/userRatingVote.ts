import type { Prisma } from "@prisma/client";
import { calculateExternalRating } from "@/lib/ratings/calculateExternalRating";
import { normalizeGameRatings } from "@/lib/ratings/gameRatings";
import type { ExternalSignal } from "@/lib/ratings/types";

export function applyUserRatingsAggregate(
  currentRatings: Prisma.JsonValue | null | undefined,
  input: { votesCount: number; averageScore: number | null }
): Prisma.JsonObject {
  const ratings = normalizeGameRatings(currentRatings);
  const nextVotes = Math.max(0, Math.trunc(input.votesCount || 0));
  const nextAverage =
    typeof input.averageScore === "number" && Number.isFinite(input.averageScore)
      ? roundOneDecimal(clamp(input.averageScore, 1, 10))
      : null;
  const baseSignals = (ratings.external?.signals || []).filter((signal) => signal.sourceName !== "Comunidad MeepleTavern");
  const combined =
    nextVotes > 0 && typeof nextAverage === "number"
      ? calculateExternalRating([
          ...baseSignals,
          {
            sourceName: "Comunidad MeepleTavern",
            sourceType: "community_sentiment",
            score: nextAverage,
            rawRating: nextAverage,
            rawScale: 10,
            reviewCount: nextVotes,
            confidence: nextVotes >= 20 ? "high" : nextVotes >= 5 ? "medium" : "low",
            isExactMatch: true
          } satisfies ExternalSignal
        ])
      : undefined;

  return {
    ...(ratings.external ? { external: ratings.external } : {}),
    ...(combined ? { combined } : {}),
    users: {
      votesCount: nextVotes,
      ...(typeof nextAverage === "number" ? { averageScore: nextAverage } : {}),
      enabled: nextVotes > 0
    }
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundOneDecimal(value: number) {
  return Math.round(value * 10) / 10;
}
