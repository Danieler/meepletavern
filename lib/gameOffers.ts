import type { GameOffer, Prisma, Source } from "@prisma/client";
import { normalizeCandidateMetadata } from "@/lib/editorialMappers";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

type SourceInfo = Pick<Source, "id" | "name" | "baseUrl">;

type CandidateCommerceContext = {
  sourceUrl: string;
  title: string;
  originalTitle: string | null;
  metadata: Record<string, unknown>;
};

export type StoreOfferInput = {
  sourceName?: string | null;
  sourceDisplayName?: string | null;
  storeName?: string | null;
  titleAtSource?: string | null;
  price?: number | null;
  currency?: string | null;
  availability?: string | null;
  purchaseUrl?: string | null;
  affiliateUrl?: string | null;
  sourceUrl?: string | null;
  externalId?: string | null;
  rawData?: unknown;
  fetchedAt?: Date | string | null;
};

export type NormalizedStoreOffer = {
  sourceId: string | null;
  sourceName: string;
  sourceDisplayName: string;
  storeName: string;
  titleAtSource: string | null;
  price: number | null;
  currency: string | null;
  availability: string | null;
  purchaseUrl: string | null;
  affiliateUrl: string | null;
  sourceUrl: string | null;
  externalId: string | null;
  rawData: Prisma.JsonValue | null;
  fetchedAt: Date;
};

type OfferScope = {
  gameId?: string | null;
  candidateId?: string | null;
  source: SourceInfo;
};

type GameOfferDbClient = {
  gameOffer: {
    findFirst(args: { where: Prisma.GameOfferWhereInput }): Promise<GameOffer | null>;
    create(args: { data: Prisma.GameOfferCreateInput | Prisma.GameOfferUncheckedCreateInput }): Promise<GameOffer>;
    update(args: { where: { id: string }; data: Prisma.GameOfferUpdateInput | Prisma.GameOfferUncheckedUpdateInput }): Promise<GameOffer>;
  };
};

export function normalizeStoreOffer(input: StoreOfferInput, source: Pick<Source, "name" | "baseUrl"> & { id?: string | null }): NormalizedStoreOffer | null {
  const price = normalizePrice(input.price);
  const sourceName = cleanIdentifier(input.sourceName) || slugify(source.name) || normalizeHost(source.baseUrl) || "source";
  const sourceDisplayName = cleanText(input.sourceDisplayName) || source.name.trim();
  const storeName = cleanText(input.storeName) || sourceDisplayName;
  const titleAtSource = cleanText(input.titleAtSource);
  const availability = cleanText(input.availability);
  const purchaseUrl = normalizeUrlLike(input.purchaseUrl);
  const affiliateUrl = normalizeUrlLike(input.affiliateUrl);
  const sourceUrl = normalizeUrlLike(input.sourceUrl);
  const externalId = cleanText(input.externalId);
  const currency =
    cleanCurrency(input.currency) ||
    (price !== null && looksLikeEuroStore(source.baseUrl, sourceName) ? "EUR" : null);
  const rawData = normalizeJsonValue(input.rawData);
  const fetchedAt = normalizeDate(input.fetchedAt) || new Date();

  if (!hasUsefulOfferData({ price, availability, purchaseUrl, affiliateUrl, sourceUrl, externalId })) {
    return null;
  }

  return {
    sourceId: source.id || null,
    sourceName,
    sourceDisplayName,
    storeName,
    titleAtSource,
    price,
    currency,
    availability,
    purchaseUrl,
    affiliateUrl,
    sourceUrl,
    externalId,
    rawData,
    fetchedAt
  };
}

