import {
  EditorialFlag,
  GameCandidateStatus,
  GameImageStatus,
  GameStatus,
  MediaAssetStatus,
  MediaAssetType,
  MediaAssetUsage,
  Prisma,
  SourceStatus,
  SourceType
} from "@prisma/client";
import { generateEditorialDraft } from "@/lib/ai/editorialDraftService";
import { extractAsmodeeCandidate, type NormalizedCandidate } from "@/lib/connectors/asmodeeConnector";
import {
  normalizeAiDraft,
  normalizeCandidateImages,
  normalizeCandidateMetadata,
  normalizeGameFaq,
  normalizeGamePlayers,
  normalizeSourcePermissions
} from "@/lib/editorialMappers";
import type { SourcePermissions } from "@/lib/editorialTypes";
import { isAsmodeeImportSource } from "@/lib/importSourceFilters";
import { canShowMedia } from "@/lib/mediaSafety";
import { prisma } from "@/lib/prisma";
import { getSourcePolicy } from "@/lib/sourcePolicy";
import { slugify } from "@/lib/slug";

export type CandidateFilter =
  | "all"
  | "ready"
  | "needs_review"
  | "missing_data"
  | "needs_permission"
  | "duplicates"
  | "rejected";

export type CreateSourceInput = {
  name: unknown;
  baseUrl: unknown;
  type: unknown;
  status: unknown;
  permissions?: unknown;
  attributionRequired?: unknown;
  attributionText?: unknown;
  notes?: unknown;
  contactEmail?: unknown;
  permissionProofUrl?: unknown;
};

export type UpdateSourceInput = Partial<CreateSourceInput>;

export type ManualCandidateInput = {
  sourceId: unknown;
  sourceUrl: unknown;
  title: unknown;
  originalTitle?: unknown;
  year?: unknown;
  minPlayers?: unknown;
  maxPlayers?: unknown;
  minAge?: unknown;
  minPlayTime?: unknown;
  maxPlayTime?: unknown;
  publisher?: unknown;
  candidateImageUrl?: unknown;
};

export type ConnectorCandidateInput = {
  sourceId: unknown;
  sourceUrl: unknown;
};

export type BulkImportResult = {
  url: string;
  status: "success" | "failed" | "duplicate" | "needs_review";
  candidateId?: string;
  message?: string;
};

export type UpdateMediaAssetInput = {
  status?: unknown;
  usage?: unknown;
  type?: unknown;
  attribution?: unknown;
  localPath?: unknown;
  gameId?: unknown;
  candidateId?: unknown;
  sourceId?: unknown;
};

type ConvertGameStatus = (typeof GameStatus)["draft"] | (typeof GameStatus)["review"];

const missingDataFlags = [
  EditorialFlag.missing_players,
  EditorialFlag.missing_playtime,
  EditorialFlag.missing_age
] as const;

export const sourceRepository = {
  list() {
    return prisma.source.findMany({
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }]
    });
  },

  getById(id: string) {
    return prisma.source.findUnique({ where: { id } });
  },

  create(input: CreateSourceInput) {
    return prisma.source.create({
      data: toSourceCreateData(input)
    });
  },

  update(id: string, input: UpdateSourceInput) {
    return prisma.source.update({
      where: { id },
      data: toSourceUpdateData(input)
    });
  }
};

export const gameCandidateRepository = {
  list(filter: CandidateFilter = "all") {
    return prisma.gameCandidate.findMany({
      where: candidateWhere(filter),
      include: { source: true },
      orderBy: [{ createdAt: "desc" }]
    });
  },

  getById(id: string) {
    return prisma.gameCandidate.findUnique({
      where: { id },
      include: { source: true, mediaAssets: true }
    });
  },

  create(input: ManualCandidateInput) {
    return createManualGameCandidate(input);
  },

  createFromConnector(input: ConnectorCandidateInput) {
    return createConnectorGameCandidate(input);
  },

  update(id: string, input: Prisma.GameCandidateUpdateInput) {
    return prisma.gameCandidate.update({
      where: { id },
      data: input
    });
  },

  reject(id: string) {
    return prisma.gameCandidate.update({
      where: { id },
      data: { status: GameCandidateStatus.rejected }
    });
  },

  async delete(id: string) {
    const candidate = await prisma.gameCandidate.findUnique({
      where: { id },
      include: { mediaAssets: true }
    });

    if (!candidate) {
      throw new Error("No existe ese candidato.");
    }

    if (candidate.status === GameCandidateStatus.converted) {
      throw new Error("No se puede borrar un candidato ya convertido.");
    }

    await prisma.$transaction(async (transaction) => {
      await transaction.mediaAsset.deleteMany({
        where: {
          candidateId: candidate.id,
          gameId: null
        }
      });

      await transaction.gameCandidate.delete({
        where: { id: candidate.id }
      });
    });

    return candidate;
  },

  async generateAiDraft(id: string) {
    const candidate = await prisma.gameCandidate.findUnique({ where: { id } });

    if (!candidate) {
      throw new Error("No existe ese candidato.");
    }

    const aiDraft = generateEditorialDraft({
      title: candidate.title,
      originalTitle: candidate.originalTitle,
      metadata: candidate.metadata,
      extractedDescription: candidate.extractedDescription
    });

    return prisma.gameCandidate.update({
      where: { id },
      data: {
        aiDraft: aiDraft as Prisma.InputJsonValue,
        aiGenerated: true,
        aiReviewed: false
      }
    });
  }
};

