import {
  buildAmazonCanonicalUrl,
  parseAmazonInput
} from "@/lib/amazon/parseAmazonInput";
import {
  searchAmazonProducts
} from "@/lib/amazon/amazonPaapiProvider";
import {
  GameImageStatus,
  GameCandidateStatus,
  GameStatus,
  MediaAssetStatus,
  MediaAssetType,
  MediaAssetUsage,
  Prisma,
  type Game,
  type GameCandidate,
  type GameOffer,
  type Source
} from "@prisma/client";
import { buildEditorialAutofill } from "@/lib/editorialAutofill";
import { buildEditorialSeedCopy } from "@/lib/editorialSeedCopy";
import type { CandidateImage } from "@/lib/editorialTypes";
import { sanitizeImportedTitle } from "@/lib/importedTextSanitizer";
import { buildStoreOfferInputFromCandidate, getBestOffer, type NormalizedStoreOffer, upsertStoreOfferRecordDetailed } from "@/lib/gameOffers";
import { normalizeCandidateImages, normalizeCandidateMetadata } from "@/lib/editorialMappers";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { sourceRepository } from "@/lib/editorialRepositories";
import { validateBeforePublish } from "@/lib/validateBeforePublish";
import type { AiPromptSource, AiWebProposal } from "@/lib/ai/gameWebAutofill";
import { importSourceProductCandidate } from "@/lib/import/importSourceProduct";
import type { NormalizedImportedCandidate } from "@/lib/import/importedGame";
import {
  getStoreSourceConnector,
  mapStoreSourceResultToImportCandidate,
  searchGameInSource,
  type StoreSourceSearchResult
} from "@/lib/import/sourceConnectors";

type SourceInfo = Pick<Source, "id" | "name" | "baseUrl">;

type CandidateRecord = Pick<
  GameCandidate,
  "id" | "sourceId" | "sourceUrl" | "title" | "originalTitle" | "metadata" | "extractedDescription" | "candidateImages" | "confidence" | "status" | "flags" | "gameId"
>;

type GameRecord = Pick<Game, "id" | "slug" | "title" | "name">;

export type MasterImportMode = "search" | "url" | "mixed";
export type MasterImportStatus = "ready_to_publish" | "needs_review" | "draft" | "update_existing" | "duplicate";

export type MasterImportInput = {
  title?: string;
  sourceUrl?: string;
  sourceName?: string;
  mode?: MasterImportMode;
  allowCrossSourceSearch?: boolean;
  dryRun?: boolean;
  traceId?: string;
};

export type SourceDiagnostic = {
  sourceName: string;
  stage: "search" | "import" | "detect";
  outcome: "matched" | "no_match" | "unsupported" | "failed" | "skipped";
  reason?: string;
  confidence?: number;
  sourceUrl?: string | null;
};

export type DuplicateDiagnostic = {
  id: string;
  type: "candidate" | "game";
  reason: "sourceUrl" | "normalizedTitle" | "slug";
  title: string;
};

export type MasterImportSummary = {
  candidateId: string | null;
  gameId: string | null;
  title: string;
  normalizedTitle: string;
  status: MasterImportStatus;
  qualityScore: number;
  matchedSources: string[];
  failedSources: Array<{ sourceName: string; reason: string }>;
  offersCreated: number;
  offersUpdated: number;
  bestOffer: Pick<GameOffer, "sourceName" | "sourceDisplayName" | "storeName" | "price" | "currency" | "availability" | "purchaseUrl" | "affiliateUrl" | "sourceUrl"> | null;
  missingFields: string[];
  warnings: string[];
  possibleDuplicates: DuplicateDiagnostic[];
  suggestedAction: "review_candidate" | "update_existing" | "inspect_duplicates";
  sourceDiagnostics: SourceDiagnostic[];
  sourcesWithOffers: string[];
  sourcesWithoutOffers: string[];
};

type ImportedSourceCandidate = {
  source: SourceInfo;
  candidate: NormalizedImportedCandidate;
  publicImageUrls: string[];
  matchedBy: "search" | "url";
  confidence: number;
};

type OfferEligibleResultCollection = {
  results: ImportedSourceCandidate[];
  warnings: string[];
};

type SearchSourceOutcome = {
  supported: boolean;
  results: StoreSourceSearchResult[];
};

type PersistenceResult = {
  candidateId: string;
  gameId: string | null;
  action: "created" | "updated";
  status?: MasterImportStatus;
  missingFields?: string[];
  warnings?: string[];
};

type DuplicateMatch = {
  exactCandidate: CandidateRecord | null;
  candidateMatches: CandidateRecord[];
  exactGame: GameRecord | null;
  gameMatches: GameRecord[];
};

type MasterImporterDeps = {
  listSources(): Promise<SourceInfo[]>;
  searchSource(source: SourceInfo, title: string): Promise<SearchSourceOutcome>;
  importSourceUrl(source: SourceInfo, sourceUrl: string): Promise<{ candidate: NormalizedImportedCandidate; publicImageUrls: string[] }>;
  findDuplicates(input: { title: string; sourceUrls: string[]; slugs: string[] }): Promise<DuplicateMatch>;
  resolveFinalData?(input: {
    resolved: ResolvedCandidateData;
    evidence: ImportedSourceCandidate[];
    requestedTitle: string | null;
  }): Promise<ResolvedCandidateData>;
  persistCandidate(input: {
    resolved: ResolvedCandidateData;
    duplicateMatch: DuplicateMatch;
    dryRun: boolean;
  }): Promise<PersistenceResult | null>;
  upsertOffer(input: {
    source: SourceInfo;
    candidateId: string | null;
    gameId: string | null;
    candidate: NormalizedImportedCandidate;
    dryRun: boolean;
  }): Promise<{ action: "created" | "updated" | "skipped"; offer: GameOffer | NormalizedStoreOffer | null }>;
};

type ResolvedCandidateData = {
  primarySource: SourceInfo;
  candidate: NormalizedImportedCandidate;
  missingFields: string[];
  matchedSources: string[];
  warnings: string[];
  aiProposal?: AiWebProposal | null;
  aiSearchQuery?: string | null;
  aiSearchResults?: Prisma.InputJsonValue | null;
  aiAppliedFields?: string[];
};