export function buildStoreOfferInputFromCandidate(input: {
  source: SourceInfo;
  candidate: CandidateCommerceContext;
}): NormalizedStoreOffer | null {
  const metadata = normalizeCandidateMetadata(input.candidate.metadata);
  const sourceUrlClean = readString(metadata, ["sourceUrlClean"]) || input.candidate.sourceUrl;
  const purchaseUrl = readString(metadata, ["purchaseUrl"]) || sourceUrlClean;
  const offer = normalizeStoreOffer(
    {
      sourceName: readString(metadata, ["sourceName", "importedFrom"]),
      sourceDisplayName: readString(metadata, ["sourceDisplayName", "storeName"]) || input.source.name,
      storeName: readString(metadata, ["storeName", "sourceDisplayName"]) || input.source.name,
      titleAtSource:
        readString(metadata, ["sourceTitleOriginal", "amazonTitleOriginal"]) ||
        input.candidate.originalTitle ||
        input.candidate.title,
      price: readNumber(metadata.price),
      currency: readString(metadata, ["currency"]),
      availability: readString(metadata, ["availability"]),
      purchaseUrl,
      affiliateUrl: readString(metadata, ["affiliateUrl"]),
      sourceUrl: sourceUrlClean,
      externalId: readString(metadata, ["externalId", "asin"]),
      rawData: metadata.rawData ?? buildRawOfferData(metadata),
      fetchedAt: readString(metadata, ["fetchedAt"])
    },
    input.source
  );

  return offer;
}

export async function upsertStoreOfferForCandidate(input: {
  candidateId: string;
  source: SourceInfo;
  candidate: CandidateCommerceContext;
  gameId?: string | null;
}) {
  const offer = buildStoreOfferInputFromCandidate({
    source: input.source,
    candidate: input.candidate
  });

  if (!offer) {
    return null;
  }

  return upsertStoreOfferRecord(prisma, {
    candidateId: input.candidateId,
    gameId: input.gameId || null,
    source: input.source,
    offer
  });
}

export async function upsertStoreOfferForGame(input: {
  gameId: string;
  source: SourceInfo;
  candidate: CandidateCommerceContext;
  candidateId?: string | null;
}) {
  const offer = buildStoreOfferInputFromCandidate({
    source: input.source,
    candidate: input.candidate
  });

  if (!offer) {
    return null;
  }

  return upsertStoreOfferRecord(prisma, {
    gameId: input.gameId,
    candidateId: input.candidateId || null,
    source: input.source,
    offer
  });
}

export async function upsertStoreOfferRecord(
  db: GameOfferDbClient,
  input: OfferScope & { offer: StoreOfferInput | NormalizedStoreOffer | null }
) {
  const result = await upsertStoreOfferRecordDetailed(db, input);
  return result?.offer || null;
}

export async function upsertStoreOfferRecordDetailed(
  db: GameOfferDbClient,
  input: OfferScope & { offer: StoreOfferInput | NormalizedStoreOffer | null }
): Promise<{ offer: GameOffer; action: "created" | "updated" } | null> {
  const normalized = isNormalizedOffer(input.offer)
    ? input.offer
    : input.offer
      ? normalizeStoreOffer(input.offer, input.source)
      : null;

  if (!normalized || (!input.gameId && !input.candidateId)) {
    return null;
  }

  const existing = await findMatchingOffer(db, input, normalized);
  if (!existing) {
    const created = await db.gameOffer.create({
      data: {
        gameId: input.gameId || null,
        candidateId: input.candidateId || null,
        sourceId: normalized.sourceId,
        sourceName: normalized.sourceName,
        sourceDisplayName: normalized.sourceDisplayName,
        storeName: normalized.storeName,
        titleAtSource: normalized.titleAtSource,
        price: normalized.price,
        currency: normalized.currency,
        availability: normalized.availability,
        purchaseUrl: normalized.purchaseUrl,
        affiliateUrl: normalized.affiliateUrl,
        sourceUrl: normalized.sourceUrl,
        externalId: normalized.externalId,
        rawData: normalized.rawData as Prisma.InputJsonValue | undefined,
        fetchedAt: normalized.fetchedAt
      }
    });

    return {
      offer: created,
      action: "created"
    };
  }

  const updated = await db.gameOffer.update({
    where: { id: existing.id },
    data: buildOfferUpdateData(existing, input, normalized)
  });

  return {
    offer: updated,
    action: "updated"
  };
}