export const gameRepository = {
  list() {
    return prisma.game.findMany({
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }]
    });
  },

  getById(id: string) {
    return prisma.game.findUnique({ where: { id } });
  },

  getEditorById(id: string) {
    return prisma.game.findUnique({
      where: { id },
      include: { mediaAssets: true }
    });
  },

  create(input: Prisma.GameCreateInput) {
    return prisma.game.create({ data: input });
  },

  update(id: string, input: Prisma.GameUpdateInput) {
    return prisma.game.update({
      where: { id },
      data: input
    });
  },

  async delete(id: string) {
    const game = await prisma.game.findUnique({
      where: { id },
      include: { mediaAssets: true }
    });

    if (!game) {
      throw new Error("No existe ese juego.");
    }

    if (game.status === GameStatus.published) {
      throw new Error("No se puede borrar un juego publicado.");
    }

    const linkedCandidateIds = [...new Set(game.mediaAssets.map((asset) => asset.candidateId).filter((value): value is string => Boolean(value)))];

    await prisma.$transaction(async (transaction) => {
      if (linkedCandidateIds.length) {
        await transaction.mediaAsset.updateMany({
          where: {
            gameId: game.id,
            candidateId: { not: null }
          },
          data: {
            gameId: null,
            status: MediaAssetStatus.candidate,
            usage: MediaAssetUsage.admin_only
          }
        });

        await transaction.gameCandidate.updateMany({
          where: {
            id: { in: linkedCandidateIds },
            status: GameCandidateStatus.converted
          },
          data: {
            status: GameCandidateStatus.needs_review
          }
        });
      }

      await transaction.mediaAsset.deleteMany({
        where: {
          gameId: game.id,
          candidateId: null
        }
      });

      await transaction.game.delete({
        where: { id: game.id }
      });
    });

    return game;
  }
};

export const mediaAssetRepository = {
  list() {
    return prisma.mediaAsset.findMany({
      include: { source: true, candidate: true, game: true },
      orderBy: [{ createdAt: "desc" }]
    });
  },

  getById(id: string) {
    return prisma.mediaAsset.findUnique({ where: { id } });
  },

  create(input: Prisma.MediaAssetCreateInput) {
    return prisma.mediaAsset.create({ data: input });
  },

  async createFromCandidateImage(candidateId: string, imageUrl: string, typeInput?: unknown) {
    const candidate = await prisma.gameCandidate.findUnique({
      where: { id: candidateId },
      include: { source: true }
    });

    if (!candidate) {
      throw new Error("No existe ese candidato.");
    }

    const candidateImages = normalizeCandidateImages(candidate.candidateImages);
    const normalizedUrl = requiredString(imageUrl, "La URL de imagen es obligatoria.");

    if (!candidateImages.some((image) => image.url === normalizedUrl)) {
      throw new Error("La imagen no pertenece a las imágenes candidatas.");
    }

    return prisma.mediaAsset.create({
      data: {
        candidateId: candidate.id,
        sourceId: candidate.sourceId,
        url: normalizedUrl,
        type: normalizeMediaAssetType(typeInput),
        status: MediaAssetStatus.candidate,
        usage: MediaAssetUsage.admin_only,
        attribution: candidate.source.attributionText
      }
    });
  },

  update(id: string, input: Prisma.MediaAssetUpdateInput) {
    return prisma.mediaAsset.update({
      where: { id },
      data: input
    });
  },

  async updateEditorial(id: string, input: UpdateMediaAssetInput) {
    const current = await prisma.mediaAsset.findUnique({
      where: { id },
      include: { source: true }
    });

    if (!current) {
      throw new Error("No existe ese asset.");
    }

    const source = input.sourceId ? await sourceRepository.getById(requiredString(input.sourceId, "Fuente inválida.")) : current.source;
    const requestedUsage = normalizeMediaAssetUsage(input.usage);
    const safeUsage =
      requestedUsage === MediaAssetUsage.public && (!source || !getSourcePolicy(source).canUseImagePublicly)
        ? MediaAssetUsage.admin_only
        : requestedUsage;
    const data: Prisma.MediaAssetUncheckedUpdateInput = {
      status: normalizeMediaAssetStatus(input.status),
      usage: safeUsage,
      type: normalizeMediaAssetType(input.type),
      attribution: optionalString(input.attribution),
      localPath: optionalString(input.localPath),
      gameId: optionalId(input.gameId),
      candidateId: optionalId(input.candidateId),
      sourceId: source?.id ?? null
    };

    return prisma.mediaAsset.update({
      where: { id },
      data
    });
  }
};

export async function convertCandidateToGame(candidateId: string, status: ConvertGameStatus) {
  const candidate = await prisma.gameCandidate.findUnique({
    where: { id: candidateId },
    include: { source: true, mediaAssets: true }
  });

  if (!candidate) {
    throw new Error("No existe ese candidato.");
  }

  if (candidate.status === GameCandidateStatus.converted) {
    throw new Error("El candidato ya está convertido.");
  }

  const gameData = await buildGameCreateDataFromCandidate(candidate, status);

  const game = await prisma.$transaction(async (transaction) => {
    const createdGame = await transaction.game.create({
      data: gameData
    });

    await transaction.mediaAsset.updateMany({
      where: { candidateId: candidate.id, gameId: null },
      data: { gameId: createdGame.id }
    });

    await transaction.gameCandidate.update({
      where: { id: candidate.id },
      data: { status: GameCandidateStatus.converted }
    });

    return createdGame;
  });

  return game;
}

type CandidateForGameConversion = Prisma.GameCandidateGetPayload<{
  include: { source: true; mediaAssets: true };
}>;

