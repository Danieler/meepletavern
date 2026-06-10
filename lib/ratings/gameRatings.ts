import type { Game, Prisma } from "@prisma/client";
import { calculateExternalRating } from "@/lib/ratings/calculateExternalRating";
import { enrichExternalSignals } from "@/lib/ratings/enrichExternalSignals";
import { legacySignalsToExternalSignals, normalizeSignalScore } from "@/lib/ratings/externalSignals";
import type { ExternalRating, ExternalSignal, GameRatingsData } from "@/lib/ratings/types";

export function defaultGameRatings(): GameRatingsData {
  return {
    users: {
      votesCount: 0,
      enabled: false
    }
  };
}

export function normalizeGameRatings(value: unknown): GameRatingsData {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return defaultGameRatings();
  }

  const record = value as Record<string, unknown>;
  const users = isRecord(record.users) ? record.users : {};
  const external = normalizeExternalRating(record.external);

  return {
    ...(external ? { external } : {}),
    users: {
      votesCount: positiveInteger(users.votesCount),
      enabled: users.enabled === true
    }
  };
}

export function buildGameRatingsPatch(input: {
  currentRatings: unknown;
  external: ExternalRating;
}): Prisma.JsonObject {
  const current = normalizeGameRatings(input.currentRatings);
  return {
    external: input.external,
    users: current.users
  };
}

export async function buildExternalRatingUpdate(
  game: Pick<Game, "ratings" | "sources" | "buyUrl" | "title" | "name">,
  candidateContext?: {
    title?: string | null;
    extractedDescription?: string | null;
    metadata?: Prisma.JsonValue | null;
  } | null
) {
  const { signals, warnings } = await enrichExternalSignals({ game, candidateContext });
  const external = calculateExternalRating(signals);

  return {
    ratings: buildGameRatingsPatch({
      currentRatings: game.ratings,
      external
    }),
    external,
    signals,
    warnings
  };
}

function normalizeExternalRating(value: unknown): ExternalRating | null {
  if (!isRecord(value)) {
    return null;
  }

  const label = stringValue(value.label);
  const confidence = normalizeConfidence(stringValue(value.confidence));
  const source = stringValue(value.source);
  const explanation = stringValue(value.explanation);
  const lastCheckedAt = stringValue(value.lastCheckedAt);
  const sourcesCount = positiveInteger(value.sourcesCount);
  const signals = normalizeStoredSignals(value.signals);
  const score = numberValue(value.score);

  if (!label || !source || !explanation || !lastCheckedAt) {
    return null;
  }

  return {
    ...(typeof score === "number" ? { score: clamp(score, 0, 10) } : {}),
    label: normalizeLabel(label),
    confidence,
    source: "external_signals",
    sourcesCount,
    explanation,
    lastCheckedAt,
    signals
  };
}

function normalizeStoredSignals(value: unknown): ExternalSignal[] {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeStoredSignal(item)).filter((item): item is ExternalSignal => Boolean(item));
  }

  if (isRecord(value)) {
    return legacySignalsToExternalSignals(value);
  }

  return [];
}

function normalizeStoredSignal(value: unknown): ExternalSignal | null {
  if (!isRecord(value)) {
    return null;
  }

  const sourceName = stringValue(value.sourceName);
  const sourceType = normalizeSourceType(stringValue(value.sourceType));
  if (!sourceName || !sourceType) {
    return null;
  }

  const score = normalizeSignalScore({
    sourceName,
    sourceType,
    ...(typeof value.score === "number" ? { score: value.score } : {}),
    ...(typeof value.rawRating === "number" ? { rawRating: value.rawRating } : {}),
    ...(typeof value.rawScale === "number" ? { rawScale: value.rawScale } : {}),
    confidence: normalizeConfidence(stringValue(value.confidence)),
    isExactMatch: value.isExactMatch === true
  });

  return {
    sourceName,
    sourceType,
    ...(stringValue(value.url) ? { url: stringValue(value.url) } : {}),
    ...(typeof score === "number" ? { score } : {}),
    ...(typeof value.rawRating === "number" ? { rawRating: value.rawRating } : {}),
    ...(typeof value.rawScale === "number" ? { rawScale: value.rawScale } : {}),
    ...(positiveInteger(value.reviewCount) ? { reviewCount: positiveInteger(value.reviewCount) } : {}),
    confidence: normalizeConfidence(stringValue(value.confidence)),
    ...(stringValue(value.sentiment) ? { sentiment: normalizeSentiment(stringValue(value.sentiment)) || undefined } : {}),
    ...(stringValue(value.snippet) ? { snippet: stringValue(value.snippet) } : {}),
    ...(stringValue(value.matchedTitle) ? { matchedTitle: stringValue(value.matchedTitle) } : {}),
    isExactMatch: value.isExactMatch === true
  };
}

function normalizeLabel(value: string) {
  switch (value) {
    case "Imprescindible":
    case "Muy recomendado":
    case "Recomendado":
    case "Interesante":
    case "Solo para fans":
    case "Sin datos suficientes":
      return value;
    default:
      return "Sin datos suficientes";
  }
}

function normalizeSourceType(value: string) {
  if (
    value === "product_rating" ||
    value === "editorial_review_score" ||
    value === "editorial_review_sentiment" ||
    value === "community_sentiment" ||
    value === "store_availability" ||
    value === "store_service_rating"
  ) {
    return value;
  }

  return null;
}

function normalizeConfidence(value: string) {
  if (value === "high" || value === "medium" || value === "low") {
    return value;
  }

  return "low";
}

function normalizeSentiment(value: string) {
  if (value === "very_positive" || value === "positive" || value === "mixed" || value === "negative" || value === "unknown") {
    return value;
  }

  return null;
}

function positiveInteger(value: unknown) {
  const number = numberValue(value);
  return typeof number === "number" && number > 0 ? Math.trunc(number) : 0;
}

function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
