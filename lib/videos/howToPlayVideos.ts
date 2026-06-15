import { Prisma, type Game } from "@prisma/client";
import { getYouTubeVideoId, isYouTubeUrl } from "@/lib/videos/youtube";

export const howToPlayVideoTypes = ["tutorial", "rules", "playthrough", "review_with_rules"] as const;
export type HowToPlayVideoType = (typeof howToPlayVideoTypes)[number];
export type HowToPlayVideoConfidence = "low" | "medium" | "high";

export type HowToPlayVideo = {
  url: string;
  title: string;
  source?: string;
  confidence: HowToPlayVideoConfidence;
  score: number;
  reason?: string;
  reviewed: boolean;
  isPrimary: boolean;
  type: HowToPlayVideoType;
};

type VideoCandidate = {
  url: string;
  title: string;
  snippet?: string | null;
  source?: string | null;
};

const TRUSTED_CHANNEL_PATTERNS = [
  /zacatrus/i,
  /aprende a jugar/i,
  /juegorrinos/i,
  /an[aá]lisis par[aá]lisis/i,
  /boardgamegeek/i,
  /devir/i,
  /asmodee/i,
  /maldito games/i,
  /huch/i
];

export function normalizeHowToPlayVideos(value: unknown): HowToPlayVideo[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const videos: HowToPlayVideo[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      continue;
    }

    const record = item as Record<string, unknown>;
    const url = typeof record.url === "string" ? record.url.trim() : "";
    const title = typeof record.title === "string" ? record.title.trim() : "";
    if (!url || !title || seen.has(videoKey(url))) {
      continue;
    }

    seen.add(videoKey(url));
    videos.push({
      url,
      title,
      source: typeof record.source === "string" ? record.source.trim() : undefined,
      confidence: normalizeConfidence(record.confidence),
      score: typeof record.score === "number" && Number.isFinite(record.score) ? Math.round(record.score) : 0,
      reason: typeof record.reason === "string" ? record.reason.trim() : undefined,
      reviewed: record.reviewed === true,
      isPrimary: record.isPrimary === true,
      type: normalizeVideoType(record.type)
    });
  }

  return ensureSinglePrimary(videos).slice(0, 3);
}

export function scoreHowToPlayVideoCandidate(candidate: VideoCandidate, game: Pick<Game, "title" | "name" | "originalTitle" | "publisher">) {
  const title = candidate.title || candidate.url;
  const haystack = normalizeComparable(`${title} ${candidate.snippet || ""}`);
  const gameTitle = game.title || game.name;
  const normalizedTitle = normalizeComparable(gameTitle);
  const normalizedOriginal = normalizeComparable(game.originalTitle || "");
  const titleTokens = titleWords(gameTitle);
  let score = 0;
  const reasons: string[] = [];

  if (normalizedTitle && haystack.includes(normalizedTitle)) {
    score += 30;
    reasons.push("coincide con el título del juego");
  } else if (normalizedOriginal && haystack.includes(normalizedOriginal)) {
    score += 30;
    reasons.push("coincide con el título original");
  } else if (titleTokens.length && titleTokens.filter((token) => haystack.includes(token)).length >= Math.min(2, titleTokens.length)) {
    score += 15;
    reasons.push("coincidencia parcial con el juego");
  }

  if (looksLikeWrongEdition(candidate, gameTitle)) {
    score -= 25;
    reasons.push("podría ser otra edición o expansión");
  }

  if (/c[oó]mo se juega|como se juega/.test(haystack)) {
    score += 30;
    reasons.push("indica cómo se juega");
  }
  if (/tutorial/.test(haystack)) {
    score += 25;
    reasons.push("es tutorial");
  }
  if (/reglas|rules/.test(haystack)) {
    score += 25;
    reasons.push("menciona reglas");
  }
  if (/aprende a jugar/.test(haystack)) {
    score += 20;
    reasons.push("aprende a jugar");
  }
  if (/partida explicada/.test(haystack)) {
    score += 10;
    reasons.push("partida explicada");
  }
  if (/rese[nñ]a|review/.test(haystack)) {
    if (/reglas|tutorial|c[oó]mo se juega|como se juega/.test(haystack)) {
      score += 5;
      reasons.push("reseña con explicación");
    } else {
      score -= 15;
      reasons.push("parece reseña sin tutorial");
    }
  }
  if (/unboxing/.test(haystack)) {
    score -= 25;
    reasons.push("unboxing descartable");
  }
  if (/partida completa/.test(haystack) && !/explicada|tutorial|reglas/.test(haystack)) {
    score -= 20;
    reasons.push("partida completa sin explicación");
  }

  if (looksSpanish(haystack)) {
    score += 20;
    reasons.push("parece contenido en español");
  } else if (looksEnglish(haystack)) {
    score -= 10;
    reasons.push("parece estar en inglés");
  }

  if (game.publisher && normalizeComparable(candidate.source || "").includes(normalizeComparable(game.publisher))) {
    score += 25;
    reasons.push("fuente oficial/editorial");
  } else if (TRUSTED_CHANNEL_PATTERNS.some((pattern) => pattern.test(`${candidate.source || ""} ${title}`))) {
    score += 20;
    reasons.push("canal confiable o especializado");
  } else if (/juegos de mesa|board game|meeple|dados|tablero/.test(haystack)) {
    score += 10;
    reasons.push("canal o contexto especializado");
  }

  const type = inferVideoType(haystack);
  const confidence = score >= 70 ? "high" : score >= 40 ? "medium" : "low";

  return {
    url: candidate.url,
    title: title.trim(),
    source: candidate.source || undefined,
    confidence,
    score,
    reason: reasons.slice(0, 4).join("; ") || "candidato encontrado en YouTube",
    reviewed: false,
    isPrimary: false,
    type
  } satisfies HowToPlayVideo;
}

