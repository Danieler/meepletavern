import type { ExternalSignal, ExternalSignalSourceType } from "@/lib/ratings/types";

type ExternalSearchResult = {
  title?: string;
  url?: string;
  snippet?: string;
  content?: string | null;
};

export async function searchExternalGameSources(gameTitle: string): Promise<{ results: ExternalSearchResult[]; warnings: string[] }> {
  const warnings: string[] = [];
  const provider = process.env.SEARCH_PROVIDER?.trim().toLowerCase() || "none";
  const endpoint = process.env.SEARCH_PROVIDER_ENDPOINT?.trim();

  if (provider === "none" || !endpoint) {
    warnings.push("No hay proveedor de búsqueda configurado; se usarán solo señales ya guardadas.");
    return { results: [], warnings };
  }

  const queries = buildSearchQueries(gameTitle);
  const results: ExternalSearchResult[] = [];

  for (const query of queries) {
    try {
      const response = await fetch(buildSearchUrl(endpoint, query), {
        headers: buildSearchHeaders(),
        cache: "no-store"
      });

      if (!response.ok) {
        warnings.push(`La búsqueda externa respondió con ${response.status}.`);
        continue;
      }

      const payload = (await response.json()) as { results?: ExternalSearchResult[] };
      if (Array.isArray(payload.results)) {
        results.push(...payload.results);
      }
    } catch (error) {
      warnings.push(error instanceof Error ? error.message : "No se pudieron consultar las fuentes externas.");
    }
  }

  return { results: dedupeSearchResults(results), warnings };
}

export function buildExternalSignalFromSearchResult(
  result: ExternalSearchResult,
  gameTitle: string
): ExternalSignal | null {
  const url = stringValue(result.url);
  const title = stringValue(result.title);
  const snippet = stringValue(result.snippet || result.content);
  const text = `${title} ${snippet}`.trim();
  const parsed = parseScoreFromText(text);

  if (!parsed) {
    return null;
  }

  const sourceName = getFriendlySourceName(url, title);
  const isExactMatch = isLikelySameGame(gameTitle, title || snippet);

  if (!isExactMatch) {
    return null;
  }

  const sourceType = inferSourceType(url, text);
  const confidence = parsed.rawScale === 100 || parsed.rawRating >= 8 ? "medium" : "low";

  return {
    sourceName,
    sourceType,
    ...(url ? { url } : {}),
    score: parsed.score,
    rawRating: parsed.rawRating,
    rawScale: parsed.rawScale,
    confidence,
    ...(title ? { matchedTitle: title } : {}),
    isExactMatch: true,
    ...(snippet ? { snippet } : {})
  };
}

export function normalizeSignalScore(signal: ExternalSignal): number | undefined {
  if (typeof signal.score === "number" && Number.isFinite(signal.score)) {
    return clamp(signal.score, 0, 10);
  }

  if (typeof signal.rawRating !== "number" || !Number.isFinite(signal.rawRating)) {
    return undefined;
  }

  const rawScale = typeof signal.rawScale === "number" && Number.isFinite(signal.rawScale) && signal.rawScale > 0 ? signal.rawScale : undefined;

  if (!rawScale) {
    if (signal.rawRating <= 5) {
      return clamp(signal.rawRating * 2, 0, 10);
    }

    if (signal.rawRating <= 10) {
      return clamp(signal.rawRating, 0, 10);
    }

    if (signal.rawRating <= 100) {
      return clamp(signal.rawRating / 10, 0, 10);
    }

    return undefined;
  }

  return clamp((signal.rawRating / rawScale) * 10, 0, 10);
}

export function legacySignalsToExternalSignals(value: unknown): ExternalSignal[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [];
  }

  const record = value as Record<string, unknown>;
  const signals: ExternalSignal[] = [];

  if (typeof record.amazonRating === "number") {
    signals.push({
      sourceName: "Amazon",
      sourceType: "product_rating",
      score: clamp(record.amazonRating * 2, 0, 10),
      rawRating: record.amazonRating,
      rawScale: 5,
      reviewCount: positiveInteger(record.amazonReviewCount),
      confidence: positiveInteger(record.amazonReviewCount) >= 50 ? "medium" : "low",
      isExactMatch: true
    });
  }

  if (Array.isArray(record.storeRatings)) {
    for (const item of record.storeRatings) {
      if (!isRecord(item)) {
        continue;
      }

      const storeName = stringValue(item.storeName || item.name || item.label);
      const rating = numberValue(item.rating);
      if (!storeName || typeof rating !== "number") {
        continue;
      }

      signals.push({
        sourceName: storeName,
        sourceType: "store_service_rating",
        score: clamp(rating, 0, 10),
        rawRating: rating,
        rawScale: 10,
        reviewCount: positiveInteger(item.reviewCount),
        confidence: "low",
        ...(stringValue(item.url) ? { url: stringValue(item.url) } : {}),
        isExactMatch: true
      });
    }
  }

  if (Array.isArray(record.reviewMentions)) {
    for (const item of record.reviewMentions) {
      if (!isRecord(item)) {
        continue;
      }

      const sourceName = stringValue(item.sourceName || item.name || item.label);
      if (!sourceName) {
        continue;
      }

      signals.push({
        sourceName,
        sourceType: "editorial_review_sentiment",
        sentiment: normalizeSentiment(stringValue(item.sentiment)),
        confidence: "low",
        ...(stringValue(item.url) ? { url: stringValue(item.url) } : {}),
        ...(stringValue(item.snippet) ? { snippet: stringValue(item.snippet) } : {}),
        isExactMatch: true
      });
    }
  }

  return signals;
}

