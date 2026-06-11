import { MediaAssetStatus, MediaAssetUsage } from "@prisma/client";
import type { MediaAsset, Source } from "@prisma/client";

export type PlaceholderKind =
  | "general"
  | "cooperativo"
  | "party"
  | "infantil"
  | "experto"
  | "narrativo"
  | "familiar";

type MediaSafetyAsset = Pick<MediaAsset, "status" | "usage">;
type MediaSafetySource = Pick<Source, "id"> | Pick<Source, "name" | "baseUrl"> | null | undefined;

export function canShowMedia(asset: MediaSafetyAsset | null | undefined, source: MediaSafetySource) {
  if (!asset || !source) {
    return false;
  }

  return (
    asset.status === MediaAssetStatus.approved &&
    asset.usage === MediaAssetUsage.public
  );
}

export function placeholderUrl(kind: PlaceholderKind = "general") {
  return "/brand/meepletavern-mark.png";
}

export function inferPlaceholderKind(input: {
  categories?: string[];
  mechanics?: string[];
  themes?: string[];
  difficulty?: string | null;
}): PlaceholderKind {
  const text = [...(input.categories || []), ...(input.mechanics || []), ...(input.themes || []), input.difficulty || ""]
    .join(" ")
    .toLowerCase();

  if (text.includes("cooper")) {
    return "cooperativo";
  }

  if (text.includes("party") || text.includes("fiesta")) {
    return "party";
  }

  if (text.includes("infantil") || text.includes("niñ") || text.includes("kids")) {
    return "infantil";
  }

  if (text.includes("experto") || text.includes("duro") || text.includes("pesad") || text.includes("alta")) {
    return "experto";
  }

  if (text.includes("narrativ") || text.includes("historia") || text.includes("rol")) {
    return "narrativo";
  }

  if (text.includes("familiar") || text.includes("familia")) {
    return "familiar";
  }

  return "general";
}