async function buildGameCreateDataFromCandidate(candidate: CandidateForGameConversion, status: ConvertGameStatus): Promise<Prisma.GameCreateInput> {
  const metadata = normalizeCandidateMetadata(candidate.metadata);
  const aiDraft = normalizeAiDraft(candidate.aiDraft);
  const title = getCandidateGameTitle(candidate, metadata);
  const players = extractCandidatePlayers(metadata);
  const minAge = normalizeCandidateAge(extractCandidateNumber(metadata, [
    "minAge",
    "age",
    "edad",
    "Edad mínima recomendada",
    "Edad minima recomendada",
    "Age"
  ]));
  const playtime = extractCandidatePlaytime(metadata);
  const year = extractCandidateNumber(metadata, ["year", "año", "anio"]);
  const publisher = extractCandidatePublisher(metadata);
  const draftContent = buildCandidateDraftContent(candidate, metadata, aiDraft);
  const image = selectCandidateGameImage(candidate, title);

  return {
    name: title,
    title,
    slug: await ensureUniqueGameSlug(slugify(title)),
    status,
    originalTitle: optionalString(candidate.originalTitle),
    year,
    players: players as unknown as Prisma.InputJsonValue,
    minPlayers: players.min ?? null,
    maxPlayers: players.max ?? null,
    playtime,
    minAge,
    age: minAge ? `${minAge}+` : null,
    difficulty: extractCandidateDifficulty(metadata),
    complexity: extractCandidateDifficulty(metadata),
    categories: [...new Set([
      ...extractCandidateTextList(metadata, ["categories", "category"]),
      ...extractCandidateFactTextList(metadata, ["Género", "Genero"])
    ])],
    mechanics: extractCandidateMechanics(candidate, metadata),
    themes: [...new Set([
      ...extractCandidateTextList(metadata, ["themes", "theme"]),
      ...extractCandidateFactTextList(metadata, ["Tema", "Theme"])
    ])],
    publisher,
    spanishPublisher: extractCandidateSpanishPublisher(metadata),
    shortDescription: draftContent.shortDescription,
    shortSummary: draftContent.shortDescription,
    description: draftContent.description,
    quickVerdict: draftContent.quickVerdict,
    review: draftContent.quickVerdict,
    bestFor: draftContent.bestFor,
    notFor: draftContent.notFor,
    pros: draftContent.pros,
    cons: draftContent.cons,
    faq: draftContent.faq as unknown as Prisma.InputJsonValue,
    faqs: draftContent.faq as unknown as Prisma.InputJsonValue,
    seoTitle: draftContent.seoTitle,
    seoDescription: draftContent.seoDescription,
    buyUrl: candidate.sourceUrl,
    sources: [
      {
        label: candidate.source.name,
        url: candidate.sourceUrl
      }
    ] as unknown as Prisma.InputJsonValue,
    sourceIds: [candidate.sourceId],
    primaryImageId: image.primaryImageId,
    imageFallbackAccepted: image.imageFallbackAccepted,
    coverImageUrl: image.coverImageUrl,
    imageUrl: image.coverImageUrl,
    coverImageAlt: image.coverImageAlt,
    imageSourceName: image.imageSourceName,
    imageSourceUrl: image.imageSourceUrl,
    imageLicenseNote: image.imageLicenseNote,
    imageStatus: image.imageStatus,
    createdByAi: Boolean(aiDraft),
    publishedAt: null
  };
}

function buildCandidateDraftContent(
  candidate: CandidateForGameConversion,
  metadata: Prisma.JsonObject,
  aiDraft: Prisma.JsonObject | null
) {
  if (isAmazonMetadata(metadata) && !aiDraft) {
    return buildAmazonCandidateDraftContent(candidate, metadata);
  }

  if (aiDraft) {
    const draftFaq = normalizeGameFaq(aiDraft.faq);
    const fallbackFaq = buildFallbackFaq(candidate);
    const pros = stringArrayFromDraft(aiDraft, "pros");
    const cons = stringArrayFromDraft(aiDraft, "cons");

    return {
      shortDescription: stringFromDraft(aiDraft, "shortDescription") || buildFallbackShortDescription(candidate, metadata),
      description: stringFromDraft(aiDraft, "description") || buildFallbackDescription(candidate, metadata),
      quickVerdict: stringFromDraft(aiDraft, "quickVerdict") || buildFallbackQuickVerdict(candidate),
      bestFor: stringFromDraft(aiDraft, "bestFor") || buildFallbackBestFor(candidate, metadata),
      notFor: stringFromDraft(aiDraft, "notFor") || buildFallbackNotFor(candidate),
      pros: pros.length ? pros : buildFallbackPros(candidate, metadata),
      cons: cons.length ? cons : buildFallbackCons(candidate),
      faq: draftFaq.length ? draftFaq : fallbackFaq,
      seoTitle: stringFromDraft(aiDraft, "seoTitle") || buildFallbackSeoTitle(candidate),
      seoDescription: stringFromDraft(aiDraft, "seoDescription") || buildFallbackSeoDescription(candidate)
    };
  }

  const fallbackFaq = buildFallbackFaq(candidate);

  return {
    shortDescription: buildFallbackShortDescription(candidate, metadata),
    description: buildFallbackDescription(candidate, metadata),
    quickVerdict: buildFallbackQuickVerdict(candidate),
    bestFor: buildFallbackBestFor(candidate, metadata),
    notFor: buildFallbackNotFor(candidate),
    pros: buildFallbackPros(candidate, metadata),
    cons: buildFallbackCons(candidate),
    faq: fallbackFaq,
    seoTitle: buildFallbackSeoTitle(candidate),
    seoDescription: buildFallbackSeoDescription(candidate)
  };
}

