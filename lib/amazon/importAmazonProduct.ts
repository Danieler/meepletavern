import { EditorialFlag, GameCandidateStatus, GameStatus, MediaAssetStatus, MediaAssetType, MediaAssetUsage, Prisma, type Source } from "@prisma/client";
import { buildAmazonCanonicalUrl, parseAmazonInput } from "@/lib/amazon/parseAmazonInput";
import { getAmazonProduct } from "@/lib/amazon/amazonPaapiProvider";
import { mapAmazonProductToCandidate, type AmazonNormalizedCandidate } from "@/lib/amazon/mapAmazonProductToCandidate";
import { normalizeCandidateImages, normalizeCandidateMetadata } from "@/lib/editorialMappers";
import { getSourcePolicy } from "@/lib/sourcePolicy";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { sourceRepository } from "@/lib/editorialRepositories";
import { getTaxonomyTermNames } from "@/lib/taxonomy";

export type AmazonImportResult = {
  candidateId: string;
  gameId: string;
  sourceId: string;
  sourceUrl: string;
  asin: string;
  amazonTitleOriginal: string | null;
  cleanTitle: string;
  sourceUrlClean: string;
  title: string;
  detectedPlayers: string | null;
  detectedPlaytime: string | null;
  detectedAge: number | null;
  candidateStatus: GameCandidateStatus;
  imageStatus: "approved_public" | "placeholder";
  flags: EditorialFlag[];
  warnings: string[];
  publicImageUrl: string | null;
};

export async function importAmazonProductReview(input: { sourceId: unknown; amazonInput: unknown }): Promise<AmazonImportResult> {
  const sourceId = readString(input.sourceId, "Selecciona una fuente.");
  const rawAmazonInput = readString(input.amazonInput, "Escribe un ASIN o una URL de Amazon.");
  const parsedInput = parseAmazonInput(rawAmazonInput);

  if (parsedInput.inputType === "invalid" || !parsedInput.asin) {
    throw new Error("Introduce un ASIN válido o una URL de Amazon válida.");
  }
  const sourceUrlClean = buildAmazonCanonicalUrl(parsedInput.asin);

  const source = await sourceRepository.getById(sourceId);
  if (!source) {
    throw new Error("No existe esa fuente.");
  }

  if (!isAmazonSource(source)) {
    throw new Error("Selecciona una fuente de Amazon aprobada.");
  }

  const sourcePolicy = getSourcePolicy(source);
  const product = await getAmazonProduct({
    asin: parsedInput.asin,
    sourceUrl: sourceUrlClean
  });
  const mapped = mapAmazonProductToCandidate({
    product,
    source: {
      status: source.status,
      permissions: source.permissions
    },
    sourceUrl: sourceUrlClean
  });

  const candidate = normalizeAmazonCandidate(mapped, sourcePolicy);
  const publicImageAllowed = Boolean(product.imageUrl) && sourcePolicy.canUseImagePublicly;
  const gameSlug = await ensureUniqueSlug(slugify(candidate.title));
  const metadata = candidate.metadata;
  const minPlayers = numberFromMetadata(metadata, "minPlayers");
  const maxPlayers = numberFromMetadata(metadata, "maxPlayers");
  const minPlayTime = numberFromMetadata(metadata, "minPlayTime");
  const maxPlayTime = numberFromMetadata(metadata, "maxPlayTime");
  const minAge = numberFromMetadata(metadata, "minAge");
  const playtime = formatPlaytime(minPlayTime, maxPlayTime);
  const taxonomy = await resolveAmazonTaxonomy(metadata);

  const result = await prisma.$transaction(async (transaction) => {
    const createdCandidate = await transaction.gameCandidate.create({
      data: {
        sourceId: source.id,
        sourceUrl: candidate.sourceUrl,
        title: candidate.title,
        originalTitle: candidate.originalTitle,
        metadata: candidate.metadata as Prisma.InputJsonValue,
        extractedDescription: candidate.extractedDescription,
        candidateImages: candidate.candidateImages as Prisma.InputJsonValue,
        aiDraft: Prisma.JsonNull,
        aiGenerated: false,
        aiReviewed: false,
        confidence: candidate.confidence,
        status: candidate.flags.length ? GameCandidateStatus.needs_review : GameCandidateStatus.pending,
        flags: candidate.flags
      }
    });

    const createdGame = await transaction.game.create({
      data: {
        name: candidate.title,
        title: candidate.title,
        slug: gameSlug,
        status: GameStatus.review,
        originalTitle: null,
        year: null,
        players: {
          min: minPlayers,
          max: maxPlayers,
          label: minPlayers && maxPlayers ? `${minPlayers}-${maxPlayers}` : null
        } as Prisma.InputJsonValue,
        minPlayers,
        maxPlayers,
        playtime,
        minAge,
        age: minAge ? `${minAge}+` : null,
        difficulty: null,
        complexity: null,
        categories: taxonomy.categories,
        mechanics: taxonomy.mechanics,
        themes: taxonomy.themes,
        publisher: stringFromMetadata(metadata, "manufacturer") || stringFromMetadata(metadata, "brand") || null,
        spanishPublisher: null,
        shortDescription: `${candidate.title} en MeepleTavern.`,
        description: `${candidate.title} se ha importado desde una fuente comercial aprobada y puede revisarse en el editor antes de publicarse.`,
        quickVerdict: "Pendiente de revisión editorial.",
        bestFor: null,
        notFor: null,
        pros: [],
        cons: [],
        faq: [] as Prisma.InputJsonValue,
        faqs: [] as Prisma.InputJsonValue,
        seoTitle: `${candidate.title} | MeepleTavern`,
        seoDescription: `${candidate.title} en MeepleTavern con datos básicos importados para su revisión editorial.`,
        buyUrl: candidate.sourceUrl,
        sources: [
          {
            label: source.name,
            url: candidate.sourceUrl
          }
        ] as Prisma.InputJsonValue,
        sourceIds: [source.id],
        imageFallbackAccepted: !(publicImageAllowed && product.imageUrl),
        imageStatus: publicImageAllowed && product.imageUrl ? "verified" : "placeholder",
        coverImageUrl: publicImageAllowed && product.imageUrl ? product.imageUrl : null,
        imageUrl: publicImageAllowed && product.imageUrl ? product.imageUrl : null,
        coverImageAlt: `Portada de ${candidate.title}`,
        imageSourceName: publicImageAllowed && product.imageUrl ? source.name : null,
        imageSourceUrl: publicImageAllowed && product.imageUrl ? source.baseUrl : null,
        imageLicenseNote: publicImageAllowed && product.imageUrl ? source.attributionText || null : null,
        primaryImageId: null,
        createdByAi: false,
        publishedAt: null
      }
    });

    const publicMediaAsset = publicImageAllowed && product.imageUrl
      ? await transaction.mediaAsset.create({
          data: {
            gameId: createdGame.id,
            candidateId: createdCandidate.id,
            sourceId: source.id,
            url: product.imageUrl,
            type: MediaAssetType.cover,
            status: MediaAssetStatus.approved,
            usage: MediaAssetUsage.public,
            attribution: source.attributionText || `Amazon PA API ${source.name}`
          }
        })
      : null;

    if (publicMediaAsset) {
      await transaction.game.update({
        where: { id: createdGame.id },
        data: {
          primaryImageId: publicMediaAsset.id,
          imageFallbackAccepted: false,
          imageStatus: "verified",
          coverImageUrl: publicMediaAsset.url,
          imageUrl: publicMediaAsset.url,
          imageSourceName: source.name,
          imageSourceUrl: source.baseUrl,
          imageLicenseNote: source.attributionText || null
        }
      });
    }

    return { candidate: createdCandidate, game: createdGame, publicMediaAsset };
  });

  return {
    candidateId: result.candidate.id,
    gameId: result.game.id,
    sourceId: source.id,
    sourceUrl: candidate.sourceUrl,
    asin: parsedInput.asin,
    amazonTitleOriginal: stringFromMetadata(metadata, "amazonTitleOriginal"),
    cleanTitle: candidate.title,
    sourceUrlClean,
    title: candidate.title,
    detectedPlayers: minPlayers && maxPlayers ? `${minPlayers}-${maxPlayers}` : null,
    detectedPlaytime: playtime,
    detectedAge: minAge,
    candidateStatus: candidate.flags.length ? GameCandidateStatus.needs_review : GameCandidateStatus.pending,
    imageStatus: result.publicMediaAsset ? "approved_public" : "placeholder",
    flags: candidate.flags,
    warnings: stringListFromMetadata(metadata, "importWarnings"),
    publicImageUrl: result.publicMediaAsset ? result.publicMediaAsset.url : null
  };
}

