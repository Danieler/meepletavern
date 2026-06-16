export type ImportedDifficultyInput = {
  title?: string | null;
  originalTitle?: string | null;
  metadata?: Record<string, unknown> | null;
  description?: string | null;
  categories?: string[] | null;
  mechanics?: string[] | null;
  themes?: string[] | null;
  minAge?: number | null;
  minPlayTime?: number | null;
  maxPlayTime?: number | null;
  playtime?: string | null;
  fallback?: string | null;
};

export type ImportedDifficultySource = "bgg_weight" | "known_weight" | "explicit" | "heuristic" | "fallback" | "default";

export type ImportedDifficultyResult = {
  value: string;
  source: ImportedDifficultySource;
  weight: number | null;
};

const KNOWN_BGG_WEIGHTS: Array<{ pattern: RegExp; weight: number }> = [
  { pattern: /\bspirit island\b/i, weight: 4.07 },
  { pattern: /\bgloomhaven\b/i, weight: 3.92 },
  { pattern: /\bbrass\s*:?\s*birmingham\b/i, weight: 3.86 },
  { pattern: /\bark nova\b/i, weight: 3.8 },
  { pattern: /\bstar wars\s*:?\s*rebellion\b/i, weight: 3.75 },
  { pattern: /\bgreat western trail\b/i, weight: 3.7 },
  { pattern: /\btwilight struggle\b/i, weight: 3.62 },
  { pattern: /\bn[ée]mesis\b|\bnemesis\b/i, weight: 3.49 },
  { pattern: /\bscythe\b/i, weight: 3.45 },
  { pattern: /\bterraforming mars\b/i, weight: 3.27 },
  { pattern: /\bdune\s*:?\s*imperium\b/i, weight: 3.01 },
  { pattern: /\bcatan\b|\bcat[áa]n\b/i, weight: 2.3 },
  { pattern: /\bdobble\b|\bspot it\b/i, weight: 1.05 }
];

export function normalizeDifficultyFromImportedData(input: ImportedDifficultyInput): string {
  return inferImportedDifficulty(input).value;
}

export function normalizeDifficultyFromImportedDataOrNull(input: ImportedDifficultyInput): string | null {
  const result = inferImportedDifficulty(input);
  return result.source === "default" ? null : result.value;
}

export function inferImportedDifficulty(input: ImportedDifficultyInput): ImportedDifficultyResult {
  const metadata = input.metadata || {};
  const bggWeight = readBggWeight(metadata);
  if (bggWeight !== null) {
    return { value: difficultyFromWeight(bggWeight), source: "bgg_weight", weight: bggWeight };
  }

  const knownWeight = readKnownWeight(`${input.title || ""} ${input.originalTitle || ""}`);
  if (knownWeight !== null) {
    return { value: difficultyFromWeight(knownWeight), source: "known_weight", weight: knownWeight };
  }

  const explicit = readExplicitDifficulty(metadata);
  if (explicit) {
    return { value: explicit, source: "explicit", weight: null };
  }

  const heuristic = difficultyFromHeuristics(input);
  if (heuristic) {
    return { value: heuristic, source: "heuristic", weight: null };
  }

  const fallback = normalizeDifficultyLabel(input.fallback);
  if (fallback) {
    return { value: fallback, source: "fallback", weight: null };
  }

  return { value: "Media", source: "default", weight: null };
}

export function difficultyFromWeight(weight: number): string {
  if (weight < 1.8) return "Fácil";
  if (weight < 2.5) return "Media ligera";
  if (weight < 3.35) return "Media";
  return "Alta";
}

export function difficultyRank(value: string | null | undefined): number {
  const normalized = normalizeComparable(value);
  if (!normalized) return 0;
  if (normalized.includes("muy alta") || normalized.includes("muy dificil") || normalized.includes("muy difícil")) return 5;
  if (normalized.includes("alta") || normalized.includes("dificil") || normalized.includes("difícil") || normalized.includes("duro") || normalized.includes("pesad")) return 4;
  if (normalized.includes("media alta") || normalized.includes("medio alta")) return 4;
  if (normalized.includes("media ligera") || normalized.includes("medio ligero") || normalized.includes("ligera")) return 2;
  if (normalized.includes("media") || normalized.includes("medio") || normalized.includes("moderad")) return 3;
  if (normalized.includes("facil") || normalized.includes("fácil") || normalized.includes("baja") || normalized.includes("sencill")) return 1;
  return 0;
}

