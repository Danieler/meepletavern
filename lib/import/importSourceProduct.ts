import { EditorialFlag, type Source } from "@prisma/client";
import { importAmazonProductReview } from "@/lib/amazon/importAmazonProduct";
import { sourceRepository } from "@/lib/editorialRepositories";
import { persistImportedGameReview, type ImportedGameResult, type NormalizedImportedCandidate } from "@/lib/import/importedGame";
import { fetchSourcePageProduct, type SourcePageProduct } from "@/lib/import/sourceProductPage";
import {
  sanitizeImportedFacts,
  sanitizeImportedList,
  sanitizeImportedText,
  sanitizeImportedTitle
} from "@/lib/importedTextSanitizer";

type DetectedSourceData = {
  minPlayers: number | null;
  maxPlayers: number | null;
  minPlayTime: number | null;
  maxPlayTime: number | null;
  minAge: number | null;
};

const COMMERCIAL_GARBAGE_PATTERN =
  /(compra|carrito|precio|oferta|stock|disponibilidad|cup[oó]n|iva|vendedor|entrega|garant[ií]a|devoluci[oó]n|checkout|pago)/i;

export async function importSourceProductReview(input: {
  sourceId: unknown;
  sourceInput: unknown;
}): Promise<ImportedGameResult> {
  const sourceId = readString(input.sourceId, "Selecciona una fuente.");
  const sourceInput = readString(input.sourceInput, "Escribe la URL del juego.");
  const source = await sourceRepository.getById(sourceId);

  if (!source) {
    throw new Error("No existe esa fuente.");
  }

  if (isAmazonSource(source)) {
    return importAmazonProductReview({
      sourceId,
      amazonInput: sourceInput
    });
  }

  const sourceUrl = normalizeUrl(sourceInput);
  assertSourceMatchesUrl(source, sourceUrl);

  const product = await fetchSourcePageProduct(sourceUrl);
  const candidate = mapSourcePageToCandidate(product);

  return persistImportedGameReview({
    source,
    candidate,
    publicImageUrl: product.imageUrl
  });
}

function mapSourcePageToCandidate(product: SourcePageProduct): NormalizedImportedCandidate {
  const cleanTitle = sanitizeImportedTitle(product.title).trim() || "Juego importado";
  const description = cleanDescription(product.description);
  const factsResult = sanitizeImportedFacts(product.facts || {});
  const features = (product.features || [])
    .map((feature) => sanitizeImportedText(feature))
    .filter((feature): feature is string => Boolean(feature));
  const discardedFeatures = (product.features || []).length - features.length;
  const detected = detectSourceData(product, description);
  const categoryHints = inferCategoryHints(product, description);
  const mechanicHints = inferMechanicHints(product, description);
  const themeHints = inferThemeHints(product, description);
  const importWarnings = [
    ...(factsResult.discardedCount + discardedFeatures > 0 ? ["Se descartó texto comercial o irrelevante durante la importación."] : []),
    ...(!themeHints.length ? ["Temáticas no detectadas. Puedes autocompletarlas o dejarlas vacías."] : [])
  ];
  const metadata = {
    importedFrom: product.platform,
    sourceUrlClean: product.sourceUrlClean,
    sourceTitleOriginal: product.title,
    cleanTitle,
    brand: cleanNoisyMetadataValue(product.brand),
    manufacturer: cleanNoisyMetadataValue(product.publisher),
    publisher: cleanNoisyMetadataValue(product.publisher || product.brand),
    price: product.price ?? null,
    currency: product.currency || null,
    availability: cleanNoisyMetadataValue(product.availability),
    features,
    facts: factsResult.facts,
    importWarnings,
    discardedImportedTextCount: factsResult.discardedCount + discardedFeatures,
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
  };
  const candidateImages = product.imageUrl
    ? [
        {
          url: product.imageUrl,
          type: "cover" as const,
          sourceUrl: product.sourceUrlClean
        }
      ]
    : [];
  const flags = mergeFlags([
    ...(detected.minPlayers && detected.maxPlayers ? [] : [EditorialFlag.missing_players]),
    ...(detected.minPlayTime && detected.maxPlayTime ? [] : [EditorialFlag.missing_playtime]),
    ...(detected.minAge ? [] : [EditorialFlag.missing_age])
  ]);
  const confidence = confidenceForProduct(product, description, detected);

  return {
    sourceUrl: product.sourceUrlClean,
    title: cleanTitle,
    originalTitle: cleanTitle === product.title ? null : product.title,
    metadata,
    extractedDescription: description,
    candidateImages,
    confidence,
    flags: confidence < 0.5 ? mergeFlags([...flags, EditorialFlag.low_confidence]) : flags
  };
}