export function getBestOffer<T extends Pick<GameOffer, "price" | "availability" | "purchaseUrl" | "affiliateUrl" | "sourceUrl" | "fetchedAt">>(
  offers: T[]
) {
  const usefulOffers = offers.filter((offer) => hasUsefulOfferData({
    price: offer.price,
    availability: offer.availability,
    purchaseUrl: offer.purchaseUrl,
    affiliateUrl: offer.affiliateUrl,
    sourceUrl: offer.sourceUrl,
    externalId: null
  }));

  if (!usefulOffers.length) {
    return null;
  }

  return [...usefulOffers].sort((left, right) => {
    const availabilityDiff = availabilityPriority(left.availability) - availabilityPriority(right.availability);
    if (availabilityDiff !== 0) {
      return availabilityDiff;
    }

    const leftPrice = typeof left.price === "number" && Number.isFinite(left.price) && left.price > 0 ? left.price : null;
    const rightPrice = typeof right.price === "number" && Number.isFinite(right.price) && right.price > 0 ? right.price : null;
    const leftHasPrice = leftPrice !== null;
    const rightHasPrice = rightPrice !== null;
    if (leftHasPrice && rightHasPrice && leftPrice !== rightPrice) {
      return leftPrice - rightPrice;
    }
    if (leftHasPrice !== rightHasPrice) {
      return leftHasPrice ? -1 : 1;
    }

    const leftHasLink = hasPurchaseLink(left);
    const rightHasLink = hasPurchaseLink(right);
    if (leftHasLink !== rightHasLink) {
      return leftHasLink ? -1 : 1;
    }

    return right.fetchedAt.getTime() - left.fetchedAt.getTime();
  })[0] || null;
}

async function findMatchingOffer(db: GameOfferDbClient, scope: OfferScope, offer: NormalizedStoreOffer) {
  const searches = buildOfferSearches(scope, offer);

  for (const where of searches) {
    const existing = await db.gameOffer.findFirst({ where });
    if (existing) {
      return existing;
    }
  }

  return null;
}

function buildOfferSearches(scope: OfferScope, offer: NormalizedStoreOffer) {
  const searches: Prisma.GameOfferWhereInput[] = [];

  const pushSearch = (identity: Prisma.GameOfferWhereInput) => {
    searches.push(identity);
  };

  if (scope.candidateId && offer.sourceUrl) {
    pushSearch({
      candidateId: scope.candidateId,
      sourceName: offer.sourceName,
      sourceUrl: offer.sourceUrl
    });
  }

  if (scope.gameId && offer.sourceUrl) {
    pushSearch({
      gameId: scope.gameId,
      sourceName: offer.sourceName,
      sourceUrl: offer.sourceUrl
    });
  }

  if (scope.candidateId && offer.purchaseUrl) {
    pushSearch({
      candidateId: scope.candidateId,
      sourceName: offer.sourceName,
      purchaseUrl: offer.purchaseUrl
    });
  }

  if (scope.gameId && offer.purchaseUrl) {
    pushSearch({
      gameId: scope.gameId,
      sourceName: offer.sourceName,
      purchaseUrl: offer.purchaseUrl
    });
  }

  if (scope.candidateId && offer.externalId) {
    pushSearch({
      candidateId: scope.candidateId,
      sourceName: offer.sourceName,
      externalId: offer.externalId
    });
  }

  if (scope.gameId && offer.externalId) {
    pushSearch({
      gameId: scope.gameId,
      sourceName: offer.sourceName,
      externalId: offer.externalId
    });
  }

  if (!offer.sourceUrl && !offer.purchaseUrl && !offer.externalId && offer.titleAtSource) {
    if (scope.candidateId) {
      pushSearch({
        candidateId: scope.candidateId,
        sourceName: offer.sourceName,
        titleAtSource: offer.titleAtSource
      });
    }

    if (scope.gameId) {
      pushSearch({
        gameId: scope.gameId,
        sourceName: offer.sourceName,
        titleAtSource: offer.titleAtSource
      });
    }
  }

  return searches;
}

function buildOfferUpdateData(existing: GameOffer, scope: OfferScope, offer: NormalizedStoreOffer): Prisma.GameOfferUncheckedUpdateInput {
  return {
    gameId: scope.gameId || existing.gameId,
    candidateId: scope.candidateId || existing.candidateId,
    sourceId: offer.sourceId || existing.sourceId,
    sourceDisplayName: offer.sourceDisplayName || existing.sourceDisplayName,
    storeName: offer.storeName || existing.storeName,
    titleAtSource: offer.titleAtSource || existing.titleAtSource,
    price: offer.price ?? existing.price,
    currency: offer.currency || existing.currency,
    availability: offer.availability || existing.availability,
    purchaseUrl: offer.purchaseUrl || existing.purchaseUrl,
    affiliateUrl: offer.affiliateUrl || existing.affiliateUrl,
    sourceUrl: offer.sourceUrl || existing.sourceUrl,
    externalId: offer.externalId || existing.externalId,
    rawData: (offer.rawData ?? existing.rawData) as Prisma.InputJsonValue | undefined,
    fetchedAt: offer.fetchedAt
  };
}