export function createMasterImportService(deps: MasterImporterDeps = createDefaultDeps()) {
  return async function importAndEnrichGame(input: MasterImportInput): Promise<MasterImportSummary> {
    const mode = resolveMode(input);
    const diagnostics: SourceDiagnostic[] = [];
    const failedSources: Array<{ sourceName: string; reason: string }> = [];
    const warnings: string[] = [];
    const results: ImportedSourceCandidate[] = [];
    const seenResultKeys = new Set<string>();
    const sources = await deps.listSources();

    if (!sources.length) {
      throw new Error("No hay fuentes configuradas.");
    }

    let seedTitle = cleanTitle(input.title);

    if (input.sourceUrl) {
      const detectedSource = detectSourceFromInput(sources, input.sourceUrl, input.sourceName);
      if (!detectedSource) {
        throw new Error("No se pudo detectar una fuente compatible para esa URL.");
      }

      try {
        const imported = await deps.importSourceUrl(detectedSource, input.sourceUrl);
        const confidence = imported.candidate.confidence || 0.95;
        pushImportedResult(results, seenResultKeys, {
          source: detectedSource,
          candidate: imported.candidate,
          publicImageUrls: imported.publicImageUrls,
          matchedBy: "url",
          confidence
        });
        diagnostics.push({
          sourceName: detectedSource.name,
          stage: "import",
          outcome: "matched",
          confidence,
          sourceUrl: imported.candidate.sourceUrl
        });
        seedTitle = seedTitle || imported.candidate.title;
      } catch (error) {
        const reason = error instanceof Error ? error.message : "No se pudo importar la URL";
        diagnostics.push({
          sourceName: detectedSource.name,
          stage: "import",
          outcome: "failed",
          reason,
          sourceUrl: input.sourceUrl
        });
        failedSources.push({ sourceName: detectedSource.name, reason });
        throw new Error(reason);
      }
    }

    const shouldSearchByTitle =
      Boolean(seedTitle) &&
      (mode === "search" || mode === "mixed" || (Boolean(input.sourceUrl) && input.allowCrossSourceSearch !== false));

    if (shouldSearchByTitle && seedTitle) {
      const excludedSourceIds = new Set(
        mode === "search" ? [] : results.map((result) => result.source.id)
      );

      for (const source of sources) {
        if (excludedSourceIds.has(source.id)) {
          diagnostics.push({
            sourceName: source.name,
            stage: "search",
            outcome: "skipped",
            reason: "Ya se importó como fuente semilla"
          });
          continue;
        }

        let searchOutcome: SearchSourceOutcome;
        try {
          searchOutcome = await deps.searchSource(source, seedTitle);
        } catch (error) {
          const reason = error instanceof Error ? error.message : "La búsqueda falló";
          diagnostics.push({
            sourceName: source.name,
            stage: "search",
            outcome: "failed",
            reason
          });
          failedSources.push({ sourceName: source.name, reason });
          continue;
        }

        if (!searchOutcome.supported) {
          diagnostics.push({
            sourceName: source.name,
            stage: "search",
            outcome: "unsupported",
            reason: "La fuente no soporta búsqueda automática por título"
          });
          continue;
        }

        const candidateMatches = searchOutcome.results
          .filter((result) => isLikelySameGameResult(seedTitle, result))
          .slice(0, 3);
        const topMatch = candidateMatches[0] || searchOutcome.results[0] || null;
        if (!candidateMatches.length) {
          diagnostics.push({
            sourceName: source.name,
            stage: "search",
            outcome: "no_match",
            reason: topMatch ? "No se encontró una coincidencia suficientemente fiable con el juego base" : "Sin resultados"
          });
          continue;
        }

        let matched = false;
        for (const match of candidateMatches) {
          try {
            const imported = await deps.importSourceUrl(source, match.purchaseUrl || match.sourceUrl);
            const confidence = Math.max(imported.candidate.confidence || 0, match.confidence);
            pushImportedResult(results, seenResultKeys, {
              source,
              candidate: imported.candidate,
              publicImageUrls: imported.publicImageUrls,
              matchedBy: "search",
              confidence
            });
            diagnostics.push({
              sourceName: source.name,
              stage: "search",
              outcome: "matched",
              confidence: match.confidence,
              sourceUrl: match.purchaseUrl || match.sourceUrl
            });
            matched = true;
            break;
          } catch {
            continue;
          }
        }

        if (!matched) {
          const fallbackCandidate = mapStoreSourceResultToImportCandidate(topMatch);
          pushImportedResult(results, seenResultKeys, {
            source,
            candidate: fallbackCandidate,
            publicImageUrls: topMatch.imageAllowed && topMatch.imageUrl ? [topMatch.imageUrl] : [],
            matchedBy: "search",
            confidence: topMatch.confidence
          });
          diagnostics.push({
            sourceName: source.name,
            stage: "search",
            outcome: "matched",
            confidence: topMatch.confidence,
            sourceUrl: topMatch.purchaseUrl || topMatch.sourceUrl
          });
          warnings.push(`[${source.name}] Se usó el resultado de búsqueda sin ficha detallada.`);
        }
      }
    }

    if (!results.length) {
      throw new Error("No se encontró ninguna coincidencia útil en las fuentes disponibles.");
    }

    const grouped = groupImportedCandidates(results, seedTitle || null);
    const selectedGroup = grouped[0]?.results || results;
    let resolved = resolveBestCandidateData({
      results: selectedGroup,
      requestedTitle: seedTitle || null
    });
    const offerEligibleResults = collectOfferEligibleResults({
      allResults: results,
      selectedGroup,
      requestedTitle: seedTitle || null,
      resolvedTitle: resolved.candidate.title
    });
    warnings.push(...offerEligibleResults.warnings);
    resolved = mergeOfferEvidenceIntoResolved(resolved, offerEligibleResults.results);

    if (deps.resolveFinalData) {
      resolved = await deps.resolveFinalData({
        resolved,
        evidence: offerEligibleResults.results,
        requestedTitle: seedTitle || null
      });
      resolved = mergeOfferEvidenceIntoResolved(resolved, offerEligibleResults.results);
    }

    warnings.push(...resolved.warnings);

    const duplicates = await deps.findDuplicates({
      title: resolved.candidate.title,
      sourceUrls: selectedGroup.map((result) => result.candidate.sourceUrl).filter(Boolean),
      slugs: [slugify(resolved.candidate.title)]
    });

    const possibleDuplicates = describeDuplicates(duplicates, resolved.candidate.title);
    const qualityScore = calculateCandidateQualityScore({
      candidate: resolved.candidate,
      sourceCount: offerEligibleResults.results.length,
      sourceNames: resolved.matchedSources,
      hasOffer: offerEligibleResults.results.some((result) => hasOfferData(result)),
      hasAllowedImage: resolved.candidate.candidateImages.length > 0,
      duplicateCount: possibleDuplicates.length
    });
    const prePersistStatus = deriveMasterImportStatus(qualityScore, duplicates);

    let persisted: PersistenceResult | null = null;
    const persistedOffers: Array<{ action: "created" | "updated"; offer: GameOffer | NormalizedStoreOffer }> = [];

    if (!input.dryRun) {
      persisted = await deps.persistCandidate({
        resolved,
        duplicateMatch: duplicates,
        dryRun: false
      });

      for (const result of offerEligibleResults.results) {
        const offerResult = await deps.upsertOffer({
          source: result.source,
          candidateId: persisted?.candidateId || duplicates.exactCandidate?.id || null,
          gameId: persisted?.gameId || duplicates.exactCandidate?.gameId || duplicates.exactGame?.id || null,
          candidate: result.candidate,
          dryRun: false
        });

        if (offerResult.action !== "skipped" && offerResult.offer) {
          persistedOffers.push({
            action: offerResult.action,
            offer: offerResult.offer
          });
        }
      }
    }

    const normalizedOffers = persistedOffers.length
      ? persistedOffers.map((entry) => entry.offer)
      : offerEligibleResults.results
          .map((result) => buildOfferFromImportedCandidate(result))
          .filter((offer): offer is NormalizedStoreOffer => Boolean(offer));

    const bestOffer = getBestOffer(normalizedOffers as Array<GameOffer | NormalizedStoreOffer>);

    return {
      candidateId: persisted?.candidateId || duplicates.exactCandidate?.id || null,
      gameId: persisted?.gameId || duplicates.exactCandidate?.gameId || duplicates.exactGame?.id || null,
      title: resolved.candidate.title,
      normalizedTitle: slugify(resolved.candidate.title),
      status: persisted?.status || prePersistStatus,
      qualityScore,
      matchedSources: resolved.matchedSources,
      failedSources,
      offersCreated: persistedOffers.filter((offer) => offer.action === "created").length,
      offersUpdated: persistedOffers.filter((offer) => offer.action === "updated").length,
      bestOffer: bestOffer
        ? {
            sourceName: bestOffer.sourceName,
            sourceDisplayName: bestOffer.sourceDisplayName,
            storeName: bestOffer.storeName,
            price: bestOffer.price,
            currency: bestOffer.currency,
            availability: bestOffer.availability,
            purchaseUrl: bestOffer.purchaseUrl,
            affiliateUrl: bestOffer.affiliateUrl,
            sourceUrl: bestOffer.sourceUrl
          }
        : null,
      missingFields: persisted?.missingFields || resolved.missingFields,
      warnings: dedupeStrings([...warnings, ...(persisted?.warnings || [])]),
      possibleDuplicates,
      suggestedAction: (persisted?.status || prePersistStatus) === "update_existing" || (persisted?.status || prePersistStatus) === "duplicate" ? "update_existing" : possibleDuplicates.length ? "inspect_duplicates" : "review_candidate",
      sourceDiagnostics: diagnostics,
      sourcesWithOffers: dedupeStrings(
        offerEligibleResults.results
          .filter((result) => hasOfferData(result))
          .map((result) => result.source.name)
      ),
      sourcesWithoutOffers: dedupeStrings(
        offerEligibleResults.results
          .filter((result) => !hasOfferData(result))
          .map((result) => result.source.name)
      )
    };
  };
}

export const importAndEnrichGame = createMasterImportService();