function difficultyFromHeuristics(input: ImportedDifficultyInput) {
  const text = buildSearchableText(input);
  const minAge = input.minAge ?? readPositiveNumber(input.metadata, "minAge");
  const playtime = readPlaytimeRange(input);
  const maxTime = playtime.max || playtime.min;
  const highSignals = /(experto|expert|avanzad|wargame|campaña|campaign|eurogame pesado|gesti[oó]n compleja|alta profundidad|estrat[eé]gico avanzado|heavy game|medium heavy|duro|juego pesado)/i.test(text);
  const mediumSignals = /(estrategia|estrat[eé]gico|eurogame|gesti[oó]n de recursos|motor|deckbuilding|construcci[oó]n de mazos|colocaci[oó]n de trabajadores|control de [aá]reas)/i.test(text);
  const lightSignals = /(party|fiesta|infantil|ni[nñ]os|familiar|r[aá]pido|sencillo|simple|f[aá]cil|gateway|iniciaci[oó]n|fillers?)/i.test(text);

  if (maxTime >= 150 && (minAge || 0) >= 14) return "Alta";
  if (maxTime >= 120 && highSignals) return "Alta";
  if (maxTime >= 120 && (minAge || 0) >= 14 && mediumSignals) return "Alta";
  if (highSignals && (minAge || 0) >= 14 && maxTime >= 90) return "Alta";
  if (maxTime >= 90 && (minAge || 0) >= 12) return "Media";
  if (mediumSignals) return "Media";
  if (maxTime > 0 && maxTime <= 30 && (minAge || 0) <= 8) return "Fácil";
  if (maxTime > 0 && maxTime <= 45 && lightSignals) return (minAge || 0) <= 8 ? "Fácil" : "Media ligera";
  if (lightSignals && !mediumSignals && !highSignals) return "Media ligera";

  return null;
}

function readBggWeight(metadata: Record<string, unknown> | null | undefined): number | null {
  if (!metadata) return null;
  const direct = readFirstNumber(metadata, [
    "bggWeight",
    "bggAverageWeight",
    "averageweight",
    "averageWeight",
    "average_weight",
    "boardGameGeekWeight",
    "boardgamegeekWeight",
    "complexityWeight",
    "complexityScore"
  ]);
  if (direct !== null && direct >= 1 && direct <= 5) return direct;

  const nested = readNestedWeight(metadata, 0);
  return nested !== null && nested >= 1 && nested <= 5 ? nested : null;
}

function readNestedWeight(value: unknown, depth: number): number | null {
  if (depth > 4 || !value || typeof value !== "object") return null;

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = readNestedWeight(item, depth + 1);
      if (found !== null) return found;
    }
    return null;
  }

  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    const keyLooksUseful = /(bgg|boardgamegeek|average).*weight|weight.*(bgg|boardgamegeek|average)|complexity.*(weight|score)/i.test(key);
    if (keyLooksUseful) {
      const parsed = numberFromUnknown(item);
      if (parsed !== null && parsed >= 1 && parsed <= 5) return parsed;
    }

    if (/^(bgg|boardgamegeek|statistics|stats|ratings)$/i.test(key)) {
      const found = readNestedWeight(item, depth + 1);
      if (found !== null) return found;
    }
  }

  return null;
}

function readExplicitDifficulty(metadata: Record<string, unknown>) {
  const direct = readFirstString(metadata, ["difficulty", "complexity", "dificultad", "complejidad", "difficultyLabel", "complexityLabel"]);
  const normalizedDirect = normalizeDifficultyLabel(direct);
  if (normalizedDirect) return normalizedDirect;

  const facts = metadata.facts;
  if (facts && typeof facts === "object" && !Array.isArray(facts)) {
    for (const [key, value] of Object.entries(facts as Record<string, unknown>)) {
      if (/(dificultad|complejidad|complexity|difficulty)/i.test(key)) {
        const normalized = normalizeDifficultyLabel(typeof value === "string" ? value : String(value ?? ""));
        if (normalized) return normalized;
      }
    }
  }

  return null;
}

