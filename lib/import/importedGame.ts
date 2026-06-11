import {
  GameCandidateStatus,
  GameStatus,
  MediaAssetStatus,
  MediaAssetType,
  MediaAssetUsage,
  Prisma,
  type EditorialFlag,
  type Source
} from "@prisma/client";
import { completeGameEditorialFieldsWithBedrock, EditorialCompletionError } from "@/lib/ai/completeGameEditorialFieldsWithBedrock";
import { BggApiError, getBggGameDetails, searchBggGames } from "@/lib/bgg";
import { buildBggGameUpdateInput } from "@/lib/bggEnrichment";
import { buildEditorialSeedCopy } from "@/lib/editorialSeedCopy";
import { normalizeCandidateImages, normalizeCandidateMetadata } from "@/lib/editorialMappers";
import { gameCandidateRepository, gameRepository } from "@/lib/editorialRepositories";
import { buildSafeEditorialPatch } from "@/lib/games/buildSafeEditorialPatch";
import { sanitizeEditorialFields } from "@/lib/import/sanitizeEditorialFields";
import { prisma } from "@/lib/prisma";
import { buildExternalRatingUpdate } from "@/lib/ratings/gameRatings";
import { slugify } from "@/lib/slug";
import { getTaxonomyTermNames } from "@/lib/taxonomy";
import { validateBeforePublish } from "@/lib/validateBeforePublish";

export type NormalizedImportedCandidate = {
  sourceUrl: string;
  title: string;
  originalTitle: string | null;
  metadata: Record<string, unknown>;
  extractedDescription: string | null;
  candidateImages: Array<{
    url: string;
    type?: "cover" | "box" | "component" | "placeholder";
    sourceUrl?: string;
    width?: number;
    height?: number;
  }>;
  confidence: number;
  flags: EditorialFlag[];
};

export type ImportedGameResult = {
  candidateId: string;
  gameId: string;
  sourceId: string;
  sourceName: string;
  sourceUrl: string;
  sourceUrlClean: string;
  originalTitle: string | null;
  cleanTitle: string;
  title: string;
  detectedPlayers: string | null;
  detectedPlaytime: string | null;
  detectedAge: number | null;
  detectedPublisher: string | null;
  detectedPrice: string | null;
  candidateStatus: GameCandidateStatus;
  imageStatus: "approved_public" | "placeholder";
  flags: EditorialFlag[];
  warnings: string[];
  publicImageUrl: string | null;
  aiStatus?: "applied" | "no_changes" | "unavailable" | "failed";
  aiAppliedFields?: string[];
  aiWarnings?: string[];
  aiSuggestedTitle?: string | null;
};

