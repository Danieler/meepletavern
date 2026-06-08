import { GameStatus, Prisma } from "@prisma/client";
import {
  cleanFaqItems,
  cleanSourceItems,
  cleanStringList,
  type FaqItem,
  type SourceItem
} from "@/lib/content";
import { slugify } from "@/lib/slug";

export type GameFormPayload = {
  name?: unknown;
  slug?: unknown;
  imageUrl?: unknown;
  description?: unknown;
  review?: unknown;
  shortSummary?: unknown;
  pros?: unknown;
  cons?: unknown;
  bestFor?: unknown;
  notFor?: unknown;
  minPlayers?: unknown;
  maxPlayers?: unknown;
  playtime?: unknown;
  age?: unknown;
  complexity?: unknown;
  categories?: unknown;
  mechanics?: unknown;
  themes?: unknown;
  similarGames?: unknown;
  faqs?: unknown;
  seoTitle?: unknown;
  seoDescription?: unknown;
  buyUrl?: unknown;
  sources?: unknown;
  status?: unknown;
};

export type NormalizedGamePayload = {
  name: string;
  slug: string;
  imageUrl: string | null;
  description: string | null;
  review: string | null;
  shortSummary: string | null;
  pros: string[];
  cons: string[];
  bestFor: string | null;
  notFor: string | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  playtime: string | null;
  age: string | null;
  complexity: string | null;
  categories: string[];
  mechanics: string[];
  themes: string[];
  similarGames: string[];
  faqs: FaqItem[];
  seoTitle: string | null;
  seoDescription: string | null;
  buyUrl: string | null;
  sources: SourceItem[];
  status: GameStatus;
};

export function normalizeGamePayload(payload: GameFormPayload): NormalizedGamePayload {
  const name = requiredString(payload.name, "El nombre del juego es obligatorio.");
  const providedSlug = optionalString(payload.slug);
  const slug = slugify(providedSlug || name);

  if (!slug) {
    throw new Error("El slug no es valido.");
  }

  return {
    name,
    slug,
    imageUrl: optionalUrlLike(payload.imageUrl),
    description: optionalString(payload.description),
    review: optionalString(payload.review),
    shortSummary: optionalString(payload.shortSummary),
    pros: cleanStringList(payload.pros),
    cons: cleanStringList(payload.cons),
    bestFor: optionalString(payload.bestFor),
    notFor: optionalString(payload.notFor),
    minPlayers: optionalInt(payload.minPlayers),
    maxPlayers: optionalInt(payload.maxPlayers),
    playtime: optionalString(payload.playtime),
    age: optionalString(payload.age),
    complexity: optionalString(payload.complexity),
    categories: cleanStringList(payload.categories),
    mechanics: cleanStringList(payload.mechanics),
    themes: cleanStringList(payload.themes),
    similarGames: cleanStringList(payload.similarGames),
    faqs: cleanFaqItems(payload.faqs),
    seoTitle: optionalString(payload.seoTitle),
    seoDescription: optionalString(payload.seoDescription),
    buyUrl: optionalUrlLike(payload.buyUrl),
    sources: cleanSourceItems(payload.sources),
    status: normalizeStatus(payload.status)
  };
}

export function toPrismaUpdate(payload: NormalizedGamePayload): Prisma.GameUpdateInput {
  return {
    ...payload,
    faqs: payload.faqs as unknown as Prisma.InputJsonValue,
    sources: payload.sources as unknown as Prisma.InputJsonValue
  };
}

function requiredString(value: unknown, message: string) {
  const stringValue = optionalString(value);

  if (!stringValue) {
    throw new Error(message);
  }

  return stringValue;
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function optionalUrlLike(value: unknown) {
  const stringValue = optionalString(value);

  if (!stringValue) {
    return null;
  }

  if (
    stringValue.startsWith("http://") ||
    stringValue.startsWith("https://") ||
    stringValue.startsWith("/")
  ) {
    return stringValue;
  }

  return null;
}

function optionalInt(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function normalizeStatus(value: unknown) {
  if (
    value === GameStatus.draft ||
    value === GameStatus.published ||
    value === GameStatus.archived
  ) {
    return value;
  }

  return GameStatus.draft;
}