export function resolveBestCandidateData(input: {
  results: ImportedSourceCandidate[];
  requestedTitle: string | null;
}): ResolvedCandidateData {
  const sorted = [...input.results].sort((left, right) => rankSourceCandidate(right, input.requestedTitle) - rankSourceCandidate(left, input.requestedTitle));
  const primary = sorted[0];
  const primaryMetadata = normalizeCandidateMetadata(primary.candidate.metadata);
  const mergedTitle = primary.candidate.title;
  const normalizedTitle = slugify(mergedTitle);
  const mergedMetadata = mergeMetadata(
    sorted.map((result) => normalizeCandidateMetadata(result.candidate.metadata)),
    buildSourceMetadataExtras(sorted, {
      cleanTitle: mergedTitle,
      normalizedTitle
    })
  );
  const candidateImages = buildAllowedCandidateImages(sorted);
  const warnings = candidateImages.length ? [] : ["No se encontró ninguna imagen reutilizable permitida."];
  const missingFields = collectMissingFields({
    title: mergedTitle,
    minPlayers: readPositiveNumber(mergedMetadata.minPlayers),
    maxPlayers: readPositiveNumber(mergedMetadata.maxPlayers),
    minPlayTime: readPositiveNumber(mergedMetadata.minPlayTime),
    maxPlayTime: readPositiveNumber(mergedMetadata.maxPlayTime),
    minAge: readPositiveNumber(mergedMetadata.minAge),
    publisher: readString(mergedMetadata, ["publisher", "brand", "manufacturer"]),
    description: pickDescription(sorted)
  });

  const confidence = Math.min(
    0.97,
    Math.max(...sorted.map((result) => result.candidate.confidence || result.confidence || 0.4), 0.4)
  );

  return {
    primarySource: primary.source,
    candidate: {
      sourceUrl: primary.candidate.sourceUrl,
      title: mergedTitle,
      originalTitle: primary.candidate.originalTitle,
      metadata: mergedMetadata,
      extractedDescription: pickDescription(sorted),
      candidateImages,
      confidence,
      flags: [...new Set(sorted.flatMap((result) => result.candidate.flags))]
    },
    missingFields,
    matchedSources: dedupeStrings(sorted.map((result) => result.source.name)),
    warnings
  };
}

export function calculateCandidateQualityScore(input: {
  candidate: NormalizedImportedCandidate;
  sourceCount: number;
  sourceNames: string[];
  hasOffer: boolean;
  hasAllowedImage: boolean;
  duplicateCount: number;
}) {
  const metadata = normalizeCandidateMetadata(input.candidate.metadata);
  let score = 0;

  if (input.candidate.title.trim().length >= 3 && !/(amazon|comprar|oferta|carrito)/i.test(input.candidate.title)) score += 10;
  if (slugify(input.candidate.title)) score += 5;
  if (readPositiveNumber(metadata.minPlayers) && readPositiveNumber(metadata.maxPlayers)) score += 10;
  if (readPositiveNumber(metadata.minPlayTime) && readPositiveNumber(metadata.maxPlayTime)) score += 10;
  if (readPositiveNumber(metadata.minAge)) score += 5;
  if ((input.candidate.extractedDescription || "").trim().length >= 80) score += 10;
  if (hasTaxonomyHints(metadata)) score += 10;
  if (input.sourceNames.some((name) => sourceReliabilityScore(name) >= 70)) score += 10;
  if (input.hasOffer) score += 10;
  if (input.hasAllowedImage) score += 5;
  if (input.duplicateCount === 0) score += 10;
  if (input.sourceCount >= 2) score += 10;

  return Math.max(0, Math.min(100, score));
}

async function resolveWithTavilyAndNova(input: {
  resolved: ResolvedCandidateData;
  evidence: ImportedSourceCandidate[];
  requestedTitle: string | null;
}): Promise<ResolvedCandidateData> {
  const warnings: string[] = [];
  const game = buildDraftGameForAi(input.resolved);
  const extraSources = buildAiPromptSources(input.evidence);
  let aiSearchQuery: string | null = null;
  let aiSearchResults: Prisma.InputJsonValue | null = null;
  let proposal: AiWebProposal | null = null;
  let tavilyResults: any[] = [];
  let aiModule: Awaited<typeof import("@/lib/ai/gameWebAutofill")> | null = null;

  const loadAiModule = async () => {
    aiModule ||= await import("@/lib/ai/gameWebAutofill");
    return aiModule;
  };

  if (process.env.TAVILY_API_KEY?.trim()) {
    try {
      const module = await loadAiModule();
      const search = await module.searchBoardGameWithTavily(game);
      aiSearchQuery = search.query;
      aiSearchResults = search.results as unknown as Prisma.InputJsonValue;
      tavilyResults = search.results;
    } catch (error) {
      warnings.push(error instanceof Error ? `Tavily falló: ${error.message}` : "Tavily falló.");
    }
  } else {
    warnings.push("Tavily no está configurado; se usaron solo fuentes importadas.");
  }

  try {
    const module = await loadAiModule();
    proposal = await module.extractBoardGameFieldsWithNova({
      game,
      tavilyResults,
      extraSources
    });
  } catch (error) {
    warnings.push(error instanceof Error ? `Nova falló: ${error.message}` : "Nova falló.");
  }

  if (!proposal) {
    return {
      ...input.resolved,
      warnings: dedupeStrings([...input.resolved.warnings, ...warnings])
    };
  }

  return applyAiProposalToResolved(input.resolved, proposal, {
    warnings,
    aiSearchQuery,
    aiSearchResults
  });
}

function applyAiProposalToResolved(
  resolved: ResolvedCandidateData,
  proposal: AiWebProposal,
  input: {
    warnings: string[];
    aiSearchQuery: string | null;
    aiSearchResults: Prisma.InputJsonValue | null;
  }
): ResolvedCandidateData {
  const metadata = normalizeCandidateMetadata(resolved.candidate.metadata);
  const players = normalizeRangeValue(proposal.players.value);
  const playTime = normalizeRangeValue(proposal.playTime.value);
  const age = normalizeNumberValue(proposal.age.value);
  const year = normalizeNumberValue(proposal.year.value);
  const publisher = normalizeStringValue(proposal.publisher.value);
  const categories = normalizeStringArrayValue(proposal.categories.value);
  const mechanics = normalizeStringArrayValue(proposal.mechanics.value);
  const shortDescription = normalizeStringValue(proposal.shortDescription.value);
  const description = normalizeStringValue(proposal.description.value);
  const appliedFields: string[] = [];

  if (players) {
    metadata.minPlayers = players.min;
    metadata.maxPlayers = players.max;
    appliedFields.push("players");
  }
  if (playTime) {
    metadata.minPlayTime = playTime.min;
    metadata.maxPlayTime = playTime.max;
    appliedFields.push("playTime");
  }
  if (age) {
    metadata.minAge = age;
    appliedFields.push("age");
  }
  if (year) {
    metadata.year = year;
    appliedFields.push("year");
  }
  if (publisher) {
    metadata.publisher = publisher;
    appliedFields.push("publisher");
  }
  if (categories.length) {
    metadata.categories = categories;
    metadata.categoryHints = categories;
    appliedFields.push("categories");
  }
  if (mechanics.length) {
    metadata.mechanics = mechanics;
    metadata.mechanicHints = mechanics;
    appliedFields.push("mechanics");
  }
  if (shortDescription) {
    metadata.shortDescription = shortDescription;
    appliedFields.push("shortDescription");
  }
  if (description) {
    metadata.description = description;
    appliedFields.push("description");
  }

  metadata.aiResolution = {
    provider: "tavily_nova_micro",
    appliedFields,
    needsHumanReview: proposal.needsHumanReview,
    notes: proposal.notes,
    externalSources: proposal.externalSources
  };

  const candidate = {
    ...resolved.candidate,
    metadata,
    extractedDescription: description || resolved.candidate.extractedDescription,
    confidence: Math.max(resolved.candidate.confidence, proposal.needsHumanReview ? 0.82 : 0.94)
  };

  return {
    ...resolved,
    candidate,
    missingFields: collectMissingFields({
      title: candidate.title,
      minPlayers: readPositiveNumber(metadata.minPlayers),
      maxPlayers: readPositiveNumber(metadata.maxPlayers),
      minPlayTime: readPositiveNumber(metadata.minPlayTime),
      maxPlayTime: readPositiveNumber(metadata.maxPlayTime),
      minAge: readPositiveNumber(metadata.minAge),
      publisher: readString(metadata, ["publisher", "brand", "manufacturer"]),
      description: candidate.extractedDescription
    }),
    warnings: dedupeStrings([...resolved.warnings, ...input.warnings, ...proposal.notes]),
    aiProposal: proposal,
    aiSearchQuery: input.aiSearchQuery,
    aiSearchResults: input.aiSearchResults,
    aiAppliedFields: appliedFields
  };
}

function mergeOfferEvidenceIntoResolved(
  resolved: ResolvedCandidateData,
  results: ImportedSourceCandidate[]
): ResolvedCandidateData {
  const metadata = mergeMetadata(
    [normalizeCandidateMetadata(resolved.candidate.metadata)],
    buildSourceMetadataExtras(results)
  );

  return {
    ...resolved,
    candidate: {
      ...resolved.candidate,
      metadata
    },
    matchedSources: dedupeStrings(results.map((result) => result.source.name))
  };
}

