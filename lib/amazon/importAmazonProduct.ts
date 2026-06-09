import { EditorialFlag, GameCandidateStatus, GameStatus, MediaAssetStatus, MediaAssetType, MediaAssetUsage, Prisma, type Source } from "@prisma/client";
import { parseAmazonInput } from "@/lib/amazon/parseAmazonInput";
import { getAmazonPaapiProviderMode, getAmazonProduct } from "@/lib/amazon/amazonPaapiProvider";
import { mapAmazonProductToCandidate, type AmazonNormalizedCandidate } from "@/lib/amazon/mapAmazonProductToCandidate";
import { normalizeCandidateImages, normalizeCandidateMetadata } from "@/lib/editorialMappers";
import { getSourcePolicy } from "@/lib/sourcePolicy";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { sourceRepository } from "@/lib/editorialRepositories";

export type AmazonImportResult = {
  candidateId: string;
  gameId: string;
  sourceId: string;
  sourceUrl: string;
  asin: string;
  title: string;
  candidateStatus: GameCandidateStatus;
  imageStatus: "approved_public" | "placeholder";
  flags: EditorialFlag[];
  publicImageUrl: string | null;
};

export async function importAmazonProductReview(input: { sourceId: unknown; amazonInput: unknown }): Promise<AmazonImportResult> {
  const sourceId = readString(input.sourceId, "Selecciona una fuente.");
  const rawAmazonInput = readString(input.amazonInput, "Escribe un ASIN o una URL de Amazon.");
  const parsedInput = parseAmazonInput(rawAmazonInput);

  if (parsedInput.inputType === "invalid" || !parsedInput.asin) {
    throw new Error("Introduce un ASIN válido o una URL de Amazon válida.");
  }

  const source = await sourceRepository.getById(sourceId);
  if (!source) {
    throw new Error("No existe esa fuente.");
  }

  if (!isAmazonSource(source)) {
    throw new Error("Selecciona una fuente de Amazon aprobada.");
  }

  const sourcePolicy = getSourcePolicy(source);
  const product = await getAmazonProduct({ asin: parsedInput.asin });
  const mapped = mapAmazonProductToCandidate({
    product,
    source: {
      status: source.status,
      permissions: source.permissions
    },
    sourceUrl: rawAmazonInput
  });

  const candidate = normalizeAmazonCandidate(mapped, sourcePolicy);
  const publicImageAllowed = getAmazonPaapiProviderMode() === "real" && Boolean(product.imageUrl) && sourcePolicy.canUseImagePublicly;
  const gameSlug = await ensureUniqueSlug(slugify(candidate.title));

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
        players: {} as Prisma.InputJsonValue,
        minPlayers: null,
        maxPlayers: null,
        playtime: null,
        minAge: null,
        age: null,
        difficulty: null,
        complexity: null,
        categories: [],
        mechanics: [],
        themes: [],
        publisher: product.manufacturer || product.brand || null,
        spanishPublisher: null,
        shortDescription: `Ficha preliminar de ${candidate.title}, pendiente de revisión editorial en MeepleTavern.`,
        description: `${candidate.title} se ha importado como candidato desde una fuente comercial aprobada. Revisa jugadores, duración, edad, categorías y mecánicas antes de publicar.`,
        quickVerdict: "Pendiente de valoración editorial.",
        bestFor: null,
        notFor: null,
        pros: [],
        cons: [],
        faq: [] as Prisma.InputJsonValue,
        faqs: [] as Prisma.InputJsonValue,
        seoTitle: `${candidate.title} en revisión editorial`,
        seoDescription: `Ficha preliminar de ${candidate.title} importada desde Amazon y pendiente de revisión editorial en MeepleTavern.`,
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
    title: candidate.title,
    candidateStatus: candidate.flags.length ? GameCandidateStatus.needs_review : GameCandidateStatus.pending,
    imageStatus: result.publicMediaAsset ? "approved_public" : "placeholder",
    flags: candidate.flags,
    publicImageUrl: result.publicMediaAsset ? result.publicMediaAsset.url : null
  };
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