function buildAmazonCandidateDraftContent(candidate: CandidateForGameConversion, metadata: Prisma.JsonObject) {
  const title = getCandidateGameTitle(candidate, metadata);

  return {
    shortDescription: `Ficha preliminar de ${title}, importada para revisión editorial en MeepleTavern.`,
    description: `${title} es una ficha preliminar importada desde una fuente comercial aprobada. Revisa jugadores, duración, edad, categorías, mecánicas y descripción editorial antes de publicarla.`,
    quickVerdict: "Pendiente de valoración editorial.",
    bestFor: null,
    notFor: null,
    pros: [],
    cons: [],
    faq: [],
    seoTitle: `${title} | MeepleTavern`,
    seoDescription: `Ficha de ${title} en MeepleTavern, pendiente de revisión editorial.`
  };
}

function selectCandidateGameImage(candidate: CandidateForGameConversion, displayTitle: string) {
  const publicAsset = candidate.mediaAssets.find((asset) => canShowMedia(asset, candidate.source));
  const reviewedAsset = candidate.mediaAssets.find((asset) => asset.url && asset.status === MediaAssetStatus.approved);
  const candidateAsset = candidate.mediaAssets.find((asset) => asset.url) || null;
  const candidateImages = normalizeCandidateImages(candidate.candidateImages);
  const fallbackImageUrl = candidateImages[0]?.url || null;
  const selectedAsset = publicAsset || reviewedAsset || candidateAsset;
  const imageUrl = publicAsset?.url || reviewedAsset?.url || candidateAsset?.url || fallbackImageUrl;

  if (!imageUrl) {
    return {
      primaryImageId: null,
      imageFallbackAccepted: false,
      coverImageUrl: null,
      imageSourceName: null,
      imageSourceUrl: null,
      imageLicenseNote: null,
      coverImageAlt: `Portada de ${displayTitle}`,
      imageStatus: GameImageStatus.missing
    };
  }

  const isVerified = Boolean(publicAsset);
  const primaryImageId = selectedAsset?.id || null;

  return {
    primaryImageId,
    imageFallbackAccepted: false,
    coverImageUrl: imageUrl,
    imageSourceName: candidate.source.name,
    imageSourceUrl: candidate.source.baseUrl,
    imageLicenseNote: selectedAsset?.attribution || candidate.source.attributionText || null,
    coverImageAlt: `Portada de ${displayTitle}`,
    imageStatus: isVerified ? GameImageStatus.verified : GameImageStatus.needs_review
  };
}

function buildFallbackShortDescription(candidate: CandidateForGameConversion, metadata: Prisma.JsonObject) {
  const summary = candidate.extractedDescription?.trim();
  const knownData = buildKnownDataSummary(metadata);

  if (summary) {
    return truncateText(summary, 240);
  }

  if (knownData) {
    return `Ficha preliminar importada desde ${candidate.source.name}. ${knownData}.`;
  }

  return `Ficha preliminar importada desde ${candidate.source.name} y pendiente de revisión editorial.`;
}

function buildFallbackDescription(candidate: CandidateForGameConversion, metadata: Prisma.JsonObject) {
  const parts = [
    candidate.extractedDescription?.trim() || null,
    buildKnownDataSummary(metadata) ? `Datos detectados: ${buildKnownDataSummary(metadata)}.` : null,
    `Fuente original: ${candidate.sourceUrl}.`
  ].filter(Boolean);

  return parts.join("\n\n");
}

function buildFallbackQuickVerdict(candidate: CandidateForGameConversion) {
  return `Borrador importado desde ${candidate.source.name}. Revisa y completa la ficha antes de publicar.`;
}

function buildFallbackBestFor(candidate: CandidateForGameConversion, metadata: Prisma.JsonObject) {
  const knownData = buildKnownDataSummary(metadata);

  if (knownData) {
    return `Jugadores que quieran revisar una ficha preliminar con los datos detectados: ${knownData}.`;
  }

  return `Jugadores que quieran completar la revisión editorial de la ficha importada desde ${candidate.source.name}.`;
}

function buildFallbackNotFor(candidate: CandidateForGameConversion) {
  const title = cleanCandidateTitle(candidate.title, candidate.sourceUrl);
  return `No es una ficha lista para público todavía: requiere revisión editorial antes de publicar ${title}.`;
}

function buildFallbackPros(candidate: CandidateForGameConversion, metadata: Prisma.JsonObject) {
  const features = extractStringArray(metadata, ["features"]);
  const summary = buildKnownDataSummary(metadata);
  const pros = features.slice(0, 3).map((item) => truncateText(item, 140));

  if (!pros.length && summary) {
    pros.push(`Datos extraídos: ${summary}`);
  }

  if (!pros.length) {
    pros.push(`Importado desde ${candidate.source.name}`);
  }

  return pros;
}

function buildFallbackCons(candidate: CandidateForGameConversion) {
  const flags = candidate.flags.map((flag) => editorialFlagToLabel(flag));
  const cons = flags.length ? [`Revisar estos avisos: ${flags.join(", ")}.`] : [];

  if (!cons.length) {
    cons.push("Falta revisión editorial antes de publicar.");
  }

  return cons;
}

function buildFallbackFaq(candidate: CandidateForGameConversion) {
  return [
    {
      question: "¿De dónde salen estos datos?",
      answer: `Se han importado desde ${candidate.source.name} a partir de la URL original.`
    },
    {
      question: "¿Está listo para publicar?",
      answer: "No todavía. Sigue siendo un borrador editorial hasta completar la revisión."
    }
  ];
}

function buildFallbackSeoTitle(candidate: CandidateForGameConversion) {
  const title = cleanCandidateTitle(candidate.title, candidate.sourceUrl);
  return `${title} | Ficha en revisión editorial`;
}