function buildDraftGameForAi(resolved: ResolvedCandidateData): Game {
  const metadata = normalizeCandidateMetadata(resolved.candidate.metadata);
  const now = new Date();
  const title = resolved.candidate.title;
  const minPlayers = readPositiveNumber(metadata.minPlayers);
  const maxPlayers = readPositiveNumber(metadata.maxPlayers);
  const minAge = readPositiveNumber(metadata.minAge);
  const playtime = formatPlaytimeLabel(readPositiveNumber(metadata.minPlayTime), readPositiveNumber(metadata.maxPlayTime));

  return {
    id: "master-import-preview",
    name: title,
    slug: slugify(title) || "juego",
    status: GameStatus.review,
    title,
    originalTitle: resolved.candidate.originalTitle,
    year: readPositiveNumber(metadata.year),
    players: { min: minPlayers, max: maxPlayers, label: minPlayers && maxPlayers ? `${minPlayers}-${maxPlayers}` : null },
    imageUrl: null,
    coverImageUrl: null,
    coverImageAlt: `Portada de ${title}`,
    imageSourceName: null,
    imageSourceUrl: null,
    imageLicenseNote: null,
    imageStatus: GameImageStatus.missing,
    description: resolved.candidate.extractedDescription,
    review: null,
    shortSummary: normalizeStringValue(metadata.shortDescription),
    shortDescription: normalizeStringValue(metadata.shortDescription),
    quickVerdict: null,
    pros: [],
    cons: [],
    bestFor: null,
    notFor: null,
    minPlayers,
    maxPlayers,
    playtime,
    age: minAge ? `${minAge}+` : null,
    minAge,
    complexity: null,
    difficulty: null,
    categories: normalizeStringArrayValue(metadata.categories || metadata.categoryHints),
    mechanics: normalizeStringArrayValue(metadata.mechanics || metadata.mechanicHints),
    themes: normalizeStringArrayValue(metadata.themes || metadata.themeHints),
    publisher: readString(metadata, ["publisher", "brand", "manufacturer"]),
    spanishPublisher: null,
    similarGames: [],
    faqs: null,
    faq: null,
    seoTitle: null,
    seoDescription: null,
    buyUrl: getBestSourceOfferUrl(metadata),
    ratings: {},
    howToPlayVideos: [],
    sources: buildGameSources(metadata),
    sourceIds: buildGameSourceIds(metadata, resolved.primarySource.id),
    primaryImageId: null,
    imageFallbackAccepted: false,
    createdByAi: false,
    createdAt: now,
    updatedAt: now,
    publishedAt: null
  };
}

async function buildGameCreateData(resolved: ResolvedCandidateData): Promise<Prisma.GameCreateInput> {
  const metadata = normalizeCandidateMetadata(resolved.candidate.metadata);
  const title = resolved.candidate.title;
  const minPlayers = readPositiveNumber(metadata.minPlayers);
  const maxPlayers = readPositiveNumber(metadata.maxPlayers);
  const minAge = readPositiveNumber(metadata.minAge);
  const playtime = formatPlaytimeLabel(readPositiveNumber(metadata.minPlayTime), readPositiveNumber(metadata.maxPlayTime));
  const sourceIds = buildGameSourceIds(metadata, resolved.primarySource.id);
  const categories = normalizeStringArrayValue(metadata.categories || metadata.categoryHints);
  const mechanics = normalizeStringArrayValue(metadata.mechanics || metadata.mechanicHints);
  const themes = normalizeStringArrayValue(metadata.themes || metadata.themeHints);
  const seedCopy = buildEditorialSeedCopy({
    title,
    originalTitle: resolved.candidate.originalTitle,
    publisher: readString(metadata, ["publisher", "brand", "manufacturer"]),
    playersLabel: minPlayers && maxPlayers ? `${minPlayers}-${maxPlayers}` : null,
    playtime,
    minAge,
    categories,
    mechanics,
    themes,
    features: normalizeStringArrayValue(metadata.features),
    descriptionHint: resolved.candidate.extractedDescription
  });
  const description = normalizeStringValue(metadata.description) || resolved.candidate.extractedDescription || seedCopy.description;
  const shortDescription = normalizeStringValue(metadata.shortDescription) || seedCopy.shortDescription;
  const autofill = buildEditorialAutofill({
    title,
    publisher: readString(metadata, ["publisher", "brand", "manufacturer"]),
    description,
    shortDescription,
    quickVerdict: seedCopy.quickVerdict,
    categories,
    mechanics,
    themes,
    players: { min: minPlayers, max: maxPlayers },
    playtime,
    minAge
  });

  return {
    name: title,
    title,
    slug: await ensureUniqueGameSlug(slugify(title) || "juego"),
    status: GameStatus.review,
    originalTitle: resolved.candidate.originalTitle,
    year: readPositiveNumber(metadata.year),
    players: { min: minPlayers, max: maxPlayers, label: minPlayers && maxPlayers ? `${minPlayers}-${maxPlayers}` : null } as Prisma.InputJsonValue,
    minPlayers,
    maxPlayers,
    playtime,
    minAge,
    age: minAge ? `${minAge}+` : null,
    difficulty: autofill.difficulty,
    complexity: autofill.difficulty,
    categories: autofill.categories,
    mechanics: autofill.mechanics,
    themes: autofill.themes.length ? autofill.themes : ["Juegos de mesa"],
    publisher: readString(metadata, ["publisher", "brand", "manufacturer"]),
    shortDescription,
    shortSummary: shortDescription,
    description,
    quickVerdict: seedCopy.quickVerdict,
    review: seedCopy.quickVerdict,
    bestFor: autofill.bestFor,
    notFor: autofill.notFor,
    pros: autofill.pros,
    cons: autofill.cons,
    faq: autofill.faq as unknown as Prisma.InputJsonValue,
    faqs: autofill.faq as unknown as Prisma.InputJsonValue,
    seoTitle: `${title} | MeepleTavern`,
    seoDescription: `${title} en MeepleTavern con datos automáticos contrastados desde varias fuentes.`,
    buyUrl: getBestSourceOfferUrl(metadata),
    sources: buildGameSources(metadata) as Prisma.InputJsonValue,
    sourceIds,
    coverImageUrl: resolved.candidate.candidateImages[0]?.url || null,
    imageUrl: resolved.candidate.candidateImages[0]?.url || null,
    coverImageAlt: `Portada de ${title}`,
    imageStatus: resolved.candidate.candidateImages[0] ? GameImageStatus.needs_review : GameImageStatus.missing,
    imageFallbackAccepted: false,
    createdByAi: Boolean(resolved.aiProposal),
    publishedAt: null
  };
}

function buildGameUpdateData(resolved: ResolvedCandidateData): Prisma.GameUpdateInput {
  const metadata = normalizeCandidateMetadata(resolved.candidate.metadata);
  const minPlayers = readPositiveNumber(metadata.minPlayers);
  const maxPlayers = readPositiveNumber(metadata.maxPlayers);
  const minAge = readPositiveNumber(metadata.minAge);

  return {
    name: resolved.candidate.title,
    title: resolved.candidate.title,
    originalTitle: resolved.candidate.originalTitle,
    year: readPositiveNumber(metadata.year),
    players: { min: minPlayers, max: maxPlayers, label: minPlayers && maxPlayers ? `${minPlayers}-${maxPlayers}` : null } as Prisma.InputJsonValue,
    minPlayers,
    maxPlayers,
    playtime: formatPlaytimeLabel(readPositiveNumber(metadata.minPlayTime), readPositiveNumber(metadata.maxPlayTime)),
    minAge,
    age: minAge ? `${minAge}+` : null,
    categories: normalizeStringArrayValue(metadata.categories || metadata.categoryHints),
    mechanics: normalizeStringArrayValue(metadata.mechanics || metadata.mechanicHints),
    themes: normalizeStringArrayValue(metadata.themes || metadata.themeHints),
    publisher: readString(metadata, ["publisher", "brand", "manufacturer"]),
    shortDescription: normalizeStringValue(metadata.shortDescription),
    shortSummary: normalizeStringValue(metadata.shortDescription),
    description: normalizeStringValue(metadata.description) || resolved.candidate.extractedDescription,
    buyUrl: getBestSourceOfferUrl(metadata),
    sources: buildGameSources(metadata) as Prisma.InputJsonValue,
    sourceIds: buildGameSourceIds(metadata, resolved.primarySource.id),
    createdByAi: Boolean(resolved.aiProposal)
  };
}

function buildAiPromptSources(results: ImportedSourceCandidate[]): AiPromptSource[] {
  return results.map((result, index) => ({
    kind: "imported_source",
    title: `${result.source.name}: ${result.candidate.title}`,
    url: result.candidate.sourceUrl,
    priority: 120 - index,
    score: result.confidence,
    content: buildEvidenceText(result)
  }));
}

