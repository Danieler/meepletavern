import { EditorialFlag } from "@prisma/client";
import { buildAmazonCanonicalUrl } from "@/lib/amazon/parseAmazonInput";
import { normalizeCandidateImages, normalizeCandidateMetadata } from "@/lib/editorialMappers";
import {
  sanitizeAmazonImportedText,
  sanitizeImportedFacts,
  sanitizeImportedList,
  sanitizeImportedTitle
} from "@/lib/importedTextSanitizer";
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

type DetectedTableData = {
  minPlayers: number | null;
  maxPlayers: number | null;
  minPlayTime: number | null;
  maxPlayTime: number | null;
  minAge: number | null;
};

const GARBAGE_TEXT_PATTERN =
  /(pago|seguridad|env[ií]o|devoluci[oó]n|garant[ií]a|compra|stock|producto|amazon|encripta|transacci[oó]n|tarjeta|cliente|vendedor)/i;

export function mapAmazonProductToCandidate(input: {
  product: AmazonProduct;
  source: Pick<Source, "status" | "permissions">;
  sourceUrl: string;
}): AmazonNormalizedCandidate {
  const policy = getSourcePolicy(input.source);
  const hasImage = Boolean(input.product.imageUrl);
  const sourceUrlClean = buildAmazonCanonicalUrl(input.product.asin);
  const cleanTitle = cleanAmazonTitle(input.product.title, input.product.asin);
  const cleanProduct = sanitizeAmazonProduct(input.product);
  const detected = detectTableData(cleanProduct);
  const categoryHints = inferCategoryHints(cleanProduct);
  const mechanicHints = inferMechanicHints(cleanProduct);
  const themeHints = inferThemeHints(cleanProduct);
  const importWarnings = [
    ...(cleanProduct.discardedTextCount > 0 ? ["Se descartó texto no relacionado con el juego detectado en Amazon."] : []),
    ...(!themeHints.length ? ["Temáticas no detectadas. Puedes autocompletarlas o dejarlas vacías."] : [])
  ];
  const metadata = normalizeCandidateMetadata({
    asin: input.product.asin,
    importedFrom: "amazon",
    sourceUrlClean,
    amazonTitleOriginal: input.product.title,
    cleanTitle,
    amazonRating: input.product.rating ?? null,
    amazonReviewCount: input.product.reviewCount ?? null,
    brand: cleanNoisyMetadataValue(input.product.brand) || null,
    manufacturer: cleanNoisyMetadataValue(input.product.manufacturer) || null,
    price: input.product.price ?? null,
    currency: input.product.currency || null,
    availability: cleanNoisyMetadataValue(input.product.availability) || null,
    features: cleanProduct.features || [],
    facts: cleanProduct.facts || {},
    importWarnings,
    discardedAmazonTextCount: cleanProduct.discardedTextCount,
    minPlayers: detected.minPlayers,
    maxPlayers: detected.maxPlayers,
    minPlayTime: detected.minPlayTime,
    maxPlayTime: detected.maxPlayTime,
    minAge: detected.minAge,
    players: {
      min: detected.minPlayers,
      max: detected.maxPlayers,
      label:
        detected.minPlayers && detected.maxPlayers
          ? `${detected.minPlayers}-${detected.maxPlayers}`
          : null
    },
    categoryHints,
    mechanicHints,
    themeHints
  });
  const candidateImages = normalizeCandidateImages(
    hasImage
      ? [
          {
            url: input.product.imageUrl,
            type: "cover",
            sourceUrl: sourceUrlClean
          }
        ]
      : []
  );
  const flags = mergeFlags([
    ...(detected.minPlayers && detected.maxPlayers ? [] : [EditorialFlag.missing_players]),
    ...(detected.minPlayTime && detected.maxPlayTime ? [] : [EditorialFlag.missing_playtime]),
    ...(detected.minAge ? [] : [EditorialFlag.missing_age]),
    ...(hasImage && !policy.canUseImagePublicly ? [EditorialFlag.image_not_allowed] : []),
    ...(input.source.status !== "approved" ? [EditorialFlag.needs_permission] : [])
  ]);
  const confidence = confidenceFor(input.product, hasImage, detected);

  return {
    sourceUrl: sourceUrlClean,
    title: cleanTitle,
    originalTitle: input.product.title === cleanTitle ? null : input.product.title,
    metadata,
    extractedDescription: null,
    candidateImages,
    confidence,
    flags: confidence < 0.5 ? mergeFlags([...flags, EditorialFlag.low_confidence]) : flags
  };
}

