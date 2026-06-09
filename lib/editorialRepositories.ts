import {
  EditorialFlag,
  GameCandidateStatus,
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
    include: { source: true }
  });

  if (!candidate) {
    throw new Error("No existe ese candidato.");
  }

  if (candidate.status === GameCandidateStatus.converted) {
    throw new Error("El candidato ya está convertido.");
  }

  const metadata = normalizeCandidateMetadata(candidate.metadata);
  const players = normalizeGamePlayers(metadata.players);
  const faq = normalizeGameFaq(metadata.faq);
  const title = candidate.title.trim();
  const slug = await ensureUniqueGameSlug(slugify(title));
  const playtime = formatPlaytime(metadata.minPlayTime, metadata.maxPlayTime);
  const minAge = numberOrNull(metadata.minAge);
  const publisher = stringOrNull(metadata.publisher);
  const aiDraft = normalizeAiDraft(candidate.aiDraft);
  const draftFaq = normalizeGameFaq(aiDraft?.faq);

  const game = await prisma.$transaction(async (transaction) => {
    const createdGame = await transaction.game.create({
      data: {
        name: title,
        title,
        slug,
        status,
        originalTitle: candidate.originalTitle,
        year: numberOrNull(metadata.year),
        players: players as unknown as Prisma.InputJsonValue,
        minPlayers: players.min ?? null,
        maxPlayers: players.max ?? null,
        minAge,
        age: minAge ? `${minAge}+` : null,
        playtime,
        publisher,
        shortDescription: stringFromDraft(aiDraft, "shortDescription"),
        description: stringFromDraft(aiDraft, "description"),
        quickVerdict: stringFromDraft(aiDraft, "quickVerdict"),
        bestFor: stringFromDraft(aiDraft, "bestFor"),
        notFor: stringFromDraft(aiDraft, "notFor"),
        categories: [],
        mechanics: [],
        themes: [],
        pros: stringArrayFromDraft(aiDraft, "pros"),
        cons: stringArrayFromDraft(aiDraft, "cons"),
        faq: (draftFaq.length ? draftFaq : faq) as unknown as Prisma.InputJsonValue,
        faqs: (draftFaq.length ? draftFaq : faq) as unknown as Prisma.InputJsonValue,
        seoTitle: stringFromDraft(aiDraft, "seoTitle"),
        seoDescription: stringFromDraft(aiDraft, "seoDescription"),
        sourceIds: [candidate.sourceId],
        imageFallbackAccepted: false,
        createdByAi: Boolean(aiDraft),
        publishedAt: null
      }
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