export function mergeHowToPlayVideoSuggestions(existingValue: unknown, suggestions: HowToPlayVideo[]) {
  const existing = normalizeHowToPlayVideos(existingValue);
  const reviewed = existing.filter((video) => video.reviewed);
  const editableExisting = existing.filter((video) => !video.reviewed);
  const merged = [...reviewed, ...editableExisting];

  for (const suggestion of suggestions) {
    const index = merged.findIndex((video) => videoKey(video.url) === videoKey(suggestion.url));
    if (index >= 0) {
      if (!merged[index].reviewed) {
        merged[index] = { ...suggestion, reviewed: false, isPrimary: suggestion.isPrimary };
      }
      continue;
    }

    if (merged.length < 3) {
      merged.push({ ...suggestion, reviewed: false });
    }
  }

  return ensureSinglePrimary(merged).slice(0, 3);
}

export function sanitizeAdminHowToPlayVideos(value: unknown) {
  const videos = normalizeHowToPlayVideos(value).filter((video) => isYouTubeUrl(video.url));
  return ensureSinglePrimary(videos).slice(0, 3);
}

export function buildHowToPlayVideoQueries(game: Game) {
  const title = game.title || game.name;
  const queries = [
    `${title} cómo se juega español youtube`,
    `${title} tutorial español youtube`,
    `${title} reglas español youtube`,
    `${title} partida explicada español youtube`,
    game.originalTitle ? `${game.originalTitle} how to play board game youtube` : null
  ];

  return [...new Set(queries.filter(Boolean) as string[])];
}

export function selectHowToPlayVideos(candidates: VideoCandidate[], game: Game) {
  const scored = candidates
    .map((candidate) => scoreHowToPlayVideoCandidate(candidate, game))
    .filter((video) => video.confidence !== "low" || video.score >= 25)
    .sort((left, right) => right.score - left.score);
  const selected: HowToPlayVideo[] = [];

  for (const preferredType of ["tutorial", "rules", "playthrough", "review_with_rules"] as HowToPlayVideoType[]) {
    const match = scored.find((video) => video.type === preferredType && !selected.some((item) => videoKey(item.url) === videoKey(video.url)));
    if (match) {
      selected.push(match);
    }
    if (selected.length >= 3) {
      break;
    }
  }

  for (const video of scored) {
    if (selected.length >= 3) {
      break;
    }
    if (!selected.some((item) => videoKey(item.url) === videoKey(video.url))) {
      selected.push(video);
    }
  }

  return ensureSinglePrimary(selected.map((video, index) => ({ ...video, isPrimary: index === 0 && video.confidence === "high" }))).slice(0, 3);
}

function ensureSinglePrimary(videos: HowToPlayVideo[]) {
  let primarySeen = false;
  return videos.map((video) => {
    if (video.isPrimary && !primarySeen) {
      primarySeen = true;
      return video;
    }
    return { ...video, isPrimary: false };
  });
}

function normalizeConfidence(value: unknown): HowToPlayVideoConfidence {
  return value === "high" || value === "medium" || value === "low" ? value : "low";
}

function normalizeVideoType(value: unknown): HowToPlayVideoType {
  return howToPlayVideoTypes.includes(value as HowToPlayVideoType) ? value as HowToPlayVideoType : "tutorial";
}

function inferVideoType(text: string): HowToPlayVideoType {
  if (/partida explicada|playthrough/.test(text)) return "playthrough";
  if (/rese[nñ]a|review/.test(text) && /reglas|tutorial|c[oó]mo se juega|como se juega/.test(text)) return "review_with_rules";
  if (/reglas|rules/.test(text)) return "rules";
  return "tutorial";
}

function videoKey(url: string) {
  return getYouTubeVideoId(url) || url.trim().toLowerCase();
}

export function sourceFromUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function normalizeComparable(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleWords(value: string) {
  return normalizeComparable(value).split(" ").filter((word) => word.length > 2 && !["juego", "mesa", "edicion"].includes(word));
}

function looksLikeWrongEdition(candidate: VideoCandidate, gameTitle: string) {
  const text = normalizeComparable(candidate.title);
  const game = normalizeComparable(gameTitle);
  const gameTokens = titleWords(gameTitle);
  if (!gameTokens.length || text.includes(game)) {
    return false;
  }
  return /expansion|expansion|white death|segunda edicion|pocket|legacy|junior/.test(text) && gameTokens.some((token) => text.includes(token));
}

function looksSpanish(value: string) {
  return /\b(c[oó]mo|como|juega|reglas|espa[nñ]ol|aprende|partida|rese[nñ]a|tutorial)\b/.test(value);
}

function looksEnglish(value: string) {
  return /\b(how to play|rules|review|playthrough|learn to play)\b/.test(value);
}