function buildEvidenceText(result: ImportedSourceCandidate) {
  const metadata = normalizeCandidateMetadata(result.candidate.metadata);
  return [
    `Fuente: ${result.source.name}`,
    `Titulo: ${result.candidate.title}`,
    result.candidate.extractedDescription ? `Descripcion: ${result.candidate.extractedDescription}` : null,
    metadata.price ? `Precio: ${metadata.price} ${metadata.currency || "EUR"}` : null,
    metadata.availability ? `Disponibilidad: ${metadata.availability}` : null,
    ...normalizeStringArrayValue(metadata.features).map((feature) => `Feature: ${feature}`),
    ...Object.entries(isRecord(metadata.facts) ? metadata.facts : {})
      .filter(([, value]) => typeof value === "string" && value.trim())
      .map(([key, value]) => `${key}: ${value}`)
  ].filter(Boolean).join("\n");
}

function buildSourceMetadataExtras(results: ImportedSourceCandidate[], extra?: Record<string, unknown>) {
  return {
    ...(extra || {}),
    sourceMatches: results.map((result) => ({
      sourceName: result.source.name,
      sourceUrl: result.candidate.sourceUrl,
      matchedBy: result.matchedBy,
      confidence: result.confidence
    })),
    sourceEvidence: buildSourceEvidence(results),
    sourceOffers: buildSourceOfferEvidence(results)
  };
}

function buildSourceEvidence(results: ImportedSourceCandidate[]) {
  return results.map((result) => ({
    sourceId: result.source.id,
    sourceName: result.source.name,
    sourceUrl: result.candidate.sourceUrl,
    title: result.candidate.title,
    matchedBy: result.matchedBy,
    confidence: result.confidence,
    description: result.candidate.extractedDescription,
    metadata: normalizeCandidateMetadata(result.candidate.metadata)
  }));
}

function buildSourceOfferEvidence(results: ImportedSourceCandidate[]) {
  return results
    .map((result) => buildOfferFromImportedCandidate(result))
    .filter((offer): offer is NormalizedStoreOffer => Boolean(offer));
}

function buildOfferFromImportedCandidate(result: ImportedSourceCandidate) {
  return buildStoreOfferInputFromCandidate({
    source: result.source,
    candidate: {
      sourceUrl: result.candidate.sourceUrl,
      title: result.candidate.title,
      originalTitle: result.candidate.originalTitle,
      metadata: result.candidate.metadata
    }
  });
}

function hasOfferData(result: ImportedSourceCandidate) {
  return Boolean(buildOfferFromImportedCandidate(result));
}

function buildGameSources(metadata: Record<string, unknown>) {
  const evidence = Array.isArray(metadata.sourceEvidence) ? metadata.sourceEvidence : [];
  return evidence
    .filter(isRecord)
    .map((entry) => ({
      label: normalizeStringValue(entry.sourceName) || "Fuente",
      url: normalizeStringValue(entry.sourceUrl),
      sourceTitle: normalizeStringValue(entry.title),
      confidence: typeof entry.confidence === "number" ? entry.confidence : null
    }));
}

function buildGameSourceIds(metadata: Record<string, unknown>, fallbackSourceId: string) {
  const evidence = Array.isArray(metadata.sourceEvidence) ? metadata.sourceEvidence : [];
  const ids = evidence
    .filter(isRecord)
    .map((entry) => normalizeStringValue(entry.sourceId))
    .filter((value): value is string => Boolean(value));
  return [...new Set([fallbackSourceId, ...ids])];
}

function getBestSourceOfferUrl(metadata: Record<string, unknown>) {
  const offers = Array.isArray(metadata.sourceOffers) ? metadata.sourceOffers.filter(isRecord) : [];
  const normalized = offers
    .map((offer) => ({
      price: typeof offer.price === "number" ? offer.price : null,
      availability: normalizeStringValue(offer.availability),
      purchaseUrl: normalizeStringValue(offer.purchaseUrl),
      affiliateUrl: normalizeStringValue(offer.affiliateUrl),
      sourceUrl: normalizeStringValue(offer.sourceUrl),
      fetchedAt: new Date()
    }))
    .filter((offer) => offer.purchaseUrl || offer.affiliateUrl || offer.sourceUrl);
  const best = getBestOffer(normalized);
  return best?.affiliateUrl || best?.purchaseUrl || best?.sourceUrl || null;
}

function normalizeRangeValue(value: unknown) {
  if (isRecord(value)) {
    const min = normalizeNumberValue(value.min);
    const max = normalizeNumberValue(value.max);
    return min || max ? { min, max: max || min } : null;
  }

  if (typeof value === "number") {
    return { min: value, max: value };
  }

  if (typeof value !== "string") {
    return null;
  }

  const match = /(\d{1,3})\s*(?:-|–|—|a|to)?\s*(\d{1,3})?/i.exec(value);
  if (!match) {
    return null;
  }

  const min = Number(match[1]);
  const max = Number(match[2] || match[1]);
  return Number.isFinite(min) ? { min, max } : null;
}

function normalizeNumberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.round(value);
  }

  if (typeof value === "string") {
    const match = /\d{1,4}/.exec(value);
    const parsed = match ? Number(match[0]) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  return null;
}

function normalizeStringValue(value: unknown) {
  if (Array.isArray(value)) {
    return normalizeStringValue(value[0]);
  }
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeStringArrayValue(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim()))];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function formatPlaytimeLabel(min: number | null, max: number | null) {
  if (min && max && min !== max) return `${min}-${max} min`;
  if (min || max) return `${min || max} min`;
  return null;
}

async function ensureUniqueGameSlug(baseSlug: string) {
  let slug = baseSlug || "juego";
  let counter = 2;

  while (await prisma.game.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }

  return slug;
}