export async function persistImportedGameReview(input: {
  source: Pick<Source, "id" | "name" | "baseUrl">;
  candidate: NormalizedImportedCandidate;
  publicImageUrl: string | null;
}): Promise<ImportedGameResult> {
  const candidate = normalizeImportedCandidate(input.candidate);
  const metadata = candidate.metadata;
  const gameSlug = await ensureUniqueSlug(slugify(candidate.title));
  const minPlayers = numberFromMetadata(metadata, "minPlayers");
  const maxPlayers = numberFromMetadata(metadata, "maxPlayers");
  const minPlayTime = numberFromMetadata(metadata, "minPlayTime");
  const maxPlayTime = numberFromMetadata(metadata, "maxPlayTime");
  const minAge = numberFromMetadata(metadata, "minAge");
  const playtime = formatPlaytime(minPlayTime, maxPlayTime);
  const publisher = firstString(metadata, ["publisher", "manufacturer", "brand"]);
  const taxonomy = await resolveImportedTaxonomy(metadata);
  const seedCopy = buildEditorialSeedCopy({
    title: candidate.title,
    originalTitle: candidate.originalTitle,
    publisher,
    playersLabel: minPlayers && maxPlayers ? `${minPlayers}-${maxPlayers}` : null,
    playtime,
    minAge,
    categories: taxonomy.categories,
    mechanics: taxonomy.mechanics,
    themes: taxonomy.themes,
    features: stringListFromMetadata(metadata, "features")
  });
  const candidateStatus = GameCandidateStatus.converted;

  const result = await prisma.$transaction(async (transaction) => {
    const createdCandidate = await transaction.gameCandidate.create({
      data: {
        sourceId: input.source.id,
        sourceUrl: candidate.sourceUrl,
        title: candidate.title,
        originalTitle: candidate.originalTitle,
        metadata: candidate.metadata as Prisma.InputJsonValue,
        extractedDescription: candidate.extractedDescription,
        candidateImages: candidate.candidateImages as Prisma.InputJsonValue,
        confidence: candidate.confidence,
        status: candidateStatus,
        flags: candidate.flags
      }
    });

    const createdGame = await transaction.game.create({
      data: {
        name: candidate.title,
        title: candidate.title,
        slug: gameSlug,
        status: GameStatus.review,
        originalTitle: candidate.originalTitle,
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
        publisher,
        spanishPublisher: null,
        shortDescription: seedCopy.shortDescription,
        description: seedCopy.description,
        quickVerdict: seedCopy.quickVerdict,
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
            label: input.source.name,
            url: candidate.sourceUrl,
            price: numberFromMetadata(metadata, "price"),
            currency: firstString(metadata, ["currency"]),
            priceLabel: priceLabelFromMetadata(metadata)
          }
        ] as Prisma.InputJsonValue,
        sourceIds: [input.source.id],
        imageFallbackAccepted: !input.publicImageUrl,
        imageStatus: input.publicImageUrl ? "verified" : "placeholder",
        coverImageUrl: input.publicImageUrl,
        imageUrl: input.publicImageUrl,
        coverImageAlt: `Portada de ${candidate.title}`,
        imageSourceName: input.publicImageUrl ? input.source.name : null,
        imageSourceUrl: input.publicImageUrl ? input.source.baseUrl : null,
        imageLicenseNote: null,
        primaryImageId: null,
        createdByAi: false,
        publishedAt: null
      }
    });

    await transaction.gameCandidate.update({
      where: { id: createdCandidate.id },
      data: {
        status: candidateStatus,
        gameId: createdGame.id
      }
    });

    const publicMediaAsset = input.publicImageUrl
      ? await transaction.mediaAsset.create({
          data: {
            gameId: createdGame.id,
            candidateId: createdCandidate.id,
            sourceId: input.source.id,
            url: input.publicImageUrl,
            type: MediaAssetType.cover,
            status: MediaAssetStatus.approved,
            usage: MediaAssetUsage.public,
            attribution: null
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
          imageSourceName: input.source.name,
          imageSourceUrl: input.source.baseUrl,
          imageLicenseNote: null
        }
      });
    }

    return { candidate: createdCandidate, game: createdGame, publicMediaAsset };
  });

  return {
    candidateId: result.candidate.id,
    gameId: result.game.id,
    sourceId: input.source.id,
    sourceName: input.source.name,
    sourceUrl: candidate.sourceUrl,
    sourceUrlClean: firstString(metadata, ["sourceUrlClean"]) || candidate.sourceUrl,
    originalTitle: firstString(metadata, ["sourceTitleOriginal", "amazonTitleOriginal"]) || candidate.originalTitle,
    cleanTitle: candidate.title,
    title: candidate.title,
    detectedPlayers: minPlayers && maxPlayers ? `${minPlayers}-${maxPlayers}` : null,
    detectedPlaytime: playtime,
    detectedAge: minAge,
    detectedPublisher: publisher,
    detectedPrice: priceLabelFromMetadata(metadata),
    candidateStatus,
    imageStatus: result.publicMediaAsset ? "approved_public" : "placeholder",
    flags: candidate.flags,
    warnings: stringListFromMetadata(metadata, "importWarnings"),
    publicImageUrl: result.publicMediaAsset ? result.publicMediaAsset.url : null
  };
}