function detectSourceData(product: SourcePageProduct, description: string | null): DetectedSourceData {
  const searchableText = [
    product.title,
    description || "",
    ...Object.entries(product.facts).flatMap(([key, value]) => [`${key} ${value}`, value]),
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

function inferCategoryHints(product: SourcePageProduct, description: string | null) {
  const text = searchableCleanText(product, description);
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

function inferMechanicHints(product: SourcePageProduct, description: string | null) {
  const text = searchableCleanText(product, description);
  const hints = new Set<string>();

  if (/cooperativ/i.test(text)) {
    hints.add("Cooperativo");
  }
  if (/campa[nñ]a/i.test(text)) {
    hints.add("Campaña");
  }

  return sanitizeImportedList([...hints], "mechanics");
}

function inferThemeHints(product: SourcePageProduct, description: string | null) {
  const text = searchableCleanText(product, description);
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

function searchableCleanText(product: SourcePageProduct, description: string | null) {
  return [
    product.title,
    description || "",
    ...Object.values(product.facts || {}),
    ...(product.features || [])
  ]
    .filter((value) => value && !COMMERCIAL_GARBAGE_PATTERN.test(value))
    .join(" ");
}

function confidenceForProduct(product: SourcePageProduct, description: string | null, detected: DetectedSourceData) {
  let confidence = 0.42;
  if (product.title.trim()) confidence += 0.18;
  if (description) confidence += 0.14;
  if (product.brand || product.publisher) confidence += 0.08;
  if (detected.minPlayers && detected.maxPlayers) confidence += 0.08;
  if (detected.minPlayTime && detected.maxPlayTime) confidence += 0.06;
  if (detected.minAge) confidence += 0.05;
  if (typeof product.price === "number") confidence += 0.03;
  if (product.imageUrl) confidence += 0.07;
  return Math.min(confidence, 0.92);
}

function cleanDescription(value: string | null) {
  if (!value) {
    return null;
  }

  const compact = value.replace(/\s+/g, " ").trim();
  return compact || null;
}

function cleanNoisyMetadataValue(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const compact = value.replace(/\s+/g, " ").trim();
  if (!compact || COMMERCIAL_GARBAGE_PATTERN.test(compact) || compact.split(/\s+/).length > 10) {
    return null;
  }

  return compact;
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
  const labelledRange = /(?:tiempo de juego estimado|tiempo de juego|duraci[oó]n|playtime)\s*(\d{1,3})\s*(?:-|–|a)\s*(\d{1,3})/i.exec(compact);
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

  return null;
}

function normalizeAge(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  return value > 30 ? Math.ceil(value / 12) : value;
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function isAmazonSource(source: Pick<Source, "baseUrl" | "name">) {
  return `${source.name} ${source.baseUrl}`.toLowerCase().includes("amazon.");
}

function assertSourceMatchesUrl(source: Pick<Source, "baseUrl" | "name">, sourceUrl: string) {
  let sourceHost = "";
  let pageHost = "";

  try {
    sourceHost = new URL(source.baseUrl).hostname.replace(/^www\./i, "").toLowerCase();
    pageHost = new URL(sourceUrl).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    throw new Error("La URL del juego no es válida.");
  }

  if (sourceHost !== pageHost && !pageHost.endsWith(`.${sourceHost}`) && !sourceHost.endsWith(`.${pageHost}`)) {
    throw new Error(`La URL no pertenece a la fuente ${source.name}.`);
  }
}

function normalizeUrl(value: string) {
  try {
    return new URL(value).toString();
  } catch {
    throw new Error("La URL del juego no es válida.");
  }
}

function readString(value: unknown, message: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(message);
  }

  return value.trim();
}

function mergeFlags(flags: EditorialFlag[]) {
  return [...new Set(flags)];
}
