import { normalizeCandidateMetadata } from "@/lib/editorialMappers";
import type { NormalizedImportedCandidate } from "@/lib/import/importedGame";

export type FieldEvidence<T = unknown> = {
  field: string;
  value: T;
  sourceName: string;
  sourceUrl?: string;
  confidence: number;
  reason?: string;
};

export type ResolvedField<T = unknown> = {
  value?: T;
  confidence: number;
  sourceName?: string;
  reason?: string;
  alternatives?: FieldEvidence<T>[];
};

export type FieldDiagnostics = Record<string, ResolvedField>;

export type FieldEvidenceInput = {
  source: {
    name: string;
  };
  candidate: NormalizedImportedCandidate;
  confidence: number;
};

const OBJECTIVE_FIELDS = [
  "publisher",
  "minPlayers",
  "maxPlayers",
  "minPlayTime",
  "maxPlayTime",
  "minAge",
  "year",
  "language",
  "description",
  "shortDescription",
  "categories",
  "mechanics",
  "themes"
] as const;

export function buildFieldEvidence(results: FieldEvidenceInput[]): FieldEvidence[] {
  const evidence: FieldEvidence[] = [];

  for (const result of results) {
    const metadata = normalizeCandidateMetadata(result.candidate.metadata);
    const baseConfidence = Math.max(0, Math.min(1, result.candidate.confidence || result.confidence || 0.5));

    evidence.push({
      field: "title",
      value: result.candidate.title,
      sourceName: result.source.name,
      sourceUrl: result.candidate.sourceUrl,
      confidence: baseConfidence,
      reason: "Título importado desde fuente coincidente."
    });

    if (result.candidate.originalTitle) {
      evidence.push({
        field: "originalTitle",
        value: result.candidate.originalTitle,
        sourceName: result.source.name,
        sourceUrl: result.candidate.sourceUrl,
        confidence: baseConfidence * 0.9,
        reason: "Título original importado desde fuente coincidente."
      });
    }

    if (result.candidate.extractedDescription) {
      evidence.push({
        field: "description",
        value: result.candidate.extractedDescription,
        sourceName: result.source.name,
        sourceUrl: result.candidate.sourceUrl,
        confidence: usefulDescriptionScore(result.candidate.extractedDescription, baseConfidence),
        reason: "Descripción extraída de fuente."
      });
    }

    for (const field of OBJECTIVE_FIELDS) {
      const value = metadata[field];
      if (value === null || value === undefined || value === "") {
        continue;
      }

      evidence.push({
        field,
        value,
        sourceName: result.source.name,
        sourceUrl: result.candidate.sourceUrl,
        confidence: fieldConfidence(field, value, baseConfidence),
        reason: "Campo normalizado desde metadatos de fuente."
      });
    }
  }

  return evidence.filter((entry) => isUsableFieldEvidence(entry));
}

export function resolveFieldEvidence(evidence: FieldEvidence[]): FieldDiagnostics {
  const byField = new Map<string, FieldEvidence[]>();

  for (const entry of evidence) {
    const entries = byField.get(entry.field) || [];
    entries.push(entry);
    byField.set(entry.field, entries);
  }

  const diagnostics: FieldDiagnostics = {};

  for (const [field, entries] of byField) {
    const sorted = [...entries].sort((left, right) => right.confidence - left.confidence);
    const best = sorted[0];
    if (!best) {
      continue;
    }

    diagnostics[field] = {
      value: best.value,
      confidence: best.confidence,
      sourceName: best.sourceName,
      reason: best.reason,
      alternatives: sorted.slice(1, 4)
    };
  }

  return diagnostics;
}

export function fieldDiagnosticsToMetadataPatch(diagnostics: FieldDiagnostics) {
  const patch: Record<string, unknown> = {};

  for (const field of OBJECTIVE_FIELDS) {
    if (diagnostics[field]?.value !== undefined) {
      patch[field] = diagnostics[field].value;
    }
  }

  return patch;
}

function isUsableFieldEvidence(entry: FieldEvidence) {
  if (typeof entry.value === "number") {
    return Number.isFinite(entry.value) && isReasonableNumber(entry.field, entry.value);
  }

  if (typeof entry.value === "string") {
    const value = entry.value.trim();
    return value.length > 0 && !/(comprar|carrito|oferta|env[ií]o|stock|sku|referencia)/i.test(value);
  }

  if (Array.isArray(entry.value)) {
    return entry.value.some((item) => typeof item === "string" && item.trim().length > 0);
  }

  return Boolean(entry.value);
}

function fieldConfidence(field: string, value: unknown, baseConfidence: number) {
  if (typeof value === "number" && !isReasonableNumber(field, value)) {
    return 0;
  }

  if (field === "publisher" && typeof value === "string" && /(amazon|tienda|juguete|desconocido)/i.test(value)) {
    return baseConfidence * 0.35;
  }

  if (field === "description" && typeof value === "string") {
    return usefulDescriptionScore(value, baseConfidence);
  }

  if (Array.isArray(value)) {
    return value.length ? baseConfidence * 0.85 : 0;
  }

  return baseConfidence;
}

function usefulDescriptionScore(value: string, baseConfidence: number) {
  const clean = value.trim();
  if (clean.length < 60) {
    return baseConfidence * 0.4;
  }

  if (/(cookies|env[ií]o|devoluci[oó]n|a[nñ]adir al carrito|precio|iva incluido)/i.test(clean)) {
    return baseConfidence * 0.35;
  }

  return Math.min(0.98, baseConfidence + Math.min(0.15, clean.length / 2000));
}

function isReasonableNumber(field: string, value: number) {
  if (field === "minPlayers" || field === "maxPlayers") {
    return value >= 1 && value <= 30;
  }

  if (field === "minPlayTime" || field === "maxPlayTime") {
    return value >= 1 && value <= 600;
  }

  if (field === "minAge") {
    return value >= 2 && value <= 21;
  }

  if (field === "year") {
    return value >= 1900 && value <= new Date().getFullYear() + 2;
  }

  return true;
}