export async function autoCompleteImportedGameWithAi(result: ImportedGameResult): Promise<ImportedGameResult> {
  const [game, candidate] = await Promise.all([
    gameRepository.getEditorById(result.gameId),
    gameCandidateRepository.getById(result.candidateId)
  ]);

  if (!game || !candidate) {
    return {
      ...result,
      aiStatus: "failed",
      aiAppliedFields: [],
      aiWarnings: ["No se pudo cargar el contexto necesario para completar la ficha con IA."]
    };
  }

  const ratingUpdate = await buildExternalRatingUpdate(game, {
    title: candidate.title,
    extractedDescription: candidate.extractedDescription,
    metadata: candidate.metadata
  });
  let nextResult: ImportedGameResult = result;
  let appliedFields: string[] = [];
  let warnings = [...ratingUpdate.warnings];

  try {
    const completion = await completeGameEditorialFieldsWithBedrock(game, {
      title: candidate.title,
      extractedDescription: candidate.extractedDescription,
      metadata: candidate.metadata
    });
    const sanitizedCompletion = sanitizeEditorialFields(completion);
    const patchResult = buildSafeEditorialPatch(game, sanitizedCompletion, {
      mode: "prefer_completion"
    });
    appliedFields = patchResult.appliedFields;
    warnings = [...sanitizedCompletion.warnings, ...ratingUpdate.warnings];

    if (appliedFields.length || typeof ratingUpdate.external.score === "number") {
      await gameRepository.update(result.gameId, {
        ...patchResult.patch,
        ratings: ratingUpdate.ratings,
        createdByAi: true
      });
    }

    nextResult = {
      ...result,
      title:
        typeof patchResult.patch.title === "string" && patchResult.patch.title.trim()
          ? patchResult.patch.title.trim()
          : result.title,
      cleanTitle:
        typeof patchResult.patch.title === "string" && patchResult.patch.title.trim()
          ? patchResult.patch.title.trim()
          : result.cleanTitle,
      detectedPlayers: playerLabelFromPatch(patchResult.patch) || result.detectedPlayers,
      detectedPlaytime: playtimeFromPatch(patchResult.patch) || result.detectedPlaytime,
      detectedAge: ageFromPatch(patchResult.patch) ?? result.detectedAge,
      detectedPublisher:
        typeof patchResult.patch.publisher === "string" && patchResult.patch.publisher.trim()
          ? patchResult.patch.publisher.trim()
          : result.detectedPublisher,
      aiStatus: appliedFields.length || typeof ratingUpdate.external.score === "number" ? "applied" : "no_changes",
      aiAppliedFields: appliedFields,
      aiWarnings: warnings,
      aiSuggestedTitle: patchResult.suggestedTitle
    };
  } catch (error) {
    if (error instanceof EditorialCompletionError && error.code === "aws_config") {
      if (typeof ratingUpdate.external.score === "number") {
        await gameRepository.update(result.gameId, {
          ratings: ratingUpdate.ratings,
          createdByAi: true
        });
      }

      return {
        ...result,
        aiStatus: typeof ratingUpdate.external.score === "number" ? "applied" : "unavailable",
        aiAppliedFields: [],
        aiWarnings: ratingUpdate.warnings
      };
    }

    if (typeof ratingUpdate.external.score === "number") {
      await gameRepository.update(result.gameId, {
        ratings: ratingUpdate.ratings,
        createdByAi: true
      });
    }

    return {
      ...result,
      aiStatus: "failed",
      aiAppliedFields: [],
      aiWarnings: [
        ...(error instanceof Error ? [error.message] : ["La IA no pudo completar la ficha tras importar."]),
        ...ratingUpdate.warnings
      ]
    };
  }

  const bggEnrichment = await enrichStructuredFieldsFromBggIfNeeded(result.gameId, nextResult.title);
  const enrichedGame = bggEnrichment.game;
  const finalAppliedFields = [
    ...(nextResult.aiAppliedFields || []),
    ...(bggEnrichment.applied ? ["bgg.structuredData"] : [])
  ];

  return {
    ...nextResult,
    detectedPlayers:
      enrichedGame ? formatDetectedPlayers(enrichedGame.minPlayers, enrichedGame.maxPlayers) || nextResult.detectedPlayers : nextResult.detectedPlayers,
    detectedPlaytime: enrichedGame?.playtime || nextResult.detectedPlaytime,
    detectedAge: enrichedGame?.minAge || nextResult.detectedAge,
    aiStatus:
      finalAppliedFields.length || typeof ratingUpdate.external.score === "number"
        ? "applied"
        : nextResult.aiStatus || "no_changes",
    aiAppliedFields: finalAppliedFields,
    aiWarnings: [...(nextResult.aiWarnings || []), ...bggEnrichment.warnings]
  };
}

