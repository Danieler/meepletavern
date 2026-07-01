import { normalizeGameRatings } from "@/lib/ratings/gameRatings";

export const REVIEW_RATING_FALLBACK = 8;

export function getFichaRatingScore(gameRatings: unknown) {
  const ratings = normalizeGameRatings(gameRatings);
  return (
    normalizeOptionalReviewRating(ratings.combined?.score) ??
    normalizeOptionalReviewRating(ratings.external?.score)
  );
}

export function getEffectiveReviewRating(gameRatings: unknown, fallbackRating?: number | null) {
  return (
    getFichaRatingScore(gameRatings) ??
    normalizeOptionalReviewRating(fallbackRating) ??
    REVIEW_RATING_FALLBACK
  );
}

export function normalizeReviewRatingValue(value: unknown) {
  const rating = normalizeOptionalReviewRating(value);
  if (rating === null) {
    throw new Error("Indica una nota de reseña entre 1 y 10.");
  }

  return rating;
}

function normalizeOptionalReviewRating(value: unknown) {
  const rating =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value.replace(",", "."))
        : NaN;

  if (!Number.isFinite(rating) || rating < 1 || rating > 10) {
    return null;
  }

  return Math.round(rating * 10) / 10;
}
