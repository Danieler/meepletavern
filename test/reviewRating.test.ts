import test from "node:test";
import assert from "node:assert/strict";
import { getEffectiveReviewRating, getFichaRatingScore } from "@/lib/reviewRating";

test("review rating uses the current ficha rating before the stored review fallback", () => {
  const rating = getEffectiveReviewRating({
    combined: {
      score: 8.7,
      label: "Muy recomendado",
      confidence: "high",
      source: "external_signals",
      sourcesCount: 3,
      explanation: "Datos editoriales y comunidad.",
      lastCheckedAt: "2026-07-01T00:00:00.000Z",
      signals: []
    },
    users: {
      votesCount: 2,
      enabled: true
    }
  }, 6.2);

  assert.equal(rating, 8.7);
});

test("review rating falls back to external ficha score when combined is missing", () => {
  const rating = getFichaRatingScore({
    external: {
      score: 7.9,
      label: "Recomendado",
      confidence: "medium",
      source: "external_signals",
      sourcesCount: 2,
      explanation: "Senales externas.",
      lastCheckedAt: "2026-07-01T00:00:00.000Z",
      signals: []
    },
    users: {
      votesCount: 0,
      enabled: false
    }
  });

  assert.equal(rating, 7.9);
});

test("review rating keeps the stored value only when the ficha has no score", () => {
  assert.equal(getEffectiveReviewRating({ users: { votesCount: 0, enabled: false } }, 6.4), 6.4);
  assert.equal(getEffectiveReviewRating(null, null), 8);
});