function buildFallbackSeoDescription(candidate: CandidateForGameConversion) {
  const title = cleanCandidateTitle(candidate.title, candidate.sourceUrl);
  return `Ficha preliminar de ${title} importada desde ${candidate.source.name} y pendiente de revisión editorial.`;
}

function buildKnownDataSummary(metadata: Prisma.JsonObject) {
  const players = extractCandidatePlayers(metadata);
  const playtime = extractCandidatePlaytime(metadata);
  const minAge = normalizeCandidateAge(extractCandidateNumber(metadata, ["minAge", "age", "edad"]));
  const publisher = extractCandidatePublisher(metadata);
  const parts = [
    players.min && players.max ? `jugadores ${players.min}-${players.max}` : null,
    playtime ? `duración ${playtime}` : null,
    minAge ? `edad ${minAge}+` : null,
    publisher ? `editorial ${publisher}` : null
  ].filter(Boolean);

  return parts.join(" · ");
}

function extractCandidatePlayers(metadata: Prisma.JsonObject) {
  const direct = isRecord(metadata.players) ? metadata.players : null;
  const factValue = extractCandidateFact(metadata, ["Número de jugadores", "Numero de jugadores", "Players", "Jugadores"]);
  const parsed = parsePlayersText(
    cleanStringValue(direct?.label) ||
      cleanStringValue(factValue) ||
      cleanStringValue(metadata["players"]) ||
      cleanStringValue(metadata["playerCount"])
  );

  return normalizeGamePlayers({
    min: optionalPositiveInt(direct?.min) || parsed.min,
    max: optionalPositiveInt(direct?.max) || parsed.max,
    ideal: optionalPositiveInt(direct?.ideal),
    label: cleanStringValue(direct?.label) || parsed.label || null
  });
}

function extractCandidatePlaytime(metadata: Prisma.JsonObject) {
  const directMin = optionalPositiveInt(metadata.minPlayTime);
  const directMax = optionalPositiveInt(metadata.maxPlayTime);
  const factValue = extractCandidateFact(metadata, ["Tiempo de juego estimado", "Tiempo de juego", "Playtime", "Duración"]);
  const parsed = parsePlaytimeText(cleanStringValue(factValue) || "");
  const min = directMin || parsed.min;
  const max = directMax || parsed.max;

  return formatPlaytime(min, max);
}

function extractCandidateNumber(metadata: Prisma.JsonObject, keys: string[]) {
  const direct = keys.map((key) => metadata[key]).find((value) => value !== undefined);
  const factValue = extractCandidateFact(metadata, keys);
  return optionalPositiveInt(direct) || parseFirstNumber(cleanStringValue(factValue));
}

function extractCandidatePublisher(metadata: Prisma.JsonObject) {
  const direct = cleanStringValue(metadata.publisher) || cleanStringValue(metadata.brand) || cleanStringValue(metadata.manufacturer);
  const factValue = extractCandidateFact(metadata, ["Marca", "Editorial", "Fabricante", "Publisher"]);
  return cleanNoisyLabelValue(direct || factValue);
}

function extractCandidateSpanishPublisher(metadata: Prisma.JsonObject) {
  const value = cleanStringValue(metadata.spanishPublisher) || extractCandidateFact(metadata, ["Editorial española", "Distribuidor", "Spanish publisher"]);
  return cleanNoisyLabelValue(value);
}

function extractCandidateDifficulty(metadata: Prisma.JsonObject) {
  return cleanStringValue(metadata.difficulty) || cleanStringValue(metadata.complexity) || null;
}

function extractCandidateTextList(metadata: Prisma.JsonObject, keys: string[]) {
  const direct = keys
    .map((key) => metadata[key])
    .flatMap((value) => normalizeStringList(value));

  return [...new Set(direct)];
}

function extractStringArray(metadata: Prisma.JsonObject, keys: string[]) {
  return keys
    .map((key) => metadata[key])
    .flatMap((value) => normalizeStringList(value));
}

function extractCandidateFactTextList(metadata: Prisma.JsonObject, keys: string[]) {
  const facts = isRecord(metadata.facts) ? metadata.facts : null;

  if (!facts) {
    return [];
  }

  const values = keys
    .map((key) => facts[key])
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => cleanNoisyLabelValue(value))
    .filter((value): value is string => value !== null);

  return [...new Set(values)];
}

function extractCandidateMechanics(candidate: CandidateForGameConversion, metadata: Prisma.JsonObject) {
  const fromDirect = extractCandidateTextList(metadata, ["mechanics", "mechanic"]);
  if (isAmazonMetadata(metadata)) {
    return fromDirect;
  }

  const features = extractStringArray(metadata, ["features"]).join(" ").toLowerCase();
  const values = new Set<string>(fromDirect);

  if (features.includes("cooperativ")) {
    values.add("Cooperativo");
  }

  if (features.includes("cartas")) {
    values.add("Cartas");
  }

  if (features.includes("dados")) {
    values.add("Dados");
  }

  if (features.includes("losetas")) {
    values.add("Colocación de losetas");
  }

  if (features.includes("miniaturas")) {
    values.add("Miniaturas");
  }

  if (!values.size && candidate.flags.includes(EditorialFlag.low_confidence)) {
    values.add("Pendiente de revisión");
  }

  return [...values];
}

function getCandidateGameTitle(candidate: CandidateForGameConversion, metadata: Prisma.JsonObject) {
  const cleanTitle = cleanStringValue(metadata.cleanTitle);
  if (cleanTitle) {
    return cleanTitle;
  }

  return cleanCandidateTitle(candidate.title, candidate.sourceUrl);
}

function isAmazonMetadata(metadata: Prisma.JsonObject) {
  return metadata.importedFrom === "amazon" || typeof metadata.asin === "string";
}

