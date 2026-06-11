import type {
  EditorialFlag,
  GameCandidateStatus,
  GameStatus,
  MediaAssetStatus,
  MediaAssetType,
  MediaAssetUsage,
  Prisma
} from "@prisma/client";

export const EDITORIAL_FLAGS = [
  "possible_duplicate",
  "missing_players",
  "missing_playtime",
  "missing_age",
  "image_not_allowed",
  "low_confidence",
  "needs_permission"
] as const;

// These domain contracts describe normalized editorial data after Json fields
// are mapped. Prisma remains the source of truth for persisted enum values.
export type EditorialFlagKey = EditorialFlag;

export type GameCandidateStatusKey = GameCandidateStatus;

export type GameStatusKey = GameStatus;

export type MediaAssetTypeKey = MediaAssetType;

export type MediaAssetStatusKey = MediaAssetStatus;

export type MediaAssetUsageKey = MediaAssetUsage;

export type CandidateImage = {
  url: string;
  type?: MediaAssetTypeKey;
  attribution?: string;
  sourceUrl?: string;
  width?: number;
  height?: number;
};

export type GamePlayers = {
  min?: number | null;
  max?: number | null;
  ideal?: number | null;
  label?: string | null;
};

export type GameFaqItem = {
  question: string;
  answer: string;
};

export type Source = {
  id: string;
  name: string;
  baseUrl: string;
  createdAt: Date;
  updatedAt: Date;
};

export type GameCandidate = {
  id: string;
  sourceId: string;
  sourceUrl: string;
  title: string;
  originalTitle?: string | null;
  metadata: Prisma.JsonObject;
  extractedDescription?: string | null;
  candidateImages: CandidateImage[];
  confidence: number;
  status: GameCandidateStatusKey;
  flags: EditorialFlagKey[];
  createdAt: Date;
  updatedAt: Date;
};

export type Game = {
  id: string;
  slug: string;
  title: string;
  originalTitle?: string | null;
  year?: number | null;
  players: GamePlayers;
  playtime?: string | null;
  minAge?: number | null;
  difficulty?: string | null;
  categories: string[];
  mechanics: string[];
  publisher?: string | null;
  spanishPublisher?: string | null;
  shortDescription?: string | null;
  description?: string | null;
  quickVerdict?: string | null;
  bestFor?: string | null;
  notFor?: string | null;
  pros: string[];
  cons: string[];
  faq: GameFaqItem[];
  seoTitle?: string | null;
  seoDescription?: string | null;
  primaryImageId?: string | null;
  imageFallbackAccepted: boolean;
  sourceIds: string[];
  status: GameStatusKey;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date | null;
};

export type MediaAsset = {
  id: string;
  gameId?: string | null;
  candidateId?: string | null;
  sourceId?: string | null;
  url: string;
  localPath?: string | null;
  type: MediaAssetTypeKey;
  status: MediaAssetStatusKey;
  usage: MediaAssetUsageKey;
  attribution?: string | null;
  createdAt: Date;
  updatedAt: Date;
};
