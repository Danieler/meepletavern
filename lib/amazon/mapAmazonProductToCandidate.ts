import { EditorialFlag } from "@prisma/client";
import { normalizeCandidateImages, normalizeCandidateMetadata } from "@/lib/editorialMappers";
import { getSourcePolicy } from "@/lib/sourcePolicy";
import type { AmazonProduct } from "@/lib/amazon/amazonPaapiProvider";
import type { CandidateImage } from "@/lib/editorialTypes";
import type { Source } from "@prisma/client";

export type AmazonNormalizedCandidate = {
  sourceUrl: string;
  title: string;
  originalTitle: string | null;
  metadata: Record<string, unknown>;
  extractedDescription: string | null;
  candidateImages: CandidateImage[];
  confidence: number;
  flags: EditorialFlag[];
};

export function mapAmazonProductToCandidate(input: {
  product: AmazonProduct;
  source: Pick<Source, "status" | "permissions">;
  sourceUrl: string;
}): AmazonNormalizedCandidate {
  const policy = getSourcePolicy(input.source);
  const hasImage = Boolean(input.product.imageUrl);
  const metadata = normalizeCandidateMetadata({
    asin: input.product.asin,
    brand: input.product.brand || null,
    manufacturer: input.product.manufacturer || null,
    price: input.product.price ?? null,
    currency: input.product.currency || null,
    availability: input.product.availability || null,
    features: input.product.features || [],
    facts: input.product.facts || {}
  });
  const candidateImages = normalizeCandidateImages(
    hasImage
      ? [
          {
            url: input.product.imageUrl,
            type: "cover",
            sourceUrl: input.product.detailPageUrl || input.sourceUrl
          }
        ]
      : []
  );

  const flags = mergeFlags([
    EditorialFlag.missing_players,
    EditorialFlag.missing_playtime,
    EditorialFlag.missing_age,
    ...(hasImage && !policy.canUseImagePublicly ? [EditorialFlag.image_not_allowed] : []),
    ...(input.source.status !== "approved" ? [EditorialFlag.needs_permission] : [])
  ]);

  return {
    sourceUrl: input.product.detailPageUrl || input.sourceUrl,
    title: cleanTitle(input.product.title, input.product.asin),
    originalTitle: null,
    metadata,
    extractedDescription: input.product.features?.length ? input.product.features.join("\n") : null,
    candidateImages,
    confidence: confidenceFor(input.product, hasImage),
    flags
  };
}

function cleanTitle(title: string, asin: string) {
  let cleaned = title.trim().replace(/\s*:\s*Amazon\.es:.*$/i, "");

  const parts = cleaned.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length > 1) {
    const tail = parts.slice(1).join(" ").toLowerCase();
    if (/(juego de mesa|tiempo de juego|hecho por|amazon\.es|juguetes y juegos|promedio|para adultos|juego cooperativo)/i.test(tail)) {
      cleaned = parts[0];
    }
  }

  cleaned = cleaned.replace(/\s+/g, " ").trim();
  return cleaned || `Producto Amazon ${asin}`;
}

function confidenceFor(product: AmazonProduct, hasImage: boolean) {
  let confidence = 0.45;
  if (product.title.trim()) confidence += 0.2;
  if (product.brand || product.manufacturer) confidence += 0.12;
  if (product.price !== undefined) confidence += 0.08;
  if (product.availability) confidence += 0.05;
  if (hasImage) confidence += 0.1;
  return Math.min(confidence, 0.9);
}

function mergeFlags(flags: EditorialFlag[]) {
  return [...new Set(flags)];
}