function normalizeCandidateAge(value: number | null) {
  if (!value || value <= 0) {
    return null;
  }

  return value > 30 ? Math.ceil(value / 12) : value;
}

function extractCandidateFact(metadata: Prisma.JsonObject, keys: string[]) {
  const facts = isRecord(metadata.facts) ? metadata.facts : null;

  if (!facts) {
    return null;
  }

  for (const key of keys) {
    const value = facts[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function normalizeStringList(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim());
  }

  if (typeof value === "string" && value.trim()) {
    return value.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean);
  }

  return [];
}

function parsePlayersText(value: string) {
  const compact = value.replace(/\s+/g, " ");
  const range = /(\d+)\s*[-–]\s*(\d+)/.exec(compact);
  const single = /(\d+)/.exec(compact);

  if (range) {
    return {
      min: Number(range[1]),
      max: Number(range[2]),
      label: `${range[1]}-${range[2]}`
    };
  }

  if (single) {
    return {
      min: Number(single[1]),
      max: Number(single[1]),
      label: single[1]
    };
  }

  return {
    min: null,
    max: null,
    label: null
  };
}

function parsePlaytimeText(value: string) {
  const compact = value.replace(/\s+/g, " ");
  const range = /(\d+)\s*[-–]\s*(\d+)/.exec(compact);
  const single = /(\d+)/.exec(compact);

  if (range) {
    return {
      min: Number(range[1]),
      max: Number(range[2])
    };
  }

  if (single) {
    return {
      min: Number(single[1]),
      max: Number(single[1])
    };
  }

  return {
    min: null,
    max: null
  };
}

function cleanCandidateTitle(title: string, sourceUrl: string) {
  let cleaned = title.trim().replace(/\s*:\s*Amazon\.es:.*$/i, "");

  const parts = cleaned.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length > 1) {
    const tail = parts.slice(1).join(" ").toLowerCase();
    if (/(juego de mesa|tiempo de juego|hecho por|amazon\.es|juguetes y juegos|promedio|para adultos|juego cooperativo)/i.test(tail)) {
      cleaned = parts[0];
    }
  }

  cleaned = cleaned.replace(/\s+/g, " ").trim();

  if (cleaned) {
    return cleaned;
  }

  try {
    return new URL(sourceUrl).pathname.split("/").filter(Boolean).pop() || title.trim();
  } catch {
    return title.trim();
  }
}

function cleanStringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function cleanNoisyLabelValue(value: string | null | undefined) {
  const compact = (value || "").replace(/\s+/g, " ").trim();

  if (!compact) {
    return null;
  }

  const noisyTokens = /(?:material|tema|género|genero|idioma|n[uú]mero|edad|tiempo|componentes|edici[oó]n|fabricante|tipo|nombre|clasificaci[oó]n)/i;
  if (compact.split(/\s+/).length > 4 && noisyTokens.test(compact)) {
    return compact.split(/\s+/)[0] || null;
  }

  return compact;
}