async function resolveAmazonTaxonomy(metadata: Record<string, unknown>) {
  const [existingCategories, existingMechanics, existingThemes] = await Promise.all([
    getTaxonomyTermNames("category"),
    getTaxonomyTermNames("mechanic"),
    getTaxonomyTermNames("theme")
  ]);

  return {
    categories: filterExistingTerms(stringListFromMetadata(metadata, "categoryHints"), existingCategories),
    mechanics: filterExistingTerms(stringListFromMetadata(metadata, "mechanicHints"), existingMechanics),
    themes: filterExistingTerms(stringListFromMetadata(metadata, "themeHints"), existingThemes)
  };
}

function filterExistingTerms(hints: string[], existingTerms: string[]) {
  const existingByLower = new Map(existingTerms.map((term) => [term.toLowerCase(), term]));
  const existingBySlug = new Map(existingTerms.map((term) => [slugify(term), term]));
  return hints
    .map((hint) => existingByLower.get(hint.toLowerCase()) || existingBySlug.get(slugify(hint)) || null)
    .filter((term): term is string => Boolean(term));
}

function numberFromMetadata(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function stringFromMetadata(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function stringListFromMetadata(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim())
    : [];
}

function formatPlaytime(min: number | null, max: number | null) {
  if (min && max && min !== max) {
    return `${min}-${max} min`;
  }

  if (min || max) {
    return `${min || max} min`;
  }

  return null;
}

function normalizeAmazonCandidate(input: AmazonNormalizedCandidate, sourcePolicy: ReturnType<typeof getSourcePolicy>) {
  const metadata = sourcePolicy.canUseMetadata
    ? normalizeCandidateMetadata({
        ...input.metadata,
        ...(sourcePolicy.canUsePrices ? {} : { price: null, currency: null })
      })
    : normalizeCandidateMetadata({});

  return {
    ...input,
    metadata,
    candidateImages: normalizeCandidateImages(input.candidateImages)
  };
}

function readString(value: unknown, message: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(message);
  }

  return value.trim();
}

function isAmazonSource(source: Pick<Source, "type" | "name">) {
  return source.type === "affiliate_api" || source.name.toLowerCase().includes("amazon");
}

async function ensureUniqueSlug(baseSlug: string) {
  const cleanBase = baseSlug || "juego";
  let slug = cleanBase;
  let counter = 2;

  while (await prisma.game.findUnique({ where: { slug } })) {
    slug = `${cleanBase}-${counter}`;
    counter += 1;
  }

  return slug;
}
