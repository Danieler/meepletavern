export type MasterImportBatchItem = {
  inputTitle: string;
  importedTitle: string | null;
  status: "ready_to_publish" | "needs_review" | "draft" | "update_existing" | "duplicate" | "failed";
  candidateId: string | null;
  gameId: string | null;
  matchedSources: string[];
  offersCreated: number;
  offersUpdated: number;
  sourcesWithOffers: string[];
  sourcesWithoutOffers: string[];
  failedSources: Array<{ sourceName: string; reason: string }>;
  sourceDiagnostics: Array<{
    sourceName: string;
    stage: "search" | "import" | "detect";
    outcome: "matched" | "no_match" | "unsupported" | "failed" | "skipped";
    reason?: string;
    confidence?: number;
    sourceUrl?: string | null;
  }>;
  imageDiagnostics?: {
    totalFound: number;
    publicSafeFound: number;
    selectedMainImage: { url: string; sourceName?: string } | null;
    selectedAdditionalImages: Array<{ url: string; sourceName?: string }>;
    rejected: Array<{ url: string; sourceName?: string; reason: string }>;
  };
  fieldDiagnostics?: Record<string, {
    value?: unknown;
    confidence: number;
    sourceName?: string;
    reason?: string;
  }>;
  taxonomyDiagnostics?: {
    categories: string[];
    mechanics: string[];
    themes: string[];
    confidence: number;
    warnings: string[];
    needsReview: boolean;
  };
  cacheDiagnostics?: Array<{ key: string; hit: boolean }>;
  externalCallDiagnostics?: Array<{
    type: string;
    sourceName?: string;
    cacheHit?: boolean;
    durationMs?: number;
    allowed: boolean;
    reason?: string;
    error?: string;
    timeout?: boolean;
  }>;
  costDiagnostics?: {
    tavilyUsed: boolean;
    tavilyReason: string | null;
    bedrockUsed: boolean;
    bedrockReason: string | null;
    videoSearchUsed: boolean;
  };
  bestOffer: {
    sourceName: string;
    sourceDisplayName: string | null;
    storeName: string | null;
    price: number | null;
    currency: string | null;
    availability: string | null;
    purchaseUrl: string | null;
    affiliateUrl: string | null;
    sourceUrl: string | null;
  } | null;
  warnings: string[];
  error: string | null;
};

export type MasterImportBatchState = {
  error: string | null;
  message: string | null;
  results: MasterImportBatchItem[];
  totals: {
    requested: number;
    imported: number;
    failed: number;
  } | null;
};

export type MasterImportBatchEvent =
  | {
      type: "start";
      total: number;
    }
  | {
      type: "item-start";
      index: number;
      total: number;
      title: string;
      imported: number;
      failed: number;
    }
  | {
      type: "item-complete";
      index: number;
      total: number;
      title: string;
      imported: number;
      failed: number;
      item: MasterImportBatchItem;
    }
  | {
      type: "done";
      state: MasterImportBatchState;
    }
  | {
      type: "error";
      message: string;
    };

export type MasterImportSource = {
  id: string;
  name: string;
  baseUrl: string;
};

export const initialMasterImportBatchState: MasterImportBatchState = {
  error: null,
  message: null,
  results: [],
  totals: null
};