function parseFirstNumber(value: string) {
  const match = value.match(/\d+/);
  return match ? Number(match[0]) : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function truncateText(value: string, maxLength: number) {
  const compact = value.replace(/\s+/g, " ").trim();

  if (compact.length <= maxLength) {
    return compact;
  }

  return `${compact.slice(0, maxLength - 1).trimEnd()}…`;
}

function editorialFlagToLabel(flag: EditorialFlag) {
  const labels: Record<EditorialFlag, string> = {
    [EditorialFlag.possible_duplicate]: "posible duplicado",
    [EditorialFlag.missing_players]: "faltan jugadores",
    [EditorialFlag.missing_playtime]: "falta duración",
    [EditorialFlag.missing_age]: "falta edad mínima",
    [EditorialFlag.image_not_allowed]: "imagen no permitida",
    [EditorialFlag.low_confidence]: "baja confianza",
    [EditorialFlag.needs_permission]: "necesita permiso"
  };

  return labels[flag];
}

async function createManualGameCandidate(input: ManualCandidateInput) {
  const sourceId = requiredString(input.sourceId, "Selecciona una fuente.");
  const sourceUrl = requiredString(input.sourceUrl, "La URL de origen es obligatoria.");
  const title = requiredString(input.title, "El título es obligatorio.");
  const source = await sourceRepository.getById(sourceId);

  if (!source) {
    throw new Error("No existe esa fuente.");
  }

  const sourcePolicy = getSourcePolicy(source);

  if (!sourcePolicy.canCreateCandidate) {
    throw new Error("No se pueden crear candidatos desde una fuente rechazada.");
  }

  const originalTitle = optionalString(input.originalTitle);
  const year = optionalPositiveInt(input.year);
  const minPlayers = optionalPositiveInt(input.minPlayers);
  const maxPlayers = optionalPositiveInt(input.maxPlayers);
  const minAge = optionalPositiveInt(input.minAge);
  const minPlayTime = optionalPositiveInt(input.minPlayTime);
  const maxPlayTime = optionalPositiveInt(input.maxPlayTime);
  const publisher = optionalString(input.publisher);
  const candidateImageUrl = optionalString(input.candidateImageUrl);
  const candidateImages = normalizeCandidateImages(
    candidateImageUrl ? [{ url: candidateImageUrl, type: "cover", sourceUrl }] : []
  );
  const flags = calculateManualCandidateFlags({
    source,
    minPlayers,
    maxPlayers,
    minAge,
    minPlayTime,
    maxPlayTime,
    candidateImageUrl
  });
  const status = flags.length ? GameCandidateStatus.needs_review : GameCandidateStatus.pending;
  const metadata = normalizeCandidateMetadata({
    year,
    players: { min: minPlayers, max: maxPlayers },
    minAge,
    minPlayTime,
    maxPlayTime,
    publisher
  });
  const confidence = flags.length ? 0.45 : 0.75;

  const candidate = await prisma.gameCandidate.create({
    data: {
      sourceId,
      sourceUrl,
      title,
      originalTitle,
      metadata: metadata as Prisma.InputJsonValue,
      candidateImages: candidateImages as unknown as Prisma.InputJsonValue,
      aiDraft: normalizeAiDraft(null) as Prisma.InputJsonValue,
      confidence,
      status,
      flags
    }
  });

  if (candidateImages.length) {
    await prisma.mediaAsset.create({
      data: {
        candidateId: candidate.id,
        sourceId,
        url: candidateImages[0].url,
        type: MediaAssetType.cover,
        status: MediaAssetStatus.candidate,
        usage: MediaAssetUsage.admin_only,
        attribution: source.attributionText
      }
    });
  }

  return candidate;
}

async function createConnectorGameCandidate(input: ConnectorCandidateInput) {
  const sourceId = requiredString(input.sourceId, "Selecciona una fuente.");
  const sourceUrl = requiredString(input.sourceUrl, "La URL de origen es obligatoria.");
  const source = await sourceRepository.getById(sourceId);

  if (!source) {
    throw new Error("No existe esa fuente.");
  }

  const sourcePolicy = getSourcePolicy(source);

  if (!sourcePolicy.canCreateCandidate) {
    throw new Error("No se pueden crear candidatos desde una fuente rechazada.");
  }

  if (!isAsmodeeImportSource(source)) {
    throw new Error("Selecciona una fuente compatible con Asmodee.");
  }

  const duplicate = await findCandidateDuplicate(sourceId, sourceUrl);

  if (duplicate) {
    throw new Error("Ya existe un candidato para esa URL.");
  }

  const normalized = await extractAsmodeeCandidate(sourceUrl);
  return createCandidateFromNormalized(source, normalized);
}

export async function bulkImportCandidates(sourceIdInput: unknown, urlsInput: unknown, limitInput: unknown): Promise<BulkImportResult[]> {
  const sourceId = requiredString(sourceIdInput, "Selecciona una fuente.");
  const source = await sourceRepository.getById(sourceId);

  if (!source) {
    throw new Error("No existe esa fuente.");
  }

  if (!getSourcePolicy(source).canCreateCandidate) {
    throw new Error("No se pueden crear candidatos desde una fuente rechazada.");
  }

  if (!isAsmodeeImportSource(source)) {
    throw new Error("Selecciona una fuente compatible con Asmodee.");
  }

  const urls = parseBulkUrls(urlsInput);
  const limit = Math.min(optionalPositiveInt(limitInput) || 10, 20);
  const limitedUrls = urls.slice(0, limit);
  const results: BulkImportResult[] = [];

  for (const url of limitedUrls) {
    try {
      const duplicate = await findCandidateDuplicate(source.id, url);

      if (duplicate) {
        results.push({ url, status: "duplicate", candidateId: duplicate.id, message: "Ya existía un candidato para esta URL." });
        continue;
      }

      const normalized = await extractAsmodeeCandidate(url);
      const candidate = await createCandidateFromNormalized(source, normalized);
      results.push({
        url,
        status: candidate.status === GameCandidateStatus.needs_review ? "needs_review" : "success",
        candidateId: candidate.id
      });
    } catch (error) {
      results.push({
        url,
        status: "failed",
        message: error instanceof Error ? error.message : "No se pudo importar la URL."
      });
    }
  }

  return results;
}

async function createCandidateFromNormalized(
  source: NonNullable<Awaited<ReturnType<typeof sourceRepository.getById>>>,
  normalized: NormalizedCandidate
) {
  const sourcePolicy = getSourcePolicy(source);
  const candidateImages = normalizeCandidateImages(normalized.candidateImages);
  const flags = mergeFlags([
    ...normalized.flags,
    ...(candidateImages.length && !sourcePolicy.canUseImagePublicly ? [EditorialFlag.image_not_allowed] : []),
    ...(source.status !== SourceStatus.approved ? [EditorialFlag.needs_permission] : []),
    ...(normalized.confidence < 0.5 ? [EditorialFlag.low_confidence] : [])
  ]);

  return prisma.gameCandidate.create({
    data: {
      sourceId: source.id,
      sourceUrl: normalized.sourceUrl,
      title: normalized.title,
      originalTitle: normalized.originalTitle,
      metadata: normalizeCandidateMetadata(normalized.metadata) as Prisma.InputJsonValue,
      extractedDescription: normalized.extractedDescription,
      candidateImages: candidateImages as unknown as Prisma.InputJsonValue,
      aiDraft: normalizeAiDraft(null) as Prisma.InputJsonValue,
      aiGenerated: false,
      aiReviewed: false,
      confidence: normalized.confidence,
      status: flags.length ? GameCandidateStatus.needs_review : GameCandidateStatus.pending,
      flags
    }
  });
}

function toSourceCreateData(input: CreateSourceInput): Prisma.SourceCreateInput {
  return {
    name: requiredString(input.name, "El nombre de la fuente es obligatorio."),
    baseUrl: requiredString(input.baseUrl, "La URL base es obligatoria."),
    type: normalizeSourceType(input.type),
    status: normalizeSourceStatus(input.status),
    permissions: normalizeSourcePermissions(input.permissions) as unknown as Prisma.InputJsonValue,
    attributionRequired: input.attributionRequired === true,
    attributionText: optionalString(input.attributionText),
    notes: optionalString(input.notes),
    contactEmail: optionalString(input.contactEmail),
    permissionProofUrl: optionalString(input.permissionProofUrl)
  };
}

function toSourceUpdateData(input: UpdateSourceInput): Prisma.SourceUpdateInput {
  const data: Prisma.SourceUpdateInput = {};

  if ("name" in input) {
    data.name = requiredString(input.name, "El nombre de la fuente es obligatorio.");
  }

  if ("baseUrl" in input) {
    data.baseUrl = requiredString(input.baseUrl, "La URL base es obligatoria.");
  }

  if ("type" in input) {
    data.type = normalizeSourceType(input.type);
  }

  if ("status" in input) {
    data.status = normalizeSourceStatus(input.status);
  }

  if ("permissions" in input) {
    data.permissions = normalizeSourcePermissions(input.permissions) as unknown as Prisma.InputJsonValue;
  }

  if ("attributionRequired" in input) {
    data.attributionRequired = input.attributionRequired === true;
  }

  if ("attributionText" in input) {
    data.attributionText = optionalString(input.attributionText);
  }

  if ("notes" in input) {
    data.notes = optionalString(input.notes);
  }

  if ("contactEmail" in input) {
    data.contactEmail = optionalString(input.contactEmail);
  }

  if ("permissionProofUrl" in input) {
    data.permissionProofUrl = optionalString(input.permissionProofUrl);
  }

  return data;
}

function candidateWhere(filter: CandidateFilter): Prisma.GameCandidateWhereInput {
  if (filter === "ready") {
    return {
      status: { in: [GameCandidateStatus.pending, GameCandidateStatus.approved] },
      flags: { isEmpty: true }
    };
  }

  if (filter === "needs_review") {
    return { status: GameCandidateStatus.needs_review };
  }

  if (filter === "missing_data") {
    return {
      flags: { hasSome: [...missingDataFlags] }
    };
  }

  if (filter === "needs_permission") {
    return { flags: { has: EditorialFlag.needs_permission } };
  }

  if (filter === "duplicates") {
    return { flags: { has: EditorialFlag.possible_duplicate } };
  }

  if (filter === "rejected") {
    return { status: GameCandidateStatus.rejected };
  }

  return {};
}

function calculateManualCandidateFlags(input: {
  source: { status: SourceStatus; permissions: Prisma.JsonValue };
  minPlayers: number | null;
  maxPlayers: number | null;
  minAge: number | null;
  minPlayTime: number | null;
  maxPlayTime: number | null;
  candidateImageUrl: string | null;
}) {
  const flags: EditorialFlag[] = [];
  const policy = getSourcePolicy(input.source);

  if (!input.minPlayers || !input.maxPlayers) {
    flags.push(EditorialFlag.missing_players);
  }

  if (!input.minPlayTime || !input.maxPlayTime) {
    flags.push(EditorialFlag.missing_playtime);
  }

  if (!input.minAge) {
    flags.push(EditorialFlag.missing_age);
  }

  if (input.candidateImageUrl && !policy.canUseImagePublicly) {
    flags.push(EditorialFlag.image_not_allowed);
  }

  if (input.source.status !== SourceStatus.approved) {
    flags.push(EditorialFlag.needs_permission);
  }

  return [...new Set(flags)];
}

async function ensureUniqueGameSlug(baseSlug: string) {
  const cleanBase = baseSlug || "juego";
  let slug = cleanBase;
  let counter = 2;

  while (await prisma.game.findUnique({ where: { slug } })) {
    slug = `${cleanBase}-${counter}`;
    counter += 1;
  }

  return slug;
}

function normalizeSourceType(value: unknown) {
  return typeof value === "string" && value in SourceType ? (value as SourceType) : SourceType.manual;
}

function normalizeSourceStatus(value: unknown) {
  return typeof value === "string" && value in SourceStatus
    ? (value as SourceStatus)
    : SourceStatus.not_contacted;
}

function normalizeMediaAssetType(value: unknown) {
  return typeof value === "string" && value in MediaAssetType ? (value as MediaAssetType) : MediaAssetType.cover;
}

function normalizeMediaAssetStatus(value: unknown) {
  return typeof value === "string" && value in MediaAssetStatus
    ? (value as MediaAssetStatus)
    : MediaAssetStatus.candidate;
}

function normalizeMediaAssetUsage(value: unknown) {
  return typeof value === "string" && value in MediaAssetUsage
    ? (value as MediaAssetUsage)
    : MediaAssetUsage.admin_only;
}

function requiredString(value: unknown, message: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(message);
  }

  return value.trim();
}

function optionalId(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function optionalPositiveInt(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function numberOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function stringFromDraft(draft: Prisma.JsonObject | null, key: string) {
  const value = draft?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function stringArrayFromDraft(draft: Prisma.JsonObject | null, key: string) {
  const value = draft?.[key];

  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim());
}

function formatPlaytime(minInput: unknown, maxInput: unknown) {
  const min = numberOrNull(minInput);
  const max = numberOrNull(maxInput);

  if (min && max && min !== max) {
    return `${min}-${max} min`;
  }

  if (min || max) {
    return `${min || max} min`;
  }

  return null;
}

function parseBulkUrls(input: unknown) {
  if (typeof input !== "string") {
    return [];
  }

  return [
    ...new Set(
      input
        .split(/\r?\n/)
        .map((url) => url.trim())
        .filter(Boolean)
    )
  ];
}

function mergeFlags(flags: EditorialFlag[]) {
  return [...new Set(flags)];
}

function findCandidateDuplicate(sourceId: string, sourceUrl: string) {
  return prisma.gameCandidate.findFirst({
    where: {
      sourceId,
      sourceUrl
    },
    select: { id: true }
  });
}
