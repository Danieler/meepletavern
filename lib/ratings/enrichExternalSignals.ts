import type { Game, Prisma } from "@prisma/client";
import { normalizeCandidateMetadata } from "@/lib/editorialMappers";
import {
  buildExternalSignalFromSearchResult,
  isLikelySameGame,
  legacySignalsToExternalSignals,
  searchExternalGameSources,
  normalizeSignalScore
} from "@/lib/ratings/externalSignals";
import type { ExternalSignal, ExternalSignalsResult } from "@/lib/ratings/types";

type EnrichExternalSignalsInput = {
  game: Pick<Game, "ratings" | "sources" | "buyUrl" | "title" | "name">;
  candidateContext?: {
    title?: string | null;
    extractedDescription?: string | null;
    metadata?: Prisma.JsonValue | null;
  } | null;
};

export async function enrichExternalSignals(input: EnrichExternalSignalsInput): Promise<ExternalSignalsResult> {
  const warnings: string[] = [];
  const signals: ExternalSignal[] = [];
  const candidateMetadata = normalizeCandidateMetadata(input.candidateContext?.metadata);

  signals.push(...readStoredSignals(input.game.ratings));

  const amazonSignal = buildAmazonSignal(candidateMetadata);
  if (amazonSignal) {
    signals.push(amazonSignal);
  }

  const { results, warnings: searchWarnings } = await searchExternalGameSources(input.game.title || input.game.name);
  warnings.push(...searchWarnings);

  for (const result of results) {
    const signal = buildExternalSignalFromSearchResult(result, input.game.title || input.game.name);
    if (signal) {
      signals.push(signal);
    }
  }

  const dedupedSignals = dedupeSignals(signals);

  if (!hasScoreSignals(dedupedSignals)) {
    warnings.push("Todavía no hay puntuaciones externas suficientes para calcular un consenso útil.");
  }

  return {
    signals: dedupedSignals,
    warnings
  };
}

function buildAmazonSignal(metadata: Prisma.JsonObject): ExternalSignal | null {
  const rating = readNumber(metadata, ["amazonRating", "amazon_rating"]);
  if (typeof rating !== "number") {
    return null;
  }

  const reviewCount = readPositiveInteger(metadata, ["amazonReviewCount", "amazon_review_count"]) || undefined;
  const score = normalizeSignalScore({
    sourceName: "Amazon",
    sourceType: "product_rating",
    rawRating: rating,
    rawScale: 5,
    reviewCount,
    confidence: reviewCount && reviewCount >= 100 ? "medium" : "low",
    isExactMatch: true
  });

  return {
    sourceName: "Amazon",
    sourceType: "product_rating",
    score,
    rawRating: rating,
    rawScale: 5,
    ...(reviewCount ? { reviewCount } : {}),
    confidence: reviewCount && reviewCount >= 100 ? "medium" : "low",
    isExactMatch: true
  };
}

function readStoredSignals(ratings: Prisma.JsonValue | null | undefined) {
  if (!ratings || typeof ratings !== "object" || Array.isArray(ratings)) {
    return [];
  }

  const record = ratings as Record<string, unknown>;
  const external = isRecord(record.external) ? record.external : null;
  const signals = external?.signals;

  if (Array.isArray(signals)) {
    return signals
      .map((item) => normalizeStoredSignal(item))
      .filter((item): item is ExternalSignal => Boolean(item));
  }

  if (isRecord(signals)) {
    return legacySignalsToExternalSignals(signals);
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

  const score = normalizeNumber(value.score);
  const rawRating = normalizeNumber(value.rawRating);
  const rawScale = normalizeNumber(value.rawScale);
  const reviewCount = positiveInteger(value.reviewCount) || undefined;

  return {
    sourceName,
    sourceType,
    ...(stringValue(value.url) ? { url: stringValue(value.url) } : {}),
    ...(typeof score === "number" ? { score } : {}),
    ...(typeof rawRating === "number" ? { rawRating } : {}),
    ...(typeof rawScale === "number" ? { rawScale } : {}),
    ...(reviewCount ? { reviewCount } : {}),
    confidence: normalizeConfidence(stringValue(value.confidence)),
    ...(normalizeSentiment(stringValue(value.sentiment))
      ? { sentiment: normalizeSentiment(stringValue(value.sentiment)) || undefined }
      : {}),
    ...(stringValue(value.snippet) ? { snippet: stringValue(value.snippet) } : {}),
    ...(stringValue(value.matchedTitle) ? { matchedTitle: stringValue(value.matchedTitle) } : {}),
    isExactMatch: value.isExactMatch === true
  };
}

function dedupeSignals(signals: ExternalSignal[]) {
  const seen = new Map<string, ExternalSignal>();

  for (const signal of signals) {
    const key = `${signal.sourceName.toLowerCase()}|${signal.sourceType}|${signal.url || ""}|${typeof signal.score === "number" ? signal.score.toFixed(2) : ""}`;
    if (!seen.has(key)) {
      seen.set(key, normalizeSignal(signal));
    }
  }

  return [...seen.values()];
}

function normalizeSignal(signal: ExternalSignal): ExternalSignal {
  return {
    ...signal,
    ...(typeof signal.score === "number" ? { score: clamp(signal.score, 0, 10) } : {}),
    ...(typeof signal.rawRating === "number" ? { rawRating: signal.rawRating } : {}),
    ...(typeof signal.rawScale === "number" ? { rawScale: signal.rawScale } : {}),
    confidence: normalizeConfidence(signal.confidence)
  };
}

function hasScoreSignals(signals: ExternalSignal[]) {
  return signals.some((signal) => typeof signal.score === "number" && signal.sourceType !== "store_service_rating");
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

function readNumber(metadata: Prisma.JsonObject, keys: string[]) {
  for (const key of keys) {
    const number = normalizeNumber(metadata[key]);
    if (typeof number === "number") {
      return number;
    }
  }

  return undefined;
}

function readPositiveInteger(metadata: Prisma.JsonObject, keys: string[]) {
  for (const key of keys) {
    const value = metadata[key];
    const number = positiveInteger(value);
    if (number > 0) {
      return number;
    }
  }

  return undefined;
}

function normalizeNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function positiveInteger(value: unknown) {
  const number = normalizeNumber(value);
  return typeof number === "number" && number > 0 ? Math.trunc(number) : 0;
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