function createDefaultDeps(): MasterImporterDeps {
  return {
    async listSources() {
      return sourceRepository.list();
    },
    async searchSource(source, title) {
      if (isAmazonSource(source)) {
        return {
          supported: true,
          results: (await searchAmazonProducts(title)).map((product) => ({
            sourceName: "amazon",
            sourceDisplayName: source.name,
            sourceUrl: product.detailPageUrl || buildAmazonCanonicalUrl(product.asin),
            title: product.title,
            normalizedTitle: slugify(product.title),
            price: product.price ?? null,
            currency: product.currency === "EUR" ? "EUR" : product.price ? "EUR" : null,
            availability: product.availability ?? null,
            purchaseUrl: product.detailPageUrl || buildAmazonCanonicalUrl(product.asin),
            publisher: product.manufacturer || product.brand || null,
            imageUrl: product.imageUrl || null,
            imageAllowed: Boolean(product.imageUrl),
            description: product.features?.join(" ") || null,
            minPlayers: null,
            maxPlayers: null,
            minPlayTime: null,
            maxPlayTime: null,
            recommendedAge: null,
            language: null,
            rawData: product,
            fetchedAt: new Date(),
            confidence: titleSimilarity(canonicalGameTitleKey(product.title), canonicalGameTitleKey(title))
          }))
        };
      }

      if (!getStoreSourceConnector(source)) {
        return {
          supported: false,
          results: []
        };
      }

      return {
        supported: true,
        results: await searchGameInSource(source, title)
      };
    },
    async importSourceUrl(source, sourceUrl) {
      if (isAmazonSource(source)) {
        const parsed = parseAmazonInput(sourceUrl);
        if (parsed.asin) {
          const { getAmazonProduct } = await import("@/lib/amazon/amazonPaapiProvider");
          const { mapAmazonProductToCandidate } = await import("@/lib/amazon/mapAmazonProductToCandidate");
          const canonicalUrl = buildAmazonCanonicalUrl(parsed.asin);
          const product = await getAmazonProduct({ asin: parsed.asin, sourceUrl: canonicalUrl });
          const candidate = mapAmazonProductToCandidate({ product, sourceUrl: canonicalUrl });
          return {
            candidate,
            publicImageUrls: product.imageUrl ? [product.imageUrl] : []
          };
        }
      }

      return importSourceProductCandidate({
        source,
        sourceUrl
      });
    },
    async resolveFinalData(input) {
      return resolveWithTavilyAndNova(input);
    },
    async findDuplicates(input) {
      const titles = dedupeStrings([input.title]);
      const candidateMatches = await prisma.gameCandidate.findMany({
        where: {
          OR: [
            ...(input.sourceUrls.length ? [{ sourceUrl: { in: input.sourceUrls } }] : []),
            ...titles.map((title) => ({
              title: {
                equals: title,
                mode: Prisma.QueryMode.insensitive
              }
            }))
          ]
        },
        orderBy: [{ updatedAt: "desc" }]
      });
      const gameMatches = await prisma.game.findMany({
        where: {
          OR: [
            ...titles.map((title) => ({
              title: {
                equals: title,
                mode: Prisma.QueryMode.insensitive
              }
            })),
            ...(input.slugs.length ? [{ slug: { in: input.slugs } }] : [])
          ]
        },
        orderBy: [{ updatedAt: "desc" }]
      });
      const normalizedTitle = slugify(input.title);

      return {
        exactCandidate:
          candidateMatches.find((candidate) => input.sourceUrls.includes(candidate.sourceUrl)) ||
          candidateMatches.find((candidate) => slugify(candidate.title) === normalizedTitle) ||
          null,
        candidateMatches,
        exactGame:
          gameMatches.find((game) => input.slugs.includes(game.slug)) ||
          gameMatches.find((game) => slugify(game.title || game.name) === normalizedTitle) ||
          null,
        gameMatches
      };
    },
    async persistCandidate(input) {
      if (input.dryRun) {
        return null;
      }

      const metadata = normalizeCandidateMetadata({
        ...input.resolved.candidate.metadata,
        qualityScore: calculateCandidateQualityScore({
          candidate: input.resolved.candidate,
          sourceCount: input.resolved.matchedSources.length,
          sourceNames: input.resolved.matchedSources,
          hasOffer: false,
          hasAllowedImage: input.resolved.candidate.candidateImages.length > 0,
          duplicateCount: input.duplicateMatch.candidateMatches.length + input.duplicateMatch.gameMatches.length
        }),
        sourceSummary: input.resolved.matchedSources
      });
      const candidateImages = normalizeCandidateImages(input.resolved.candidate.candidateImages);
      const status = input.duplicateMatch.candidateMatches.length || input.duplicateMatch.gameMatches.length
        ? GameCandidateStatus.needs_review
        : input.resolved.missingFields.length <= 2
          ? GameCandidateStatus.pending
          : GameCandidateStatus.needs_review;

      const persisted = await prisma.$transaction(async (transaction) => {
        const existing = input.duplicateMatch.exactCandidate;
        const targetGameId = existing?.gameId || input.duplicateMatch.exactGame?.id || null;
        const game = targetGameId
          ? await transaction.game.update({
              where: { id: targetGameId },
              data: buildGameUpdateData(input.resolved)
            })
          : await transaction.game.create({
              data: await buildGameCreateData(input.resolved)
            });

        const candidate = existing
          ? await transaction.gameCandidate.update({
              where: { id: existing.id },
              data: {
                title: input.resolved.candidate.title,
                originalTitle: input.resolved.candidate.originalTitle || existing.originalTitle,
                gameId: game.id,
                metadata: mergeMetadata([normalizeCandidateMetadata(existing.metadata), metadata]) as Prisma.InputJsonValue,
                extractedDescription: input.resolved.candidate.extractedDescription || existing.extractedDescription,
                candidateImages: mergeCandidateImages(existing.candidateImages, candidateImages) as unknown as Prisma.InputJsonValue,
                confidence: Math.max(existing.confidence, input.resolved.candidate.confidence),
                status: GameCandidateStatus.converted,
                flags: [...new Set([...existing.flags, ...input.resolved.candidate.flags])]
              }
            })
          : await transaction.gameCandidate.create({
              data: {
                sourceId: input.resolved.primarySource.id,
                sourceUrl: input.resolved.candidate.sourceUrl,
                title: input.resolved.candidate.title,
                originalTitle: input.resolved.candidate.originalTitle,
                gameId: game.id,
                metadata: metadata as Prisma.InputJsonValue,
                extractedDescription: input.resolved.candidate.extractedDescription,
                candidateImages: candidateImages as unknown as Prisma.InputJsonValue,
                confidence: input.resolved.candidate.confidence,
                status: GameCandidateStatus.converted,
                flags: input.resolved.candidate.flags
              }
            });

        await attachMasterImportImages(transaction, {
          gameId: game.id,
          candidateId: candidate.id,
          sourceId: input.resolved.primarySource.id,
          sourceName: input.resolved.primarySource.name,
          sourceUrl: input.resolved.primarySource.baseUrl,
          title: input.resolved.candidate.title,
          images: candidateImages
        });

        return { candidate, game };
      });

      const finalization = await finalizeMasterImportedGame(persisted.game.id);

      if (input.resolved.aiProposal) {
        const aiModule = await import("@/lib/ai/gameWebAutofill");
        await aiModule.saveGameImportProposal({
          gameId: persisted.game.id,
          query: input.resolved.aiSearchQuery || `master:${input.resolved.candidate.title}`,
          rawSearchResults: input.resolved.aiSearchResults || [],
          extractedFields: input.resolved.aiProposal
        }).catch((error) => console.error("master import proposal save failed", error));
      }

      return {
        candidateId: persisted.candidate.id,
        gameId: persisted.game.id,
        action: input.duplicateMatch.exactCandidate || input.duplicateMatch.exactGame ? "updated" : "created",
        status: finalization.status,
        missingFields: finalization.missingFields,
        warnings: finalization.warnings
      };
    },
    async upsertOffer(input) {
      if (input.dryRun || (!input.candidateId && !input.gameId)) {
        const normalized = buildOfferFromImportedCandidate({
          source: input.source,
          candidate: input.candidate,
          publicImageUrls: [],
          matchedBy: "search",
          confidence: input.candidate.confidence || 0
        });

        return {
          action: "skipped",
          offer: normalized
        };
      }

      const result = await upsertStoreOfferRecordDetailed(prisma, {
        source: input.source,
        candidateId: input.candidateId,
        gameId: input.gameId,
        offer: buildOfferFromImportedCandidate({
          source: input.source,
          candidate: input.candidate,
          publicImageUrls: [],
          matchedBy: "search",
          confidence: input.candidate.confidence || 0
        })
      });

      if (!result) {
        return {
          action: "skipped",
          offer: null
        };
      }

      return result;
    }
  };
}

async function attachMasterImportImages(
  transaction: Prisma.TransactionClient,
  input: {
    gameId: string;
    candidateId: string;
    sourceId: string;
    sourceName: string;
    sourceUrl: string;
    title: string;
    images: CandidateImage[];
  }
) {
  const images = input.images.slice(0, 3);
  if (!images.length) {
    return;
  }

  const assets = [];
  for (const [index, image] of images.entries()) {
    const existing = await transaction.mediaAsset.findFirst({
      where: {
        gameId: input.gameId,
        url: image.url
      }
    });

    assets.push(existing || await transaction.mediaAsset.create({
      data: {
        gameId: input.gameId,
        candidateId: input.candidateId,
        sourceId: input.sourceId,
        url: image.url,
        type: index === 0 ? MediaAssetType.cover : mediaAssetTypeFromCandidateImage(image.type),
        status: MediaAssetStatus.approved,
        usage: MediaAssetUsage.public,
        attribution: null
      }
    }));
  }

  const primary = assets[0];
  if (!primary) {
    return;
  }

  await transaction.game.update({
    where: { id: input.gameId },
    data: {
      primaryImageId: primary.id,
      imageFallbackAccepted: false,
      imageStatus: GameImageStatus.verified,
      coverImageUrl: primary.url,
      imageUrl: primary.url,
      coverImageAlt: `Portada de ${input.title}`,
      imageSourceName: input.sourceName,
      imageSourceUrl: input.sourceUrl,
      imageLicenseNote: primary.attribution
    }
  });
}

async function finalizeMasterImportedGame(gameId: string): Promise<{
  status: MasterImportStatus;
  missingFields: string[];
  warnings: string[];
}> {
  const warnings: string[] = [];

  try {
    const { autoApplyGameWebAutofill } = await import("@/lib/ai/gameWebAutofill");
    const result = await autoApplyGameWebAutofill(gameId);
    warnings.push(...result.warnings);
  } catch (error) {
    warnings.push(error instanceof Error ? `IA web no aplicada: ${error.message}` : "IA web no aplicada.");
  }

  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game) {
    return {
      status: "needs_review",
      missingFields: ["game"],
      warnings: dedupeStrings([...warnings, "No se pudo recargar la ficha importada."])
    };
  }

  const validation = validateBeforePublish(game);
  const canPublish = validation.complete;
  await prisma.game.update({
    where: { id: gameId },
    data: {
      status: canPublish ? GameStatus.published : GameStatus.review,
      publishedAt: canPublish ? game.publishedAt || new Date() : null
    }
  });

  return {
    status: canPublish ? "ready_to_publish" : "needs_review",
    missingFields: validation.errors,
    warnings: dedupeStrings([...warnings, ...validation.warnings])
  };
}

function isAmazonSource(source: Pick<Source, "baseUrl" | "name">) {
  return `${source.name} ${source.baseUrl}`.toLowerCase().includes("amazon.");
}