export async function cleanupImportedCandidate(candidateId: string) {
  try {
    await gameCandidateRepository.delete(candidateId);
  } catch (error) {
    if (error instanceof Error && error.message === "No existe ese candidato.") {
      return;
    }

    console.error("cleanupImportedCandidate failed", error);
  }
}

async function resolveImportedTaxonomy(metadata: Record<string, unknown>) {
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

function normalizeImportedCandidate(input: NormalizedImportedCandidate) {
  return {
    ...input,
    metadata: normalizeCandidateMetadata(input.metadata),
    candidateImages: normalizeCandidateImages(input.candidateImages)
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

function firstString(metadata: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
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

function priceLabelFromMetadata(metadata: Record<string, unknown>) {
  const price = metadata.price;
  if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) {
    return null;
  }

  const currency = typeof metadata.currency === "string" && metadata.currency.trim() ? metadata.currency.trim() : "EUR";

  try {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  } catch {
    return `${price.toFixed(2)} ${currency}`;
  }
}

function playerLabelFromPatch(patch: Prisma.GameUpdateInput) {
  const min = typeof patch.minPlayers === "number" ? patch.minPlayers : null;
  const max = typeof patch.maxPlayers === "number" ? patch.maxPlayers : null;

  if (!min || !max) {
    return null;
  }

  return min === max ? `${min}` : `${min}-${max}`;
}

function playtimeFromPatch(patch: Prisma.GameUpdateInput) {
  return typeof patch.playtime === "string" && patch.playtime.trim() ? patch.playtime.trim() : null;
}

function ageFromPatch(patch: Prisma.GameUpdateInput) {
  return typeof patch.minAge === "number" && Number.isFinite(patch.minAge) && patch.minAge > 0 ? patch.minAge : null;
}

async function enrichStructuredFieldsFromBggIfNeeded(gameId: string, title: string) {
  const game = await gameRepository.getEditorById(gameId);

  if (!game) {
    return { game: null, applied: false, warnings: ["No se pudo recargar la ficha tras importar."] };
  }

  const validation = validateBeforePublish(game);
  const needsStructuredFields = validation.errors.some((error) =>
    error.startsWith("Jugadores:") || error.startsWith("Duración:") || error.startsWith("Edad mínima:")
  );

  if (!needsStructuredFields) {
    return { game, applied: false, warnings: [] as string[] };
  }

  try {
    const matches = await searchBggGames(title);
    const selected = pickBestBggMatch(matches, title);

    if (!selected) {
      return {
        game,
        applied: false,
        warnings: ["BGG no encontró una coincidencia clara para completar jugadores, duración y edad."]
      };
    }

    const details = await getBggGameDetails(selected.bggId);
    const updatedGame = await gameRepository.update(gameId, buildBggGameUpdateInput(game, details));

    return {
      game: updatedGame,
      applied: true,
      warnings: [`Se completaron jugadores, duración y edad usando BGG (${details.name}).`]
    };
  } catch (error) {
    if (shouldHideBggWarning(error)) {
      return {
        game,
        applied: false,
        warnings: []
      };
    }

    return {
      game,
      applied: false,
      warnings: [error instanceof Error ? error.message : "No se pudieron completar los datos estructurados con BGG."]
    };
  }
}

function shouldHideBggWarning(error: unknown) {
  return error instanceof BggApiError && (error.code === "missing_token" || error.code === "unauthorized");
}

function pickBestBggMatch(matches: Array<{ bggId: number; name: string; yearPublished: number | null }>, title: string) {
  if (!matches.length) {
    return null;
  }

  const normalizedTitle = normalizeComparableTitle(title);
  return (
    matches.find((match) => normalizeComparableTitle(match.name) === normalizedTitle) ||
    matches.find((match) => normalizeComparableTitle(match.name).includes(normalizedTitle) || normalizedTitle.includes(normalizeComparableTitle(match.name))) ||
    matches[0]
  );
}

function normalizeComparableTitle(value: string) {
  return value
    .toLocaleLowerCase("es")
    .replace(/[:\-.,/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatDetectedPlayers(minPlayers: number | null, maxPlayers: number | null) {
  if (!minPlayers || !maxPlayers) {
    return null;
  }

  return minPlayers === maxPlayers ? `${minPlayers}` : `${minPlayers}-${maxPlayers}`;
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
