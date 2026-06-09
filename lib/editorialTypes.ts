import type { Prisma } from "@prisma/client";

export const EDITORIAL_FLAGS = [
  "possible_duplicate",
  "missing_players",
  "missing_playtime",
  "missing_age",
  "image_not_allowed",
  "low_confidence",
  "needs_permission"
] as const;

export type EditorialFlagKey = (typeof EDITORIAL_FLAGS)[number];

export type SourceTypeKey =
  | "publisher"
  | "distributor"
  | "shop"
  | "affiliate_api"
  | "open_data"
  | "manual";

export type SourceStatusKey = "not_contacted" | "contacted" | "approved" | "rejected";

export type GameCandidateStatusKey =
  | "pending"
  | "needs_review"
  | "approved"
  | "rejected"
  | "converted";

export type GameStatusKey = "draft" | "review" | "published" | "archived";

export type MediaAssetTypeKey = "cover" | "box" | "component" | "placeholder";

export type MediaAssetStatusKey = "candidate" | "approved" | "rejected";

export type MediaAssetUsageKey = "public" | "admin_only" | "purchase_only";

export type SourcePermissions = {
  canUseMetadata: boolean;
  canUseImages: boolean;
  canUseDescriptions: boolean;
  canUsePrices: boolean;
  canStoreImagesLocally: boolean;
};

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
  type: SourceTypeKey;
  status: SourceStatusKey;
  permissions: SourcePermissions;
  attributionRequired: boolean;
  attributionText?: string | null;
  notes?: string | null;
  contactEmail?: string | null;
  permissionProofUrl?: string | null;
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
  aiDraft?: Prisma.JsonObject | null;
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