function mediaAssetTypeFromCandidateImage(type: CandidateImage["type"] | undefined) {
  if (type === "box") return MediaAssetType.box;
  if (type === "component") return MediaAssetType.component;
  if (type === "placeholder") return MediaAssetType.placeholder;
  return MediaAssetType.cover;
}

function resolveMode(input: MasterImportInput): MasterImportMode {
  if (input.mode) {
    return input.mode;
  }

  if (input.sourceUrl && input.title) {
    return "mixed";
  }

  return input.sourceUrl ? "url" : "search";
}

function detectSourceFromInput(sources: SourceInfo[], sourceUrl: string, sourceName?: string) {
  if (sourceName) {
    const byName = sources.find((source) => normalizeText(source.name) === normalizeText(sourceName));
    if (byName) {
      return byName;
    }
  }

  const urlHost = hostOf(sourceUrl);
  return sources.find((source) => hostMatches(urlHost, hostOf(source.baseUrl))) || null;
}

function groupImportedCandidates(results: ImportedSourceCandidate[], requestedTitle: string | null) {
  const groups: Array<{ key: string; score: number; results: ImportedSourceCandidate[] }> = [];
  const requestedKey = requestedTitle ? canonicalGameTitleKey(requestedTitle) : null;

  for (const result of results) {
    const normalized = canonicalGameTitleKey(result.candidate.title);
    const groupKey = requestedKey && normalized === requestedKey ? requestedKey : normalized;
    const existing = groups.find((group) => group.key === groupKey || (!requestedKey && titleSimilarity(group.key, groupKey) >= 0.75));
    if (existing) {
      existing.results.push(result);
      existing.score += result.confidence;
      continue;
    }

    groups.push({
      key: groupKey,
      score: result.confidence + (requestedKey ? titleSimilarity(groupKey, requestedKey) : 0),
      results: [result]
    });
  }

  return groups.sort((left, right) => right.score - left.score || right.results.length - left.results.length);
}

function isLikelySameGameResult(requestedTitle: string, result: StoreSourceSearchResult) {
  if (result.confidence < 0.35) {
    return false;
  }

  return assessBaseGameTitleMatch(requestedTitle, result.title).matched;
}

function rankSourceCandidate(result: ImportedSourceCandidate, requestedTitle: string | null) {
  const similarity = requestedTitle ? titleSimilarity(slugify(result.candidate.title), slugify(requestedTitle)) : 1;
  return sourceReliabilityScore(result.source.name) * 2 + result.confidence * 100 + completenessScore(result.candidate) * 10 + similarity * 25;
}

function sourceReliabilityScore(sourceName: string) {
  const normalized = normalizeText(sourceName);

  if (/(asmodee|devir|maldito|fantasy flight|boardgamegeek|bgg|editorial|oficial|distribuid)/i.test(normalized)) {
    return 90;
  }

  if (/(juegos de la mesa redonda|dungeon marvels|dracotienda|mathom|zacatrus)/i.test(normalized)) {
    return 75;
  }

  if (/amazon/i.test(normalized)) {
    return 55;
  }

  return 50;
}

function completenessScore(candidate: NormalizedImportedCandidate) {
  const metadata = normalizeCandidateMetadata(candidate.metadata);
  let score = 0;
  if (candidate.title.trim()) score += 1;
  if (readPositiveNumber(metadata.minPlayers) && readPositiveNumber(metadata.maxPlayers)) score += 1;
  if (readPositiveNumber(metadata.minPlayTime) && readPositiveNumber(metadata.maxPlayTime)) score += 1;
  if (readPositiveNumber(metadata.minAge)) score += 1;
  if (readString(metadata, ["publisher", "brand", "manufacturer"])) score += 1;
  if ((candidate.extractedDescription || "").trim().length >= 60) score += 1;
  return score;
}

function pickDescription(results: ImportedSourceCandidate[]) {
  const descriptions = results
    .map((result) => result.candidate.extractedDescription?.trim() || "")
    .filter((value) => value.length >= 40 && value.length <= 650);

  return descriptions[0] || null;
}

function buildAllowedCandidateImages(results: ImportedSourceCandidate[]) {
  const images: Array<{ url: string; type?: "cover" | "box" | "component" | "placeholder"; sourceUrl?: string }> = [];
  const seen = new Set<string>();

  for (const result of results) {
    for (const url of result.publicImageUrls) {
      if (!url || seen.has(url)) {
        continue;
      }

      seen.add(url);
      const sourceImage = result.candidate.candidateImages.find((image) => image.url === url);
      images.push({
        url,
        type: sourceImage?.type || "cover",
        sourceUrl: sourceImage?.sourceUrl || result.candidate.sourceUrl
      });
    }
  }

  return images;
}

function collectMissingFields(input: {
  title: string;
  minPlayers: number | null;
  maxPlayers: number | null;
  minPlayTime: number | null;
  maxPlayTime: number | null;
  minAge: number | null;
  publisher: string | null;
  description: string | null;
}) {
  const missing: string[] = [];
  if (!input.title.trim()) missing.push("title");
  if (!input.minPlayers || !input.maxPlayers) missing.push("players");
  if (!input.minPlayTime || !input.maxPlayTime) missing.push("playtime");
  if (!input.minAge) missing.push("age");
  if (!input.publisher) missing.push("publisher");
  if (!input.description) missing.push("description");
  return missing;
}

function hasTaxonomyHints(metadata: Prisma.JsonObject) {
  return ["categoryHints", "mechanicHints", "themeHints"].some((key) => Array.isArray(metadata[key]) && metadata[key].length > 0);
}

function deriveMasterImportStatus(score: number, duplicates: DuplicateMatch): MasterImportStatus {
  if (duplicates.exactCandidate) {
    return "update_existing";
  }

  if (duplicates.exactGame) {
    return "update_existing";
  }

  if (duplicates.candidateMatches.length > 1 || duplicates.gameMatches.length > 1) {
    return "duplicate";
  }

  if (score >= 85) {
    return "ready_to_publish";
  }

  if (score >= 60) {
    return "needs_review";
  }

  return "draft";
}

function describeDuplicates(duplicates: DuplicateMatch, fallbackTitle: string) {
  const entries: DuplicateDiagnostic[] = [];

  if (duplicates.exactCandidate) {
    entries.push({
      id: duplicates.exactCandidate.id,
      type: "candidate",
      reason: "sourceUrl",
      title: duplicates.exactCandidate.title
    });
  }

  if (duplicates.exactGame) {
    entries.push({
      id: duplicates.exactGame.id,
      type: "game",
      reason: "slug",
      title: duplicates.exactGame.title || duplicates.exactGame.name || fallbackTitle
    });
  }

  for (const candidate of duplicates.candidateMatches) {
    if (duplicates.exactCandidate?.id === candidate.id) {
      continue;
    }

    entries.push({
      id: candidate.id,
      type: "candidate",
      reason: "normalizedTitle",
      title: candidate.title
    });
  }

  for (const game of duplicates.gameMatches) {
    if (duplicates.exactGame?.id === game.id) {
      continue;
    }

    entries.push({
      id: game.id,
      type: "game",
      reason: "normalizedTitle",
      title: game.title || game.name || fallbackTitle
    });
  }

  return dedupeBy(entries, (entry) => `${entry.type}:${entry.id}:${entry.reason}`);
}

function mergeMetadata(metadataEntries: Record<string, unknown>[], extra?: Record<string, unknown>) {
  const merged: Record<string, unknown> = {};

  for (const entry of metadataEntries) {
    for (const [key, value] of Object.entries(entry)) {
      if (value === null || value === undefined) {
        continue;
      }

      if (Array.isArray(value)) {
        const current = Array.isArray(merged[key]) ? merged[key] as unknown[] : [];
        merged[key] = [...new Set([...current, ...value])];
        continue;
      }

      if (typeof value === "object" && value && !Array.isArray(value)) {
        const current = merged[key] && typeof merged[key] === "object" && !Array.isArray(merged[key]) ? merged[key] as Record<string, unknown> : {};
        merged[key] = {
          ...current,
          ...value
        };
        continue;
      }

      if (!merged[key] || isPreferredScalarValue(value)) {
        merged[key] = value;
      }
    }
  }

  return normalizeCandidateMetadata({
    ...merged,
    ...(extra || {})
  });
}

function mergeCandidateImages(existing: unknown, next: CandidateImage[]) {
  const current = normalizeCandidateImages(existing);
  const merged = [...current];
  const seen = new Set(current.map((image) => image.url));

  for (const image of next) {
    if (seen.has(image.url)) {
      continue;
    }

    seen.add(image.url);
    merged.push(image);
  }

  return merged;
}

