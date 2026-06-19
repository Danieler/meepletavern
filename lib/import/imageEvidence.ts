import type { CandidateImage } from "@/lib/editorialTypes";
import type { NormalizedImportedCandidate } from "@/lib/import/importedGame";

export type ImageEvidence = {
  url: string;
  sourceId?: string;
  sourceName?: string;
  sourceUrl?: string;
  allowedPublicUse: boolean;
  origin: "search_result" | "product_page" | "candidate" | "raw_data" | "amazon" | "unknown";
  type?: "cover" | "box" | "component" | "unknown";
  confidence: number;
  reason?: string;
};

export type ImageDiagnostics = {
  totalFound: number;
  publicSafeFound: number;
  rejected: Array<{
    url: string;
    sourceName?: string;
    reason: string;
  }>;
  selectedMainImage: ImageEvidence | null;
  selectedAdditionalImages: ImageEvidence[];
};

export type ImageEvidenceInput = {
  source: {
    id: string;
    name: string;
    baseUrl?: string | null;
  };
  candidate: NormalizedImportedCandidate;
  publicImageUrls: string[];
};

export function collectImageEvidence(results: ImageEvidenceInput[]): ImageEvidence[] {
  const evidence: ImageEvidence[] = [];

  for (const result of results) {
    const metadata = result.candidate.metadata;
    const publicUrls = new Set(result.publicImageUrls.map(normalizeImageUrlForDedupe).filter(Boolean));
    const imageAllowed = metadata.imageAllowed === true || result.source.name.toLowerCase().includes("amazon");

    for (const [index, url] of result.publicImageUrls.entries()) {
      evidence.push(buildEvidence({
        url,
        result,
        allowedPublicUse: true,
        origin: index === 0 ? "search_result" : "product_page",
        type: index === 0 ? "cover" : "component",
        confidence: 0.92,
        reason: "URL marcada como pública por el conector."
      }));
    }

    for (const image of result.candidate.candidateImages) {
      evidence.push(buildEvidence({
        url: image.url,
        result,
        allowedPublicUse: publicUrls.has(normalizeImageUrlForDedupe(image.url)) || imageAllowed,
        origin: "candidate",
        type: normalizeImageType(image.type),
        confidence: image.type === "cover" || image.type === "box" ? 0.9 : 0.72,
        sourceUrl: image.sourceUrl,
        reason: publicUrls.has(normalizeImageUrlForDedupe(image.url)) || imageAllowed
          ? "Imagen de candidato con uso público permitido."
          : "La fuente no permite publicar esta imagen automáticamente."
      }));
    }

    for (const url of readRawAdditionalImageUrls(metadata.rawData)) {
      evidence.push(buildEvidence({
        url,
        result,
        allowedPublicUse: publicUrls.has(normalizeImageUrlForDedupe(url)) || imageAllowed,
        origin: "raw_data",
        type: "component",
        confidence: 0.64,
        reason: publicUrls.has(normalizeImageUrlForDedupe(url)) || imageAllowed
          ? "Imagen adicional extraída de datos normalizados."
          : "Imagen adicional sin permiso público de la fuente."
      }));
    }
  }

  return dedupeImageEvidence(evidence);
}

export function dedupeImageEvidence(evidence: ImageEvidence[]) {
  const byUrl = new Map<string, ImageEvidence>();

  for (const entry of evidence) {
    const key = normalizeImageUrlForDedupe(entry.url);
    if (!key) {
      continue;
    }

    const current = byUrl.get(key);
    if (!current || rankImageEvidence(entry) > rankImageEvidence(current)) {
      byUrl.set(key, entry);
    }
  }

  return [...byUrl.values()];
}

export function selectPublicImages(evidence: ImageEvidence[], limit = 3) {
  return evidence
    .filter((entry) => entry.allowedPublicUse)
    .sort((left, right) => rankImageEvidence(right) - rankImageEvidence(left))
    .slice(0, limit);
}

export function buildImageDiagnostics(evidence: ImageEvidence[], selected: ImageEvidence[]): ImageDiagnostics {
  const selectedUrls = new Set(selected.map((entry) => normalizeImageUrlForDedupe(entry.url)));
  const rejected = evidence
    .filter((entry) => !entry.allowedPublicUse || !selectedUrls.has(normalizeImageUrlForDedupe(entry.url)))
    .map((entry) => ({
      url: entry.url,
      sourceName: entry.sourceName,
      reason: entry.allowedPublicUse ? "No seleccionada entre las 3 mejores imágenes públicas." : entry.reason || "Sin permiso público."
    }));

  return {
    totalFound: evidence.length,
    publicSafeFound: evidence.filter((entry) => entry.allowedPublicUse).length,
    rejected,
    selectedMainImage: selected[0] || null,
    selectedAdditionalImages: selected.slice(1)
  };
}

export function imageEvidenceToCandidateImages(selected: ImageEvidence[]): CandidateImage[] {
  return selected.map((entry, index) => ({
    url: entry.url,
    type: index === 0 ? "cover" : entry.type === "box" ? "box" : "component",
    attribution: entry.sourceName,
    sourceUrl: entry.sourceUrl
  }));
}

function buildEvidence(input: {
  url: string;
  result: ImageEvidenceInput;
  allowedPublicUse: boolean;
  origin: ImageEvidence["origin"];
  type?: ImageEvidence["type"];
  confidence: number;
  sourceUrl?: string;
  reason?: string;
}): ImageEvidence {
  return {
    url: input.url,
    sourceId: input.result.source.id,
    sourceName: input.result.source.name,
    sourceUrl: input.sourceUrl || input.result.candidate.sourceUrl || input.result.source.baseUrl || undefined,
    allowedPublicUse: input.allowedPublicUse,
    origin: input.origin,
    type: input.type || "unknown",
    confidence: input.confidence,
    reason: input.reason
  };
}

function rankImageEvidence(entry: ImageEvidence) {
  const typeScore = entry.type === "cover" || entry.type === "box" ? 30 : entry.type === "component" ? 10 : 0;
  const publicScore = entry.allowedPublicUse ? 50 : 0;
  const originScore = entry.origin === "product_page" || entry.origin === "candidate" ? 10 : entry.origin === "search_result" ? 8 : 0;
  return publicScore + typeScore + originScore + entry.confidence * 10;
}

function normalizeImageType(type: CandidateImage["type"] | undefined): ImageEvidence["type"] {
  if (type === "cover" || type === "box" || type === "component") {
    return type;
  }

  return "unknown";
}

function readRawAdditionalImageUrls(rawData: unknown) {
  if (!rawData || typeof rawData !== "object" || Array.isArray(rawData)) {
    return [];
  }

  const value = (rawData as Record<string, unknown>).additionalImageUrls;
  return Array.isArray(value)
    ? value.filter((url): url is string => typeof url === "string" && url.trim().length > 0)
    : [];
}

function normalizeImageUrlForDedupe(url: string) {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    for (const param of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
      parsed.searchParams.delete(param);
    }
    return parsed.toString();
  } catch {
    return url.trim();
  }
}
