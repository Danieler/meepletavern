import type { Prisma } from "@prisma/client";
import type {
  CandidateImage,
  GameFaqItem,
  GamePlayers,
  MediaAssetTypeKey
} from "@/lib/editorialTypes";

const mediaAssetTypes = new Set<MediaAssetTypeKey>(["cover", "box", "component", "placeholder"]);

export function normalizeCandidateMetadata(input: unknown): Prisma.JsonObject {
  return normalizeJsonObject(input);
}

export function normalizeCandidateImages(input: unknown): CandidateImage[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((item) => {
      if (!isRecord(item)) {
        return null;
      }

      const url = cleanString(item.url);
      if (!url) {
        return null;
      }

      const type = cleanMediaAssetType(item.type);
      const attribution = cleanString(item.attribution);
      const sourceUrl = cleanString(item.sourceUrl);
      const width = cleanPositiveNumber(item.width);
      const height = cleanPositiveNumber(item.height);

      return {
        url,
        ...(type ? { type } : {}),
        ...(attribution ? { attribution } : {}),
        ...(sourceUrl ? { sourceUrl } : {}),
        ...(width ? { width } : {}),
        ...(height ? { height } : {})
      };
    })
    .filter(Boolean) as CandidateImage[];
}

export function normalizeGamePlayers(input: unknown): GamePlayers {
  if (!isRecord(input)) {
    return {};
  }

  const min = cleanPositiveInteger(input.min);
  const max = cleanPositiveInteger(input.max);
  const ideal = cleanPositiveInteger(input.ideal);
  const label = cleanString(input.label);

  return {
    ...(min ? { min } : {}),
    ...(max ? { max } : {}),
    ...(ideal ? { ideal } : {}),
    ...(label ? { label } : {})
  };
}

export function normalizeGameFaq(input: unknown): GameFaqItem[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((item) => {
      if (!isRecord(item)) {
        return null;
      }

      const question = cleanString(item.question);
      const answer = cleanString(item.answer);

      return question || answer ? { question, answer } : null;
    })
    .filter(Boolean) as GameFaqItem[];
}

function normalizeJsonObject(input: unknown): Prisma.JsonObject {
  if (!isRecord(input)) {
    return {};
  }

  const output: Prisma.JsonObject = {};

  for (const [key, value] of Object.entries(input)) {
    const normalized = normalizeJsonValue(value);

    if (normalized !== undefined) {
      output[key] = normalized;
    }
  }

  return output;
}

function normalizeJsonValue(input: unknown): Prisma.JsonValue | undefined {
  if (input === null || typeof input === "string" || typeof input === "boolean") {
    return input;
  }

  if (typeof input === "number") {
    return Number.isFinite(input) ? input : undefined;
  }

  if (Array.isArray(input)) {
    return input
      .map(normalizeJsonValue)
      .filter((value): value is Prisma.JsonValue => value !== undefined);
  }

  if (isRecord(input)) {
    return normalizeJsonObject(input);
  }

  return undefined;
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return Boolean(input) && typeof input === "object" && !Array.isArray(input);
}

function cleanString(input: unknown) {
  return typeof input === "string" ? input.trim() : "";
}

function cleanMediaAssetType(input: unknown): MediaAssetTypeKey | null {
  return typeof input === "string" && mediaAssetTypes.has(input as MediaAssetTypeKey)
    ? (input as MediaAssetTypeKey)
    : null;
}

function cleanPositiveNumber(input: unknown) {
  const value = typeof input === "number" ? input : Number(input);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function cleanPositiveInteger(input: unknown) {
  const value = cleanPositiveNumber(input);
  return value ? Math.trunc(value) : null;
}