export function isLikelySameGame(gameTitle: string, candidateTitle: string | null | undefined) {
  const normalizedGameTitle = normalizeTitle(gameTitle);
  const normalizedCandidateTitle = normalizeTitle(candidateTitle || "");

  if (!normalizedGameTitle || !normalizedCandidateTitle) {
    return false;
  }

  if (looksLikeExpansion(candidateTitle || "")) {
    return normalizedCandidateTitle === normalizedGameTitle;
  }

  return normalizedCandidateTitle === normalizedGameTitle || normalizedCandidateTitle.includes(normalizedGameTitle) || normalizedGameTitle.includes(normalizedCandidateTitle);
}

function buildSearchQueries(gameTitle: string) {
  return [
    `${gameTitle} reseña puntuación juego de mesa`,
    `${gameTitle} review score board game`,
    `${gameTitle} TricTrac avis`
  ];
}

function buildSearchUrl(endpoint: string, query: string) {
  const url = new URL(endpoint);
  url.searchParams.set("q", query);
  return url;
}

function buildSearchHeaders(): HeadersInit | undefined {
  const apiKey = process.env.SEARCH_PROVIDER_API_KEY?.trim() || process.env.SEARCH_API_KEY?.trim();

  return apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined;
}

function dedupeSearchResults(results: ExternalSearchResult[]) {
  const seen = new Map<string, ExternalSearchResult>();

  for (const result of results) {
    const key = `${stringValue(result.url) || ""}|${stringValue(result.title) || ""}|${stringValue(result.snippet) || ""}`;
    if (!seen.has(key)) {
      seen.set(key, result);
    }
  }

  return [...seen.values()];
}

function parseScoreFromText(text: string) {
  const normalizedText = text.replace(/\s+/g, " ").trim();
  const patterns = [
    /(?:boardgamegeek|bgg|avg rating|average rating|user rating|community rating|geek rating)\D{0,36}(\d+(?:[.,]\d+)?)(?:\s*\/\s*(10|5|100))?/i,
    /(?:amazon|clientes?|usuarios?|valoraci[oó]n media|customer rating)\D{0,36}(\d+(?:[.,]\d+)?)(?:\s*(?:de|out of|\/)\s*(5|10|100))?/i,
    /(\d+(?:[.,]\d+)?)\s*\/\s*(100|10|5)\b/i,
    /(?:puntuaci[oó]n(?: final)?|nota|valoraci[oó]n|rating|score)\s*[:\-]?\s*(\d+(?:[.,]\d+)?)(?:\s*\/\s*(100|10|5))?/i
  ];

  for (const pattern of patterns) {
    const match = normalizedText.match(pattern);
    if (!match) {
      continue;
    }

    const rawRating = numberValue(match[1]);
    if (typeof rawRating !== "number") {
      continue;
    }

    const rawScale = numberValue(match[2]) || inferScaleFromValue(rawRating);
    const score = rawScale ? clamp((rawRating / rawScale) * 10, 0, 10) : undefined;

    if (typeof score === "number") {
      return {
        rawRating,
        rawScale: rawScale || 10,
        score: roundOneDecimal(score)
      };
    }
  }

  return null;
}

function inferSourceType(url: string | null, text: string): ExternalSignalSourceType {
  const host = stringValue(url ? safeHost(url) : "");
  if (host.includes("amazon")) {
    return "product_rating";
  }

  if (/(opinión|reseña|review|análisis|analisis)/i.test(text)) {
    return "editorial_review_score";
  }

  return "editorial_review_score";
}

function getFriendlySourceName(url: string | null, title: string) {
  const host = url ? safeHost(url) : "";
  const map: Record<string, string> = {
    "amazon.es": "Amazon",
    "www.amazon.es": "Amazon",
    "trictrac.net": "Tric Trac",
    "www.trictrac.net": "Tric Trac",
    "analisisalcubo.es": "Análisis al Cubo",
    "misutmeeple.com": "Misut Meeple",
    "eldadodejack.com": "El Dado de Jack",
    "muevecubos.com": "Mueve Cubos",
    "elmiskatonico.es": "El Miskatónico",
    "labsk.net": "La BSK"
  };

  return map[host] || map[host.replace(/^www\./, "")] || (title ? title.split(" - ")[0] : "Fuente externa");
}

function normalizeTitle(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(asmodee|devir|maldito games|zygomatic|hasbro|ravensburger|cmon|lookout games)\b/g, " ")
    .replace(/\b(juego de mesa|espanol|español|nueva edicion|nueva edición|deluxe|aniversario|junior|familia|travel)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function looksLikeExpansion(value: string) {
  return /\b(expansion|expansi[oó]n|expansion para|deluxe|aniversario|junior|familia|travel|edici[oó]n especial)\b/i.test(value);
}

function normalizeSentiment(value: string) {
  if (value === "very_positive" || value === "positive" || value === "mixed" || value === "negative" || value === "unknown") {
    return value;
  }

  return "unknown";
}

function inferScaleFromValue(rawRating: number) {
  if (rawRating <= 5) {
    return 5;
  }

  if (rawRating <= 10) {
    return 10;
  }

  if (rawRating <= 100) {
    return 100;
  }

  return undefined;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundOneDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

function positiveInteger(value: unknown) {
  const number = numberValue(value);
  return typeof number === "number" && number > 0 ? Math.trunc(number) : 0;
}

function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function safeHost(url: string) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