function normalizeDifficultyLabel(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = normalizeComparable(value);
  if (!normalized) return null;

  if (normalized.includes("muy alta") || normalized.includes("muy dificil") || normalized.includes("muy difícil")) return "Muy alta";
  if (normalized.includes("alta") || normalized.includes("dificil") || normalized.includes("difícil") || normalized.includes("duro") || normalized.includes("pesad")) return "Alta";
  if (normalized.includes("media alta") || normalized.includes("medio alta")) return "Alta";
  if (normalized.includes("media ligera") || normalized.includes("medio ligero") || normalized.includes("ligera")) return "Media ligera";
  if (normalized.includes("media") || normalized.includes("medio") || normalized.includes("moderad")) return "Media";
  if (normalized.includes("muy facil") || normalized.includes("muy fácil")) return "Muy fácil";
  if (normalized.includes("facil") || normalized.includes("fácil") || normalized.includes("baja") || normalized.includes("sencill")) return "Fácil";

  return null;
}

function readKnownWeight(text: string) {
  const normalized = text.trim();
  if (!normalized) return null;
  return KNOWN_BGG_WEIGHTS.find((entry) => entry.pattern.test(normalized))?.weight ?? null;
}

function readPlaytimeRange(input: ImportedDifficultyInput) {
  const minFromMetadata = input.minPlayTime ?? readPositiveNumber(input.metadata, "minPlayTime");
  const maxFromMetadata = input.maxPlayTime ?? readPositiveNumber(input.metadata, "maxPlayTime");
  if (minFromMetadata || maxFromMetadata) {
    return {
      min: minFromMetadata || maxFromMetadata || 0,
      max: maxFromMetadata || minFromMetadata || 0
    };
  }

  if (input.playtime) {
    const numbers = [...input.playtime.matchAll(/\d{1,4}/g)].map((match) => Number(match[0])).filter((value) => Number.isFinite(value));
    if (numbers.length) {
      return {
        min: numbers[0],
        max: numbers.length > 1 ? numbers[1] : numbers[0]
      };
    }
  }

  return { min: 0, max: 0 };
}

function buildSearchableText(input: ImportedDifficultyInput) {
  const metadata = input.metadata || {};
  return [
    input.title,
    input.originalTitle,
    input.description,
    input.playtime,
    ...(input.categories || []),
    ...(input.mechanics || []),
    ...(input.themes || []),
    ...readStringList(metadata, "categories"),
    ...readStringList(metadata, "categoryHints"),
    ...readStringList(metadata, "mechanics"),
    ...readStringList(metadata, "mechanicHints"),
    ...readStringList(metadata, "themes"),
    ...readStringList(metadata, "themeHints"),
    ...readStringList(metadata, "features"),
    ...readFacts(metadata)
  ].filter(Boolean).join(" ");
}

function readStringList(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

function readFacts(metadata: Record<string, unknown>) {
  const facts = metadata.facts;
  if (!facts || typeof facts !== "object" || Array.isArray(facts)) return [];
  return Object.entries(facts as Record<string, unknown>).flatMap(([key, value]) => [`${key}`, typeof value === "string" ? value : String(value ?? "")]);
}

function readFirstNumber(metadata: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = numberFromUnknown(metadata[key]);
    if (value !== null) return value;
  }
  return null;
}

function readPositiveNumber(metadata: Record<string, unknown> | null | undefined, key: string) {
  if (!metadata) return null;
  const value = numberFromUnknown(metadata[key]);
  return value !== null && value > 0 ? value : null;
}

function readFirstString(metadata: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function numberFromUnknown(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const match = value.replace(",", ".").match(/\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeComparable(value: string | null | undefined) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9ñÑáéíóúÁÉÍÓÚüÜ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("es");
}
