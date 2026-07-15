import assert from "node:assert/strict";
import test from "node:test";
import { getPublicRatingPresentation, getPublicRatingScore } from "@/lib/ratings/publicRating";
import type { GameRatingsData } from "@/lib/ratings/types";

const baseExternal = {
  score: 8.6,
  label: "Muy recomendado" as const,
  source: "external_signals" as const,
  explanation: "Recepción externa.",
  lastCheckedAt: "2026-07-01T00:00:00.000Z",
  signals: []
};

test("public ratings hide low-confidence or single weak external scores", () => {
  const ratings: GameRatingsData = {
    external: {
      ...baseExternal,
      confidence: "low",
      sourcesCount: 1
    },
    combined: {
      ...baseExternal,
      score: 10,
      confidence: "high",
      sourcesCount: 2
    },
    users: {
      votesCount: 1,
      averageScore: 10,
      enabled: true
    }
  };

  assert.equal(getPublicRatingScore(ratings), null);
  assert.equal(getPublicRatingPresentation(ratings).users.visibleOnDetail, true);
  assert.equal(getPublicRatingPresentation(ratings).users.eligibleForRanking, false);
});

test("public ratings allow medium/high external scores with enough evidence", () => {
  assert.equal(
    getPublicRatingScore({
      external: {
        ...baseExternal,
        confidence: "medium",
        sourcesCount: 2
      },
      users: {
        votesCount: 0,
        enabled: false
      }
    }),
    8.6
  );
});

test("public ratings allow a strong single product signal", () => {
  assert.equal(
    getPublicRatingScore({
      external: {
        ...baseExternal,
        confidence: "medium",
        sourcesCount: 1,
        signals: [
          {
            sourceName: "Tienda",
            sourceType: "product_rating",
            score: 8.6,
            reviewCount: 100,
            confidence: "medium",
            isExactMatch: true
          }
        ]
      },
      users: {
        votesCount: 0,
        enabled: false
      }
    }),
    8.6
  );
});