function pushImportedResult(results: ImportedSourceCandidate[], seen: Set<string>, result: ImportedSourceCandidate) {
  const key = importedResultKey(result);
  if (seen.has(key)) {
    return;
  }

  seen.add(key);
  results.push(result);
}

function importedResultKey(result: ImportedSourceCandidate) {
  return `${result.source.id}:${result.candidate.sourceUrl}:${slugify(result.candidate.title)}`;
}

function collectOfferEligibleResults(input: {
  allResults: ImportedSourceCandidate[];
  selectedGroup: ImportedSourceCandidate[];
  requestedTitle: string | null;
  resolvedTitle: string | null;
}): OfferEligibleResultCollection {
  const selectedKeys = new Set(input.selectedGroup.map((result) => importedResultKey(result)));
  const requestedTitles = dedupeStrings([input.requestedTitle || "", input.resolvedTitle || ""]);
  const eligible = [...input.selectedGroup];
  const warnings: string[] = [];

  for (const result of input.allResults) {
    if (selectedKeys.has(importedResultKey(result))) {
      continue;
    }

    const match = requestedTitles
      .map((title) => assessBaseGameTitleMatch(title, result.candidate.title))
      .sort((left, right) => right.score - left.score)[0];

    if (match?.matched) {
      eligible.push(result);
      continue;
    }

    if (match?.warn) {
      warnings.push(`[${result.source.name}] Oferta descartada automáticamente: ${result.candidate.title}. ${match.warn}`);
    }
  }

  return {
    results: dedupeBy(eligible, (result) => importedResultKey(result)),
    warnings: dedupeStrings(warnings)
  };
}

function titleSimilarity(left: string, right: string) {
  if (!left || !right) {
    return 0;
  }

  if (left === right) {
    return 1;
  }

  if (left.includes(right) || right.includes(left)) {
    return 0.8;
  }

  const leftTokens = new Set(left.split("-").filter(Boolean));
  const rightTokens = new Set(right.split("-").filter(Boolean));
  const shared = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const total = new Set([...leftTokens, ...rightTokens]).size;

  return total ? shared / total : 0;
}

function canonicalGameTitleKey(value: string) {
  const tokens = slugify(value)
    .split("-")
    .filter((token) => token && !BASE_TITLE_VARIANT_TOKENS.has(token) && !looksLikeCatalogToken(token));

  return tokens.join("-");
}

const BASE_TITLE_VARIANT_TOKENS = new Set([
  "a",
  "al",
  "adultos",
  "akarure",
  "ano",
  "anos",
  "base",
  "board",
  "cartas",
  "castellana",
  "castellano",
  "de",
  "del",
  "disponible",
  "edicion",
  "edad",
  "edition",
  "el",
  "en",
  "espanol",
  "espanola",
  "feuerland",
  "game",
  "games",
  "hasbro",
  "juego",
  "jugador",
  "jugadores",
  "la",
  "las",
  "los",
  "maldito",
  "mesa",
  "minuto",
  "minutos",
  "oficial",
  "partir",
  "preventa",
  "promedio",
  "spanish",
  "spiele",
  "septiembre",
  "the",
  "tiempo",
  "tranjis",
  "devir",
  "asmodee"
]);

const BASE_TITLE_REJECTION_TOKENS = new Set([
  "accesorio",
  "accesorios",
  "architects",
  "booster",
  "bundle",
  "campaign",
  "campana",
  "duel",
  "evolution",
  "expansion",
  "extra",
  "familia",
  "family",
  "funda",
  "fundas",
  "insert",
  "junior",
  "kids",
  "legacy",
  "marine",
  "marinos",
  "mini",
  "mundos",
  "organizer",
  "organizador",
  "pack",
  "playmat",
  "preorder",
  "promo",
  "refill",
  "season",
  "secuela",
  "sleeve",
  "sleeves",
  "spare",
  "storage",
  "upgrade",
  "worlds"
]);

function assessBaseGameTitleMatch(referenceTitle: string, candidateTitle: string) {
  const referenceKey = canonicalGameTitleKey(referenceTitle);
  const candidateKey = canonicalGameTitleKey(candidateTitle);
  const score = titleSimilarity(candidateKey, referenceKey);

  if (!referenceKey || !candidateKey) {
    return {
      matched: false,
      score,
      warn: null
    };
  }

  if (looksLikeNumberedSequel(referenceTitle, candidateTitle)) {
    return {
      matched: false,
      score,
      warn: "Parece una secuela numerada y no se mezcló con el juego base."
    };
  }

  if (referenceKey === candidateKey) {
    return {
      matched: true,
      score: Math.max(score, 0.98),
      warn: null
    };
  }

  const referenceTokens = new Set(referenceKey.split("-").filter(Boolean));
  const candidateTokens = candidateKey.split("-").filter(Boolean);
  const extraTokens = candidateTokens.filter((token) => !referenceTokens.has(token));
  const rejectedToken = extraTokens.find((token) => BASE_TITLE_REJECTION_TOKENS.has(token) || /^\d+$/.test(token));

  if (rejectedToken) {
    return {
      matched: false,
      score,
      warn: "Parece una expansión, secuela o accesorio y no se mezcló con el juego base."
    };
  }

  if (
    candidateTokens.length > referenceTokens.size &&
    candidateTokens.filter((token) => referenceTokens.has(token)).length === referenceTokens.size
  ) {
    if (hasReferenceWithOnlyNoiseSuffix(candidateTokens, [...referenceTokens])) {
      return {
        matched: true,
        score: Math.max(score, 0.9),
        warn: null
      };
    }

    return {
      matched: false,
      score,
      warn: "El título añade términos extra que no parecen una variante segura del juego base."
    };
  }

  return {
    matched: false,
    score,
    warn: score >= 0.55 ? "La coincidencia no fue lo bastante fiable para guardarla como oferta automática." : null
  };
}

function looksLikeCatalogToken(token: string) {
  return /^\d+$/.test(token) || (/\d/.test(token) && /[a-z]/i.test(token)) || /^(?:b0|trg|sku|ref|isbn)\w*/i.test(token);
}

function hasReferenceWithOnlyNoiseSuffix(candidateTokens: string[], referenceTokens: string[]) {
  if (!referenceTokens.length || candidateTokens.length < referenceTokens.length) {
    return false;
  }

  for (let index = 0; index <= candidateTokens.length - referenceTokens.length; index += 1) {
    const slice = candidateTokens.slice(index, index + referenceTokens.length);
    if (slice.join("-") !== referenceTokens.join("-")) {
      continue;
    }

    const suffix = candidateTokens.slice(index + referenceTokens.length);
    if (suffix.every((token) => looksLikeTitleNoiseToken(token))) {
      return true;
    }
  }

  return false;
}

function looksLikeTitleNoiseToken(token: string) {
  return TITLE_NOISE_TOKENS.has(token) || looksLikeCatalogToken(token);
}

const TITLE_NOISE_TOKENS = new Set([
  "a",
  "adultos",
  "board",
  "cartas",
  "cooperativo",
  "de",
  "del",
  "edicion",
  "edition",
  "el",
  "en",
  "espanol",
  "espanola",
  "game",
  "games",
  "juego",
  "juegos",
  "jugador",
  "jugadores",
  "la",
  "las",
  "los",
  "mesa",
  "minutos",
  "para",
  "partir",
  "tiempo",
  "y"
]);

function looksLikeNumberedSequel(referenceTitle: string, candidateTitle: string) {
  const referenceSlug = slugify(referenceTitle);
  const candidateSlug = slugify(candidateTitle);

  if (!referenceSlug || referenceSlug === candidateSlug) {
    return false;
  }

  return new RegExp(`(?:^|-)${escapeRegExp(referenceSlug)}-(?:2|3|4|ii|iii|iv)(?:-|$)`, "i").test(candidateSlug);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hostOf(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return value.trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/+$/, "").toLowerCase();
  }
}

function hostMatches(left: string, right: string) {
  return left === right || left.endsWith(`.${right}`) || right.endsWith(`.${left}`);
}

function cleanTitle(value: string | undefined) {
  return value ? sanitizeImportedTitle(value).trim() : "";
}

function normalizeText(value: string) {
  return value.trim().toLowerCase();
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

function readPositiveNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function isPreferredScalarValue(value: unknown) {
  return typeof value === "number" || typeof value === "boolean" || (typeof value === "string" && value.trim().length > 0);
}

function dedupeStrings(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function dedupeBy<T>(values: T[], key: (value: T) => string) {
  const seen = new Set<string>();
  const output: T[] = [];

  for (const value of values) {
    const nextKey = key(value);
    if (seen.has(nextKey)) {
      continue;
    }

    seen.add(nextKey);
    output.push(value);
  }

  return output;
}