function cleanAmazonTitle(title: string, asin: string) {
  let cleaned = sanitizeImportedTitle(title)
    .trim()
    .replace(/\s*:\s*Amazon\.es:.*$/i, "")
    .replace(/\s*Amazon\.es\s*:\s*Juguetes.*$/i, "");

  const separatorParts = cleaned.split(/\s+-\s+|,/).map((part) => part.trim()).filter(Boolean);
  if (separatorParts.length > 1) {
    const tail = separatorParts.slice(1).join(" ");
    if (looksLikeCommercialTail(tail)) {
      cleaned = separatorParts[0];
    }
  }

  cleaned = cleaned
    .replace(/\b(juego de mesa|board game)\b/gi, " ")
    .replace(/\b(para adultos|juego cooperativo|cooperativo|jugadores?|minutos?|a partir de)\b.*$/i, " ")
    .replace(/\s+/g, " ")
    .trim();

  cleaned = normalizeZombicideTitle(cleaned);
  return cleaned || `Producto Amazon ${asin}`;
}

function looksLikeCommercialTail(value: string) {
  return /(juego de mesa|board game|cooperativo|jugadores?|minutos?|tiempo de juego|a partir de|hecho por|amazon\.es|juguetes y juegos|promedio|para adultos)/i.test(
    value
  );
}

function normalizeZombicideTitle(value: string) {
  const cmonZombicide = /^CMON\s+Zombicide\s+(.+)$/i.exec(value);
  if (cmonZombicide?.[1]) {
    return `Zombicide: ${cmonZombicide[1].trim()}`;
  }

  const bareZombicide = /^Zombicide\s+(?!:)(.+)$/i.exec(value);
  if (bareZombicide?.[1]) {
    return `Zombicide: ${bareZombicide[1].trim()}`;
  }

  return value;
}

function detectTableData(product: AmazonProduct): DetectedTableData {
  const facts = product.facts || {};
  const searchableText = [
    product.title,
    ...Object.entries(facts).flatMap(([key, value]) => [`${key} ${value}`, value]),
    ...(product.features || [])
  ].join(" ");

  const players = parsePlayers(searchableText);
  const playtime = parsePlaytime(searchableText);
  const minAge = parseAge(searchableText);

  return {
    minPlayers: players.min,
    maxPlayers: players.max,
    minPlayTime: playtime.min,
    maxPlayTime: playtime.max,
    minAge
  };
}

function parsePlayers(value: string) {
  const compact = normalizeText(value);
  const labelledRange = /(?:n[uú]mero de jugadores|jugadores?|players?)\s*(\d{1,2})\s*(?:-|–|a)\s*(\d{1,2})/i.exec(compact);
  if (labelledRange) {
    return { min: Number(labelledRange[1]), max: Number(labelledRange[2]) };
  }

  const range = /(\d{1,2})\s*(?:-|–|a)\s*(\d{1,2})\s*(?:jugadores?|players?)/i.exec(compact);
  if (range) {
    return { min: Number(range[1]), max: Number(range[2]) };
  }

  const single = /(\d{1,2})\s*(?:jugadores?|players?)/i.exec(compact);
  if (single) {
    const count = Number(single[1]);
    return { min: count, max: count };
  }

  return { min: null, max: null };
}

function parsePlaytime(value: string) {
  const compact = normalizeText(value);
  const labelledRange = /(?:tiempo de juego estimado|tiempo de juego|duraci[oó]n|playtime)\s*(\d{1,3})\s*(?:-|–|a)\s*(\d{1,3})/i.exec(
    compact
  );
  if (labelledRange) {
    return { min: Number(labelledRange[1]), max: Number(labelledRange[2]) };
  }

  const labelledSingle = /(?:tiempo de juego estimado|tiempo de juego|duraci[oó]n|playtime)\s*(\d{1,3})/i.exec(compact);
  if (labelledSingle) {
    const minutes = Number(labelledSingle[1]);
    return { min: minutes, max: minutes };
  }

  const range = /(\d{1,3})\s*(?:-|–|a)\s*(\d{1,3})\s*(?:minutos?|mins?|minutes?)/i.exec(compact);
  if (range) {
    return { min: Number(range[1]), max: Number(range[2]) };
  }

  const single = /(\d{1,3})\s*(?:minutos?|mins?|minutes?)/i.exec(compact);
  if (single) {
    const minutes = Number(single[1]);
    return { min: minutes, max: minutes };
  }

  return { min: null, max: null };
}

function parseAge(value: string) {
  const compact = normalizeText(value);
  const explicitYears = /(?:a partir de|edad m[ií]nima recomendada|edad|age)\s*(\d{1,3})\s*(?:a[nñ]os?|years?)/i.exec(compact);
  if (explicitYears) {
    return normalizeAge(Number(explicitYears[1]));
  }

  const standaloneYears = /(\d{1,2})\s*(?:a[nñ]os?|years?)/i.exec(compact);
  if (standaloneYears) {
    return normalizeAge(Number(standaloneYears[1]));
  }

  const months = /(\d{2,3})\s*(?:meses|months?)/i.exec(compact);
  if (months) {
    return normalizeAge(Number(months[1]));
  }

  const recommendedNumber = /(?:edad m[ií]nima recomendada|unit of measure of age|unidad de medida de la edad)\s*(\d{2,3})/i.exec(
    compact
  );
  if (recommendedNumber) {
    return normalizeAge(Number(recommendedNumber[1]));
  }

  return null;
}

