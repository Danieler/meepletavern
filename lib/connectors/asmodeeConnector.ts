import { EditorialFlag } from "@prisma/client";
import { normalizeCandidateImages, normalizeCandidateMetadata } from "@/lib/editorialMappers";
import type { CandidateImage } from "@/lib/editorialTypes";

export type NormalizedCandidate = {
  sourceUrl: string;
  title: string;
  originalTitle: string | null;
  metadata: Record<string, unknown>;
  extractedDescription: string | null;
  candidateImages: CandidateImage[];
  confidence: number;
  flags: EditorialFlag[];
};

export async function extractAsmodeeCandidate(sourceUrl: string): Promise<NormalizedCandidate> {
  const response = await fetch(sourceUrl, {
    headers: {
      "User-Agent": "MeepleTavern editorial import/1.0"
    },
    next: { revalidate: 0 }
  });

  if (!response.ok) {
    throw new Error(`Asmodee respondio con ${response.status}.`);
  }

  const html = await response.text();
  const title = cleanTitle(
    meta(html, "og:title") ||
      meta(html, "twitter:title") ||
      textBetween(html, "<title", "</title") ||
      ""
  );
  const extractedDescription = clean(meta(html, "og:description") || meta(html, "description") || "");
  const imageUrl = absoluteUrl(meta(html, "og:image") || meta(html, "twitter:image") || "", sourceUrl);
  const year = firstNumber(matchLabel(html, /Año|Year/i));
  const minAge = firstNumber(matchLabel(html, /Edad|Age/i));
  const players = parsePlayers(html);
  const playtime = parsePlaytime(html);
  const publisher = clean(matchLabel(html, /Editorial|Publisher|Studio/i));
  const metadata = normalizeCandidateMetadata({
    year,
    players,
    minAge,
    minPlayTime: playtime.min,
    maxPlayTime: playtime.max,
    publisher
  });
  const candidateImages = normalizeCandidateImages(imageUrl ? [{ url: imageUrl, type: "cover", sourceUrl }] : []);
  const flags = calculateFlags({
    title,
    players,
    playtime,
    minAge,
    hasImage: candidateImages.length > 0
  });

  return {
    sourceUrl,
    title: title || "Producto Asmodee sin titulo",
    originalTitle: null,
    metadata,
    extractedDescription: extractedDescription || null,
    candidateImages,
    confidence: confidenceFor({ title, players, playtime, minAge, hasImage: candidateImages.length > 0 }),
    flags
  };
}

function meta(html: string, name: string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i");
  return decode(pattern.exec(html)?.[1] || "");
}

function textBetween(html: string, start: string, end: string) {
  const startIndex = html.toLowerCase().indexOf(start.toLowerCase());
  if (startIndex < 0) {
    return "";
  }

  const contentStart = html.indexOf(">", startIndex) + 1;
  const endIndex = html.toLowerCase().indexOf(end.toLowerCase(), contentStart);
  return endIndex > contentStart ? decode(stripTags(html.slice(contentStart, endIndex))) : "";
}

function matchLabel(html: string, label: RegExp) {
  const compact = stripTags(html).replace(/\s+/g, " ");
  const match = new RegExp(`${label.source}\\s*:?\\s*([^|•\\n]{0,60})`, "i").exec(compact);
  return clean(match?.[1] || "");
}

function parsePlayers(html: string) {
  const compact = stripTags(html).replace(/\s+/g, " ");
  const match = /(\d+)\s*[-–]\s*(\d+)\s*(?:jugadores|players)/i.exec(compact) || /(\d+)\s*(?:jugadores|players)/i.exec(compact);

  return {
    min: match ? Number(match[1]) : null,
    max: match ? Number(match[2] || match[1]) : null
  };
}

function parsePlaytime(html: string) {
  const compact = stripTags(html).replace(/\s+/g, " ");
  const match = /(\d+)\s*[-–]\s*(\d+)\s*(?:min|minutes)/i.exec(compact) || /(\d+)\s*(?:min|minutes)/i.exec(compact);

  return {
    min: match ? Number(match[1]) : null,
    max: match ? Number(match[2] || match[1]) : null
  };
}

function calculateFlags(input: {
  title: string;
  players: { min: number | null; max: number | null };
  playtime: { min: number | null; max: number | null };
  minAge: number | null;
  hasImage: boolean;
}) {
  const flags: EditorialFlag[] = [];

  if (!input.players.min || !input.players.max) {
    flags.push(EditorialFlag.missing_players);
  }

  if (!input.playtime.min || !input.playtime.max) {
    flags.push(EditorialFlag.missing_playtime);
  }

  if (!input.minAge) {
    flags.push(EditorialFlag.missing_age);
  }

  if (!input.title) {
    flags.push(EditorialFlag.low_confidence);
  }

  return flags;
}

function confidenceFor(input: {
  title: string;
  players: { min: number | null; max: number | null };
  playtime: { min: number | null; max: number | null };
  minAge: number | null;
  hasImage: boolean;
}) {
  let confidence = 0.35;
  if (input.title) confidence += 0.25;
  if (input.players.min && input.players.max) confidence += 0.12;
  if (input.playtime.min && input.playtime.max) confidence += 0.12;
  if (input.minAge) confidence += 0.08;
  if (input.hasImage) confidence += 0.08;
  return Math.min(confidence, 0.9);
}

function cleanTitle(value: string) {
  return clean(value.replace(/\s+Juego de mesa.*$/i, "").replace(/\s+-\s+Asmodee.*$/i, ""));
}

function clean(value: string) {
  return decode(value).replace(/\s+/g, " ").trim();
}

function firstNumber(value: string) {
  const match = value.match(/\d+/);
  return match ? Number(match[0]) : null;
}

function absoluteUrl(value: string, sourceUrl: string) {
  if (!value) {
    return "";
  }

  try {
    return new URL(value, sourceUrl).toString();
  } catch {
    return "";
  }
}

function stripTags(value: string) {
  return value.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ");
}

function decode(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}
