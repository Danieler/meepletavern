import { MediaAssetStatus, MediaAssetUsage, SourceStatus } from "@prisma/client";
import type { MediaAsset, Source } from "@prisma/client";
import { normalizeSourcePermissions } from "@/lib/editorialMappers";

export type PlaceholderKind =
  | "general"
  | "cooperativo"
  | "party"
  | "infantil"
  | "experto"
  | "narrativo"
  | "familiar";

type MediaSafetyAsset = Pick<MediaAsset, "status" | "usage">;
type MediaSafetySource = Pick<Source, "status" | "permissions"> | null | undefined;

export function canShowMedia(asset: MediaSafetyAsset | null | undefined, source: MediaSafetySource) {
  if (!asset || !source) {
    return false;
  }

  const permissions = normalizeSourcePermissions(source.permissions);

  return (
    asset.status === MediaAssetStatus.approved &&
    asset.usage === MediaAssetUsage.public &&
    source.status === SourceStatus.approved &&
    permissions.canUseImages
  );
}

export function placeholderUrl(kind: PlaceholderKind = "general") {
  return `/placeholders/${kind}.svg`;
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
