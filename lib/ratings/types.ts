export type ExternalRatingLabel =
  | "Imprescindible"
  | "Muy recomendado"
  | "Recomendado"
  | "Interesante"
  | "Solo para fans"
  | "Sin datos suficientes";

export type ExternalRatingConfidence = "low" | "medium" | "high";

export type ExternalSignalSourceType =
  | "product_rating"
  | "editorial_review_score"
  | "editorial_review_sentiment"
  | "community_sentiment"
  | "store_availability"
  | "store_service_rating";

export type ExternalSignal = {
  sourceName: string;
  sourceType: ExternalSignalSourceType;
  url?: string;
  score?: number;
  rawRating?: number;
  rawScale?: number;
  reviewCount?: number;
  sentiment?: "very_positive" | "positive" | "mixed" | "negative" | "unknown";
  snippet?: string;
  confidence: ExternalRatingConfidence;
  matchedTitle?: string;
  isExactMatch?: boolean;
};

export type ExternalSignalsResult = {
  signals: ExternalSignal[];
  warnings: string[];
};

export type ExternalRating = {
  score?: number;
  label: ExternalRatingLabel;
  confidence: ExternalRatingConfidence;
  source: "external_signals";
  sourcesCount: number;
  explanation: string;
  lastCheckedAt: string;
  signals: ExternalSignal[];
};

export type GameRatingsData = {
  external?: ExternalRating;
  users: {
    votesCount: number;
    enabled: boolean;
  };
};

export type GameRatingsJson = GameRatingsData | Record<string, unknown> | null | undefined;

// Legacy shapes kept so older stored JSON can still be normalized.
export type ExternalRatingSignalPopularity = "high" | "medium" | "low" | "unknown";

export type StoreRatingSignal = {
  storeName: string;
  rating?: number;
  reviewCount?: number;
  url?: string;
};

export type ReviewMentionSignal = {
  sourceName: string;
  url?: string;
  sentiment: "very_positive" | "positive" | "mixed" | "negative" | "unknown";
  snippet?: string;
};

export type ExternalRatingSignals = {
  amazonRating?: number;
  amazonReviewCount?: number;
  storeRatings?: StoreRatingSignal[];
  reviewMentions?: ReviewMentionSignal[];
  popularitySignal?: ExternalRatingSignalPopularity;
};