function normalizeAge(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  return value > 30 ? Math.ceil(value / 12) : value;
}

function inferCategoryHints(product: AmazonProduct) {
  const text = searchableCleanText(product);
  const hints = new Set<string>();

  if (/(hombres lobo|castronegro|werewolf|aldeanos|roles ocultos|noche|votaci[oó]n)/i.test(text)) {
    hints.add("Fiesta");
    hints.add("Roles ocultos");
    hints.add("Deducción");
  }
  if (/(escape room|unlock|exit)/i.test(text)) {
    hints.add("Escape room");
    hints.add("Puzzle");
    hints.add("Cooperativo");
  }
  if (/\bzombie|zombicide|zombies\b/i.test(text)) {
    hints.add("Zombis");
    hints.add("Supervivencia");
    hints.add("Cooperativo");
  }
  if (/(harry potter|hogwarts|magia)/i.test(text)) {
    hints.add("Fantasía");
    hints.add("Magia");
  }
  if (/(marvel|superh[eé]roes?)/i.test(text)) {
    hints.add("Superhéroes");
    hints.add("Cómics");
  }
  if (/campa[nñ]a/i.test(text)) {
    hints.add("Campaña");
  }
  if (/miniaturas?/i.test(text)) {
    hints.add("Con miniaturas");
  }

  return sanitizeImportedList([...hints], "categories");
}

function inferMechanicHints(product: AmazonProduct) {
  const text = searchableCleanText(product);
  const hints = new Set<string>();

  if (/cooperativ/i.test(text)) {
    hints.add("Cooperativo");
  }
  if (/campa[nñ]a/i.test(text)) {
    hints.add("Campaña");
  }

  return sanitizeImportedList([...hints], "mechanics");
}

function inferThemeHints(product: AmazonProduct) {
  const text = searchableCleanText(product);
  const hints = new Set<string>();

  if (/(hombres lobo|castronegro|werewolf|aldeanos|roles ocultos|noche|votaci[oó]n)/i.test(text)) {
    hints.add("Fiesta");
    hints.add("Roles ocultos");
    hints.add("Deducción");
  }
  if (/(escape room|unlock|exit)/i.test(text)) {
    hints.add("Escape room");
    hints.add("Puzzle");
    hints.add("Cooperativo");
  }
  if (/\bzombie|zombicide|zombies\b/i.test(text)) {
    hints.add("Zombis");
    hints.add("Supervivencia");
    hints.add("Cooperativo");
  }
  if (/(harry potter|hogwarts|magia)/i.test(text)) {
    hints.add("Fantasía");
    hints.add("Magia");
  }
  if (/(marvel|superh[eé]roes?)/i.test(text)) {
    hints.add("Superhéroes");
    hints.add("Cómics");
  }

  return sanitizeImportedList([...hints], "themes");
}

function searchableCleanText(product: AmazonProduct) {
  const facts = product.facts || {};
  return [product.title, ...Object.values(facts), ...(product.features || [])]
    .filter((value) => value && !GARBAGE_TEXT_PATTERN.test(value))
    .join(" ");
}

function cleanNoisyMetadataValue(value: string | undefined) {
  if (!value) {
    return "";
  }

  const compact = normalizeText(value);
  if (GARBAGE_TEXT_PATTERN.test(compact) || compact.split(/\s+/).length > 6) {
    return "";
  }

  return compact;
}

function sanitizeAmazonProduct(product: AmazonProduct): AmazonProduct & { discardedTextCount: number } {
  const factsResult = sanitizeImportedFacts(product.facts || {});
  const cleanFeatures = (product.features || [])
    .map((feature) => sanitizeAmazonImportedText(feature))
    .filter((feature): feature is string => Boolean(feature));
  const discardedFeatures = (product.features || []).length - cleanFeatures.length;

  return {
    ...product,
    features: cleanFeatures,
    facts: factsResult.facts,
    discardedTextCount: factsResult.discardedCount + discardedFeatures
  };
}

function confidenceFor(product: AmazonProduct, hasImage: boolean, detected: DetectedTableData) {
  let confidence = 0.45;
  if (product.title.trim()) confidence += 0.18;
  if (product.brand || product.manufacturer) confidence += 0.08;
  if (detected.minPlayers && detected.maxPlayers) confidence += 0.08;
  if (detected.minPlayTime && detected.maxPlayTime) confidence += 0.06;
  if (detected.minAge) confidence += 0.05;
  if (product.price !== undefined) confidence += 0.03;
  if (hasImage) confidence += 0.07;
  return Math.min(confidence, 0.9);
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function mergeFlags(flags: EditorialFlag[]) {
  return [...new Set(flags)];
}