function buildRawOfferData(metadata: Record<string, unknown>) {
  const output: Record<string, unknown> = {};

  if (metadata.facts && typeof metadata.facts === "object") {
    output.facts = metadata.facts;
  }

  if (Array.isArray(metadata.features) && metadata.features.length) {
    output.features = metadata.features;
  }

  return Object.keys(output).length ? output : null;
}

function readString(metadata: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function cleanText(value: string | null | undefined) {
  return value?.trim() || null;
}

function cleanIdentifier(value: string | null | undefined) {
  const cleaned = value?.trim() || "";
  if (!cleaned) {
    return "";
  }

  const compact = cleaned.toLowerCase();
  return /^[a-z0-9_-]+$/.test(compact) ? compact : slugify(cleaned).replace(/-/g, "_");
}

function cleanCurrency(value: string | null | undefined) {
  const cleaned = value?.trim().toUpperCase() || "";
  return cleaned || null;
}

function normalizePrice(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  return Number(value.toFixed(2));
}

function normalizeDate(value: Date | string | null | undefined) {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value;
  }

  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

function normalizeUrlLike(value: string | null | undefined) {
  if (!value?.trim()) {
    return null;
  }

  try {
    return new URL(value.trim()).toString();
  } catch {
    return null;
  }
}

function normalizeJsonValue(value: unknown): Prisma.JsonValue | null {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeJsonValue(item))
      .filter((item): item is Prisma.JsonValue => item !== null);
  }

  if (value && typeof value === "object") {
    const output: Record<string, Prisma.JsonValue> = {};
    for (const [key, entry] of Object.entries(value)) {
      const normalized = normalizeJsonValue(entry);
      if (normalized !== null) {
        output[key] = normalized;
      }
    }
    return output;
  }

  return null;
}

function normalizeHost(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return value.trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/+$/, "").toLowerCase();
  }
}

function looksLikeEuroStore(baseUrl: string, sourceName: string) {
  return (
    /\.es(?:\/|$)/i.test(baseUrl) ||
    [
      "amazon",
      "dracotienda",
      "juegos-de-la-mesa-redonda",
      "juegos_de_la_mesa_redonda",
      "dungeon-marvels",
      "dungeon_marvels",
      "mathom",
      "zacatrus"
    ].includes(sourceName)
  );
}

function hasUsefulOfferData(input: {
  price: number | null;
  availability: string | null;
  purchaseUrl: string | null;
  affiliateUrl: string | null;
  sourceUrl: string | null;
  externalId: string | null;
}) {
  return Boolean(
    input.price !== null ||
      input.availability ||
      input.purchaseUrl ||
      input.affiliateUrl ||
      input.sourceUrl ||
      input.externalId
  );
}

function availabilityPriority(value: string | null | undefined) {
  const normalized = (value || "").trim().toLowerCase();

  if (!normalized) {
    return 1;
  }

  if (/agotad|sin stock|fuera de stock|outofstock|unavailable/.test(normalized)) {
    return 2;
  }

  if (/en stock|instock|disponible|available/.test(normalized)) {
    return 0;
  }

  if (/pre-?pedido|preventa|reserva|backorder/.test(normalized)) {
    return 1;
  }

  return 1;
}

function hasPurchaseLink(offer: Pick<GameOffer, "purchaseUrl" | "affiliateUrl" | "sourceUrl">) {
  return Boolean(offer.affiliateUrl || offer.purchaseUrl || offer.sourceUrl);
}

function isNormalizedOffer(value: StoreOfferInput | NormalizedStoreOffer | null): value is NormalizedStoreOffer {
  return Boolean(value && typeof value === "object" && "sourceId" in value && "fetchedAt" in value);
}
