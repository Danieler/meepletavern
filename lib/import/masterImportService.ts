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
import { buildStoreOfferInputFromCandidate, getBestOffer, isUnavailableOfferAvailability, type NormalizedStoreOffer, upsertStoreOfferRecordDetailed } from "@/lib/gameOffers";
import { normalizeCandidateImages, normalizeCandidateMetadata } from "@/lib/editorialMappers";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { normalizeCategories, normalizeMechanics } from "@/lib/taxonomy";
import { sourceRepository } from "@/lib/editorialRepositories";
import { validateBeforePublish } from "@/lib/validateBeforePublish";
import type { AiPromptSource, AiWebProposal } from "@/lib/ai/gameWebAutofill";
import { importSourceProductCandidate } from "@/lib/import/importSourceProduct";
import {
  createImportExecutionContext,
  runTrackedExternalCall,
  type CacheDiagnostic,
  type ExternalCallDiagnostic,
  type ImportExecutionContext
} from "@/lib/import/importExecutionContext";
import {
  buildImageDiagnostics,
  collectImageEvidence,
  imageEvidenceToCandidateImages,
  selectPublicImages,
  type ImageDiagnostics
} from "@/lib/import/imageEvidence";
import {
  buildFieldEvidence,
  fieldDiagnosticsToMetadataPatch,
  resolveFieldEvidence,
  type FieldDiagnostics
} from "@/lib/import/fieldEvidence";
import {
  resolveImportTaxonomy,
  type TaxonomyResolution
} from "@/lib/import/taxonomyResolver";
import type { NormalizedImportedCandidate } from "@/lib/import/importedGame";
import { normalizeDifficultyFromImportedData, normalizeDifficultyFromImportedDataOrNull } from "@/lib/import/difficulty";
import {
  getStoreSourceConnector,
  mapStoreSourceResultToImportCandidate,
  searchGameInSource,
  type StoreSourceSearchResult
} from "@/lib/import/sourceConnectors";
import {
  assessBaseGameTitleMatch,
  canonicalGameTitleKey,
  isSuspiciousEditionVariant,
  titleSimilarity
} from "@/lib/import/titleMatching";

type SourceInfo = Pick<Source, "id" | "name" | "baseUrl">;

const DEFAULT_MASTER_IMPORT_SOURCES = [
  {
    name: "Amazon PA API España",
    baseUrl: "https://www.amazon.es"
  },
  {
    name: "Dungeon Marvels",
    baseUrl: "https://dungeonmarvels.com"
  },
  {
    name: "Juegos de la Mesa Redonda",
    baseUrl: "https://juegosdelamesaredonda.com"
  },
  {
    name: "Mathom",
    baseUrl: "https://mathom.es"
  },
  {
    name: "Dracotienda",
    baseUrl: "https://dracotienda.com"
  },
  {
    name: "Zacatrus",
    baseUrl: "https://zacatrus.es"
  },
  {
    name: "MasQueOca",
    baseUrl: "https://www.masqueoca.com/tienda"
  }
] as const;

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
  imageDiagnostics: ImageDiagnostics;
  fieldDiagnostics: FieldDiagnostics;
  taxonomyDiagnostics: TaxonomyResolution;
  cacheDiagnostics: CacheDiagnostic[];
  externalCallDiagnostics: ExternalCallDiagnostic[];
  costDiagnostics: {
    tavilyUsed: boolean;
    tavilyReason: string | null;
    bedrockUsed: boolean;
    bedrockReason: string | null;
    videoSearchUsed: boolean;
  };
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
  searchSource(source: SourceInfo, title: string, context?: ImportExecutionContext): Promise<SearchSourceOutcome>;
  importSourceUrl(source: SourceInfo, sourceUrl: string, context?: ImportExecutionContext): Promise<{ candidate: NormalizedImportedCandidate; publicImageUrls: string[] }>;
  findDuplicates(input: { title: string; sourceUrls: string[]; slugs: string[] }): Promise<DuplicateMatch>;
  resolveFinalData?(input: {
    resolved: ResolvedCandidateData;
    evidence: ImportedSourceCandidate[];
    requestedTitle: string | null;
    context: ImportExecutionContext;
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
  imageDiagnostics: ImageDiagnostics;
  fieldDiagnostics: FieldDiagnostics;
  taxonomyDiagnostics: TaxonomyResolution;
  aiProposal?: AiWebProposal | null;
  aiSearchQuery?: string | null;
  aiSearchResults?: Prisma.InputJsonValue | null;
  aiAppliedFields?: string[];
};

export function createMasterImportService(overrides: Partial<MasterImporterDeps> = {}) {
  const deps: MasterImporterDeps = {
    ...createDefaultDeps(),
    ...overrides
  };

  return async function importAndEnrichGame(input: MasterImportInput): Promise<MasterImportSummary> {
    const mode = resolveMode(input);
    const context = createImportExecutionContext();
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
        const imported = await deps.importSourceUrl(detectedSource, input.sourceUrl, context);
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

      const sourcesToSearch: SourceInfo[] = [];
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

        sourcesToSearch.push(source);
      }

      await runLimitedConcurrency(sourcesToSearch, getSourceConcurrency(), async (source) => {
        let searchOutcome: SearchSourceOutcome;
        try {
          searchOutcome = await searchSourceWithFallbackQueries({
            deps,
            source,
            requestedTitle: seedTitle,
            context
          });
        } catch (error) {
          const reason = error instanceof Error ? error.message : "La búsqueda falló";
          diagnostics.push({
            sourceName: source.name,
            stage: "search",
            outcome: "failed",
            reason
          });
          failedSources.push({ sourceName: source.name, reason });
          return;
        }

        if (!searchOutcome.supported) {
          diagnostics.push({
            sourceName: source.name,
            stage: "search",
            outcome: "unsupported",
            reason: "La fuente no soporta búsqueda automática por título"
          });
          return;
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
          return;
        }

        let matched = false;
        for (const match of candidateMatches) {
          try {
            const imported = mergeSearchResultEvidenceIntoImported(
              await deps.importSourceUrl(source, match.purchaseUrl || match.sourceUrl, context),
              match
            );
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
      });
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
        requestedTitle: seedTitle || null,
        context
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
        if (!hasOfferData(result)) {
          continue;
        }

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
      ),
      imageDiagnostics: resolved.imageDiagnostics,
      fieldDiagnostics: resolved.fieldDiagnostics,
      taxonomyDiagnostics: resolved.taxonomyDiagnostics,
      cacheDiagnostics: context.cacheDiagnostics,
      externalCallDiagnostics: context.diagnostics,
      costDiagnostics: buildCostDiagnostics(context)
    };
  };
}

export const importAndEnrichGame = createMasterImportService();

export async function listMasterImportSources(): Promise<SourceInfo[]> {
  const existing = await sourceRepository.list();
  const sources: SourceInfo[] = [...existing];

  for (const defaultSource of DEFAULT_MASTER_IMPORT_SOURCES) {
    const defaultHost = hostOf(defaultSource.baseUrl);
    const found = sources.find((source) => hostMatches(hostOf(source.baseUrl), defaultHost));
    if (found) {
      continue;
    }

    const created = await prisma.source.create({
      data: {
        name: defaultSource.name,
        baseUrl: defaultSource.baseUrl
      }
    });
    sources.push(created);
  }

  return sources;
}

export function resolveBestCandidateData(input: {
  results: ImportedSourceCandidate[];
  requestedTitle: string | null;
}): ResolvedCandidateData {
  const sorted = [...input.results].sort((left, right) => rankSourceCandidate(right, input.requestedTitle) - rankSourceCandidate(left, input.requestedTitle));
  const primary = sorted[0];
  const fieldDiagnostics = resolveFieldEvidence(buildFieldEvidence(sorted));
  const fieldPatch = fieldDiagnosticsToMetadataPatch(fieldDiagnostics);
  const mergedTitle = normalizeStringValue(fieldDiagnostics.title?.value) || primary.candidate.title;
  const normalizedTitle = slugify(mergedTitle);
  const mergedMetadata = mergeMetadata(
    sorted.map((result) => normalizeCandidateMetadata(result.candidate.metadata)),
    {
      ...fieldPatch,
      ...buildSourceMetadataExtras(sorted, {
        cleanTitle: mergedTitle,
        normalizedTitle
      })
    }
  );
  const taxonomyDiagnostics = resolveImportTaxonomy({
    requestedTitle: input.requestedTitle || mergedTitle,
    matchedTitles: sorted.map((result) => result.candidate.title),
    descriptions: sorted.map((result) => result.candidate.extractedDescription || "").filter(Boolean),
    facts: sorted.flatMap((result) => {
      const metadata = normalizeCandidateMetadata(result.candidate.metadata);
      const facts = isRecord(metadata.facts) ? metadata.facts : {};
      return Object.entries(facts).map(([key, value]) => `${key}: ${String(value)}`);
    }),
    sourceNames: sorted.map((result) => result.source.name)
  });
  if (taxonomyDiagnostics.categories.length) {
    mergedMetadata.categories = taxonomyDiagnostics.categories;
    mergedMetadata.categoryHints = taxonomyDiagnostics.categories;
  }
  if (taxonomyDiagnostics.mechanics.length) {
    mergedMetadata.mechanics = taxonomyDiagnostics.mechanics;
    mergedMetadata.mechanicHints = taxonomyDiagnostics.mechanics;
  }
  if (taxonomyDiagnostics.themes.length) {
    mergedMetadata.themes = taxonomyDiagnostics.themes;
    mergedMetadata.themeHints = taxonomyDiagnostics.themes;
  }
  mergedMetadata.taxonomyResolution = taxonomyDiagnostics;
  applyImportedDifficultyToMetadata(mergedMetadata, {
    title: mergedTitle,
    originalTitle: primary.candidate.originalTitle,
    description: pickDescription(sorted),
    metadata: mergedMetadata
  });
  const imageEvidence = collectImageEvidence(sorted);
  const selectedImages = selectPublicImages(imageEvidence, 3);
  const imageDiagnostics = buildImageDiagnostics(imageEvidence, selectedImages);
  const candidateImages = imageEvidenceToCandidateImages(selectedImages);
  const warnings = [
    ...(candidateImages.length
    ? []
    : imageEvidence.length
      ? ["Se encontraron imágenes, pero ninguna tenía permiso público reutilizable."]
      : ["No se encontró ninguna imagen reutilizable permitida."]),
    ...taxonomyDiagnostics.warnings.map((warning) => `Taxonomía: ${warning}`)
  ];
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
      metadata: normalizeCandidateMetadata({
        ...mergedMetadata,
        imageEvidence: selectedImages,
        imageDiagnostics,
        fieldDiagnostics,
        taxonomyResolution: taxonomyDiagnostics
      }),
      extractedDescription: pickDescription(sorted),
      candidateImages,
      confidence,
      flags: [...new Set(sorted.flatMap((result) => result.candidate.flags))]
    },
    missingFields,
    matchedSources: dedupeStrings(sorted.map((result) => result.source.name)),
    warnings,
    imageDiagnostics,
    fieldDiagnostics,
    taxonomyDiagnostics
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

export function shouldUseTavilyForMasterImport(
  resolved: ResolvedCandidateData,
  evidence: ImportedSourceCandidate[],
  context: ImportExecutionContext
): { shouldUse: boolean; reason?: string } {
  if (context.tavilyMode === "off") {
    return { shouldUse: false, reason: "Tavily desactivado por configuración." };
  }

  if (context.tavilyMode === "always") {
    return { shouldUse: true, reason: "Tavily activado explícitamente para importación maestra." };
  }

  const reasons = [
    resolved.imageDiagnostics.totalFound > 0 && resolved.imageDiagnostics.publicSafeFound === 0 ? "hay imágenes encontradas pero ninguna es pública segura" : null,
    resolved.missingFields.includes("description") ? "falta una descripción útil" : null,
    resolved.missingFields.includes("players") ? "faltan jugadores" : null,
    resolved.missingFields.includes("age") ? "falta edad" : null,
    resolved.missingFields.includes("playtime") ? "falta duración" : null,
    resolved.missingFields.includes("publisher") ? "falta editorial" : null,
    resolved.candidate.confidence < 0.75 ? "la coincidencia de título tiene baja confianza" : null
  ].filter((reason): reason is string => Boolean(reason));

  if (!reasons.length) {
    return { shouldUse: false };
  }

  return {
    shouldUse: true,
    reason: `Fallback de calidad: ${reasons.join("; ")}.`
  };
}

export function buildMasterImportSearchQueries(title: string) {
  const clean = sanitizeImportedTitle(title).replace(/\s+/g, " ").trim();
  if (!clean) {
    return [];
  }

  const withoutApostrophes = clean
    .replace(/[’‘`´']/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const withoutDecorativePunctuation = clean
    .replace(/[!¡¿?:;,.()[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const withoutAccents = removeDiacritics(clean);
  const baseQueries = dedupeStrings([
    clean,
    withoutApostrophes,
    withoutDecorativePunctuation,
    removeDiacritics(withoutApostrophes),
    withoutAccents,
    ...buildControlledEquivalentSearchQueries(clean)
  ]);
  const needsBoardGameQualifier = !/\b(?:juego de (?:mesa|tablero|cartas|dados)|board game|card game|dice game)\b/i.test(clean);
  const qualifierQueries = needsBoardGameQualifier
    ? baseQueries.flatMap((query) => [`${query} juego de mesa`, `${query} juego de tablero`])
    : [];

  return dedupeStrings([
    ...baseQueries,
    ...qualifierQueries
  ]).slice(0, 12);
}

async function searchSourceWithFallbackQueries(input: {
  deps: MasterImporterDeps;
  source: SourceInfo;
  requestedTitle: string;
  context: ImportExecutionContext;
}): Promise<SearchSourceOutcome> {
  const queries = buildMasterImportSearchQueries(input.requestedTitle);
  const mergedResults: StoreSourceSearchResult[] = [];
  const seenUrls = new Set<string>();
  let supported: boolean | null = null;
  let lastError: unknown = null;

  for (const query of queries) {
    try {
      const outcome = await runTrackedExternalCall(input.context, {
        type: "source_search",
        sourceName: input.source.name,
        reason: `Buscar coincidencias por título en fuente configurada: ${query}`,
        cacheKey: `source-search:${input.source.id}:${canonicalGameTitleKey(query)}`,
        timeoutMs: getSourceTimeoutMs()
      }, () => input.deps.searchSource(input.source, query, input.context));

      supported = outcome.supported;
      if (!outcome.supported) {
        return outcome;
      }

      for (const result of outcome.results.map((entry) => normalizeSearchResultConfidence(input.requestedTitle, entry))) {
        const key = result.purchaseUrl || result.sourceUrl || `${result.sourceName}:${result.title}`;
        if (seenUrls.has(key)) {
          continue;
        }
        seenUrls.add(key);
        mergedResults.push(result);
      }

    } catch (error) {
      lastError = error;
      continue;
    }
  }

  if (supported === null && lastError) {
    throw lastError;
  }

  return {
    supported: supported ?? true,
    results: mergedResults.sort((left, right) => right.confidence - left.confidence || left.title.localeCompare(right.title, "es"))
  };
}

function buildControlledEquivalentSearchQueries(title: string) {
  const queries: string[] = [];
  const replacements: Array<[RegExp, string[]]> = [
    [/\bel juego de dados\b/i, ["The Dice Game", "Dice Game"]],
    [/\bthe dice game\b/i, ["El juego de dados"]],
    [/\bseñor de los anillos\b/i, ["Lord of the Rings", "LOTR"]],
    [/\bsenor de los anillos\b/i, ["Lord of the Rings", "LOTR"]],
    [/\blord of the rings\b/i, ["Señor de los Anillos"]],
    [/\blotr\b/i, ["Señor de los Anillos"]]
  ];

  for (const [pattern, values] of replacements) {
    if (!pattern.test(title)) {
      continue;
    }

    for (const value of values) {
      queries.push(title.replace(pattern, value).replace(/\s+/g, " ").trim());
    }
  }

  return queries;
}

function removeDiacritics(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeSearchResultConfidence(requestedTitle: string, result: StoreSourceSearchResult): StoreSourceSearchResult {
  const match = assessBaseGameTitleMatch(requestedTitle, result.title);
  if (!match.matched) {
    return result;
  }

  return {
    ...result,
    confidence: Math.max(result.confidence, match.score, 0.9)
  };
}

function shouldUseBedrockForMasterImport(
  resolved: ResolvedCandidateData,
  _evidence: ImportedSourceCandidate[],
  context: ImportExecutionContext,
  tavilyWillRun: boolean
): { shouldUse: boolean; reason?: string } {
  if (context.bedrockMode === "off") {
    return { shouldUse: false, reason: "Bedrock desactivado por configuración." };
  }

  if (context.bedrockMode === "always") {
    return { shouldUse: true, reason: "Bedrock activado explícitamente para importación maestra." };
  }

  const metadata = normalizeCandidateMetadata(resolved.candidate.metadata);
  const description = resolved.candidate.extractedDescription || normalizeStringValue(metadata.description);
  const reasons = [
    tavilyWillRun ? "sintetizar resultados de búsqueda de calidad" : null,
    !description || description.length < 120 ? "descripción ausente o débil" : null,
    resolved.missingFields.length ? `hay campos pendientes: ${resolved.missingFields.join(", ")}` : null
  ].filter((reason): reason is string => Boolean(reason));

  if (!reasons.length) {
    return { shouldUse: false };
  }

  return {
    shouldUse: true,
    reason: `Nova requerido para ${reasons.join("; ")}.`
  };
}

async function resolveWithTavilyAndNova(input: {
  resolved: ResolvedCandidateData;
  evidence: ImportedSourceCandidate[];
  requestedTitle: string | null;
  context: ImportExecutionContext;
}): Promise<ResolvedCandidateData> {
  const warnings: string[] = [];
  const game = buildDraftGameForAi(input.resolved);
  const extraSources = buildAiPromptSources(input.evidence);
  const tavilyDecision = shouldUseTavilyForMasterImport(input.resolved, input.evidence, input.context);
  const bedrockDecision = shouldUseBedrockForMasterImport(input.resolved, input.evidence, input.context, tavilyDecision.shouldUse);
  let aiSearchQuery: string | null = null;
  let aiSearchResults: Prisma.InputJsonValue | null = null;
  let proposal: AiWebProposal | null = null;
  let tavilyResults: (import("@/lib/ai/gameWebAutofill").TavilyResult)[] = [];
  let aiModule: Awaited<typeof import("@/lib/ai/gameWebAutofill")> | null = null;

  const loadAiModule = async () => {
    aiModule ||= await import("@/lib/ai/gameWebAutofill");
    return aiModule;
  };

  if (tavilyDecision.shouldUse && process.env.TAVILY_API_KEY?.trim() && input.context.canUseExternalCall("tavily_search", tavilyDecision.reason || "Completar campos críticos ausentes.")) {
    try {
      const autofillModule = await loadAiModule();
      const search = await runTrackedExternalCall(input.context, {
        type: "tavily_search",
        reason: tavilyDecision.reason || "Completar campos críticos ausentes.",
        cacheKey: `tavily:master:${canonicalGameTitleKey(input.requestedTitle || input.resolved.candidate.title)}`
      }, () => autofillModule.searchBoardGameWithTavily(game));
      aiSearchQuery = search.query;
      aiSearchResults = search.results as unknown as Prisma.InputJsonValue;
      tavilyResults = search.results;
    } catch (error) {
      warnings.push(error instanceof Error ? `Tavily falló: ${error.message}` : "Tavily falló.");
    }
  } else if (tavilyDecision.shouldUse && !process.env.TAVILY_API_KEY?.trim()) {
    warnings.push("Tavily no está configurado; se usaron solo fuentes importadas.");
  }

  if (bedrockDecision.shouldUse && input.context.canUseExternalCall("bedrock_extract", bedrockDecision.reason || "Sintetizar evidencia importada.")) {
    try {
      const autofillModule = await loadAiModule();
      proposal = await runTrackedExternalCall(input.context, {
        type: "bedrock_extract",
        reason: bedrockDecision.reason || "Sintetizar evidencia importada.",
        cacheKey: `nova:${hashCompactEvidence(extraSources.map((source) => source.content || "").join("\n\n"))}`
      }, () => autofillModule.extractBoardGameFieldsWithNova({
        game,
        tavilyResults,
        extraSources
      }));
    } catch (error) {
      warnings.push(error instanceof Error ? `Nova falló: ${error.message}` : "Nova falló.");
    }
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
  const categories = normalizeCategories(proposal.categories.value);
  const mechanics = normalizeMechanics(proposal.mechanics.value);
  const resolvedCategories = categories.length ? categories : normalizeCategories(metadata.categories || metadata.categoryHints);
  const resolvedMechanics = mechanics.length ? mechanics : normalizeMechanics(metadata.mechanics || metadata.mechanicHints);
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

  applyImportedDifficultyToMetadata(metadata, {
    title: resolved.candidate.title,
    originalTitle: resolved.candidate.originalTitle,
    metadata,
    description: description || resolved.candidate.extractedDescription,
    categories: resolvedCategories,
    mechanics: resolvedMechanics,
    themes: normalizeStringArrayValue(metadata.themes || metadata.themeHints),
    minAge: age,
    minPlayTime: playTime?.min ?? readPositiveNumber(metadata.minPlayTime),
    maxPlayTime: playTime?.max ?? readPositiveNumber(metadata.maxPlayTime)
  });

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
  const imageEvidence = collectImageEvidence(results);
  const selectedImages = selectPublicImages(imageEvidence, 3);
  const imageDiagnostics = selectedImages.length
    ? buildImageDiagnostics(imageEvidence, selectedImages)
    : resolved.imageDiagnostics;
  const candidateImages = selectedImages.length
    ? imageEvidenceToCandidateImages(selectedImages)
    : resolved.candidate.candidateImages;
  if (selectedImages.length) {
    metadata.imageEvidence = selectedImages;
    metadata.imageDiagnostics = imageDiagnostics;
  }
  applyImportedDifficultyToMetadata(metadata, {
    title: resolved.candidate.title,
    originalTitle: resolved.candidate.originalTitle,
    metadata,
    description: resolved.candidate.extractedDescription
  });

  return {
    ...resolved,
    candidate: {
      ...resolved.candidate,
      metadata,
      candidateImages
    },
    imageDiagnostics,
    matchedSources: dedupeStrings(results.map((result) => result.source.name))
  };
}

function buildDraftGameForAi(resolved: ResolvedCandidateData): Game {
  const metadata = normalizeCandidateMetadata(resolved.candidate.metadata);
  const now = new Date();
  const title = resolved.candidate.title;
  const minPlayers = readPositiveNumber(metadata.minPlayers);
  const maxPlayers = readPositiveNumber(metadata.maxPlayers);
  const minPlayTime = readPositiveNumber(metadata.minPlayTime);
  const maxPlayTime = readPositiveNumber(metadata.maxPlayTime);
  const minAge = readPositiveNumber(metadata.minAge);
  const playtime = formatPlaytimeLabel(minPlayTime, maxPlayTime);
  const categories = normalizeCategories(metadata.categories || metadata.categoryHints);
  const mechanics = normalizeMechanics(metadata.mechanics || metadata.mechanicHints);
  const difficulty = normalizeDifficultyFromImportedData({
    title,
    originalTitle: resolved.candidate.originalTitle,
    metadata,
    description: resolved.candidate.extractedDescription,
    categories,
    mechanics,
    minAge,
    minPlayTime,
    maxPlayTime,
    playtime
  });

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
    complexity: difficulty,
    difficulty,
    categories,
    mechanics,
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
  const minPlayTime = readPositiveNumber(metadata.minPlayTime);
  const maxPlayTime = readPositiveNumber(metadata.maxPlayTime);
  const playtime = formatPlaytimeLabel(minPlayTime, maxPlayTime);
  const sourceIds = buildGameSourceIds(metadata, resolved.primarySource.id);
  const categories = normalizeCategories(metadata.categories || metadata.categoryHints);
  const mechanics = normalizeMechanics(metadata.mechanics || metadata.mechanicHints);
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
  const difficulty = normalizeDifficultyFromImportedData({
    title,
    originalTitle: resolved.candidate.originalTitle,
    metadata,
    description,
    categories,
    mechanics,
    themes,
    minAge,
    minPlayTime,
    maxPlayTime,
    playtime,
    fallback: autofill.difficulty
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
    difficulty,
    complexity: difficulty,
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
  const minPlayTime = readPositiveNumber(metadata.minPlayTime);
  const maxPlayTime = readPositiveNumber(metadata.maxPlayTime);
  const playtime = formatPlaytimeLabel(minPlayTime, maxPlayTime);
  const categories = normalizeCategories(metadata.categories || metadata.categoryHints);
  const mechanics = normalizeMechanics(metadata.mechanics || metadata.mechanicHints);
  const difficulty = normalizeDifficultyFromImportedDataOrNull({
    title: resolved.candidate.title,
    originalTitle: resolved.candidate.originalTitle,
    metadata,
    description: normalizeStringValue(metadata.description) || resolved.candidate.extractedDescription,
    categories,
    mechanics,
    themes: normalizeStringArrayValue(metadata.themes || metadata.themeHints),
    minAge,
    minPlayTime,
    maxPlayTime,
    playtime
  });

  return compactGameUpdateInput({
    name: resolved.candidate.title,
    title: resolved.candidate.title,
    originalTitle: resolved.candidate.originalTitle || undefined,
    year: readPositiveNumber(metadata.year),
    players: minPlayers && maxPlayers
      ? { min: minPlayers, max: maxPlayers, label: `${minPlayers}-${maxPlayers}` } as Prisma.InputJsonValue
      : undefined,
    minPlayers,
    maxPlayers,
    playtime: playtime || undefined,
    minAge,
    age: minAge ? `${minAge}+` : undefined,
    ...(difficulty ? { difficulty, complexity: difficulty } : {}),
    categories: categories.length ? categories : undefined,
    mechanics: mechanics.length ? mechanics : undefined,
    themes: normalizeStringArrayValue(metadata.themes || metadata.themeHints).length
      ? normalizeStringArrayValue(metadata.themes || metadata.themeHints)
      : undefined,
    publisher: readString(metadata, ["publisher", "brand", "manufacturer"]) || undefined,
    shortDescription: normalizeStringValue(metadata.shortDescription) || undefined,
    shortSummary: normalizeStringValue(metadata.shortDescription) || undefined,
    description: normalizeStringValue(metadata.description) || resolved.candidate.extractedDescription || undefined,
    buyUrl: getBestSourceOfferUrl(metadata) || undefined,
    sources: buildGameSources(metadata) as Prisma.InputJsonValue,
    sourceIds: buildGameSourceIds(metadata, resolved.primarySource.id),
    createdByAi: Boolean(resolved.aiProposal)
  });
}

function compactGameUpdateInput(input: Prisma.GameUpdateInput): Prisma.GameUpdateInput {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined && value !== null)
  ) as Prisma.GameUpdateInput;
}

function applyImportedDifficultyToMetadata(
  metadata: Record<string, unknown>,
  input: Omit<Parameters<typeof normalizeDifficultyFromImportedData>[0], "fallback">
) {
  const difficulty = normalizeDifficultyFromImportedData({
    ...input,
    metadata,
    fallback: normalizeStringValue(metadata.difficulty) || normalizeStringValue(metadata.complexity)
  });
  metadata.difficulty = difficulty;
  metadata.complexity = difficulty;
  return difficulty;
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

function mergeSearchResultEvidenceIntoImported(
  imported: { candidate: NormalizedImportedCandidate; publicImageUrls: string[] },
  result: StoreSourceSearchResult
) {
  const metadata = normalizeCandidateMetadata(imported.candidate.metadata);
  const nextMetadata = { ...metadata };
  const detailedUnavailable = isUnavailableOfferAvailability(normalizeStringValue(metadata.availability));
  const searchUnavailable = isUnavailableOfferAvailability(result.availability);
  const canUseSearchCommerce = !detailedUnavailable && !searchUnavailable;

  if (!normalizeStringValue(nextMetadata.availability) && result.availability) {
    nextMetadata.availability = result.availability;
  }

  if (canUseSearchCommerce) {
    if (!readPositiveNumber(nextMetadata.price) && result.price) {
      nextMetadata.price = result.price;
    }
    if (!normalizeStringValue(nextMetadata.currency) && result.currency) {
      nextMetadata.currency = result.currency;
    }
    if (!normalizeStringValue(nextMetadata.purchaseUrl) && (result.purchaseUrl || result.sourceUrl)) {
      nextMetadata.purchaseUrl = result.purchaseUrl || result.sourceUrl;
    }
  }

  return {
    candidate: {
      ...imported.candidate,
      metadata: nextMetadata
    },
    publicImageUrls: dedupeStrings([
      ...imported.publicImageUrls,
      result.imageAllowed && result.imageUrl ? result.imageUrl : ""
    ])
  };
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

function buildCostDiagnostics(context: ImportExecutionContext): MasterImportSummary["costDiagnostics"] {
  const tavily = context.diagnostics.find((entry) => entry.type === "tavily_search" && entry.allowed) ||
    context.diagnostics.find((entry) => entry.type === "tavily_search");
  const bedrock = context.diagnostics.find((entry) => entry.type === "bedrock_extract" && entry.allowed) ||
    context.diagnostics.find((entry) => entry.type === "bedrock_extract");
  const video = context.diagnostics.find((entry) => entry.type === "video_search" && entry.allowed);

  return {
    tavilyUsed: Boolean(tavily?.allowed),
    tavilyReason: tavily?.reason || null,
    bedrockUsed: Boolean(bedrock?.allowed),
    bedrockReason: bedrock?.reason || null,
    videoSearchUsed: Boolean(video)
  };
}

function getSourceTimeoutMs() {
  const parsed = Number.parseInt(process.env.MASTER_IMPORT_SOURCE_TIMEOUT_MS || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 7000;
}

function getSourceConcurrency() {
  const parsed = Number.parseInt(process.env.MASTER_IMPORT_SOURCE_CONCURRENCY || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 3;
}

async function runLimitedConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>
) {
  const limit = Math.max(1, Math.min(concurrency, items.length || 1));
  let nextIndex = 0;
  const workers = Array.from({ length: limit }, async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      await worker(items[currentIndex], currentIndex);
    }
  });

  await Promise.allSettled(workers);
}

function hashCompactEvidence(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16);
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
      return listMasterImportSources();
    },
    async searchSource(source, title, context) {
      if (isAmazonSource(source)) {
        const { mapAmazonProductToCandidate } = await import("@/lib/amazon/mapAmazonProductToCandidate");
        return {
          supported: true,
          results: (await searchAmazonProducts(title)).map((product) => {
            const sourceUrl = product.detailPageUrl || buildAmazonCanonicalUrl(product.asin);
            const candidate = mapAmazonProductToCandidate({ product, sourceUrl });

            return {
              sourceName: "amazon",
              sourceDisplayName: source.name,
              sourceUrl,
              title: candidate.title,
              normalizedTitle: slugify(candidate.title),
              price: product.price ?? null,
              currency: product.currency === "EUR" ? "EUR" : product.price ? "EUR" : null,
              availability: product.availability ?? null,
              purchaseUrl: sourceUrl,
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
              rawData: {
                ...product,
                amazonTitleOriginal: product.title
              },
              fetchedAt: new Date(),
              confidence: scoreAmazonSearchConfidence(title, candidate.title)
            };
          })
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
        results: await searchGameInSource(source, title, context)
      };
    },
    async importSourceUrl(source, sourceUrl, context) {
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
        sourceUrl,
        context
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
          images: candidateImages,
          imageEvidence: readSelectedImageEvidence(metadata)
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
    imageEvidence: Array<{
      url: string;
      sourceId?: string;
      sourceName?: string;
      sourceUrl?: string;
    }>;
  }
) {
  const images = input.images.slice(0, 3);
  if (!images.length) {
    return;
  }

  const existingAssets = await transaction.mediaAsset.findMany({
    where: {
      gameId: input.gameId,
      url: {
        in: images.map((image) => image.url)
      }
    }
  });
  const existingAssetsByUrl = new Map(existingAssets.map((asset) => [asset.url, asset]));
  const evidenceByUrl = new Map(input.imageEvidence.map((entry) => [entry.url, entry]));
  const assets = [];
  for (const [index, image] of images.entries()) {
    const existing = existingAssetsByUrl.get(image.url);
    const evidence = evidenceByUrl.get(image.url);

    assets.push(existing || await transaction.mediaAsset.create({
      data: {
        gameId: input.gameId,
        candidateId: input.candidateId,
        sourceId: evidence?.sourceId || input.sourceId,
        url: image.url,
        type: index === 0 ? MediaAssetType.cover : mediaAssetTypeFromCandidateImage(image.type),
        status: MediaAssetStatus.approved,
        usage: MediaAssetUsage.public,
        attribution: image.attribution || evidence?.sourceName || null
      }
    }));
  }

  const primary = assets[0];
  if (!primary) {
    return;
  }

  const primaryEvidence = evidenceByUrl.get(primary.url);
  await transaction.game.update({
    where: { id: input.gameId },
    data: {
      primaryImageId: primary.id,
      imageFallbackAccepted: false,
      imageStatus: GameImageStatus.verified,
      coverImageUrl: primary.url,
      imageUrl: primary.url,
      coverImageAlt: `Portada de ${input.title}`,
      imageSourceName: primaryEvidence?.sourceName || input.sourceName,
      imageSourceUrl: primaryEvidence?.sourceUrl || input.sourceUrl,
      imageLicenseNote: primary.attribution
    }
  });
}

async function finalizeMasterImportedGame(gameId: string): Promise<{
  status: MasterImportStatus;
  missingFields: string[];
  warnings: string[];
}> {
  const warnings: string[] = ["Autocompletado web posterior desactivado para mantener la importación maestra controlada."];

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

function readSelectedImageEvidence(metadata: Record<string, unknown>) {
  const imageEvidence = Array.isArray(metadata.imageEvidence) ? metadata.imageEvidence : [];

  return imageEvidence
    .filter(isRecord)
    .map((entry) => ({
      url: normalizeStringValue(entry.url) || "",
      sourceId: normalizeStringValue(entry.sourceId) || undefined,
      sourceName: normalizeStringValue(entry.sourceName) || undefined,
      sourceUrl: normalizeStringValue(entry.sourceUrl) || undefined
    }))
    .filter((entry) => entry.url);
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

  if (!assessBaseGameTitleMatch(requestedTitle, result.title).matched) {
    return false;
  }

  if (!isSuspiciousEditionVariant(requestedTitle) && hasSuspiciousVariantEvidence(result)) {
    return false;
  }

  return true;
}

function hasSuspiciousVariantEvidence(result: StoreSourceSearchResult) {
  const rawTitle = isRecord(result.rawData)
    ? normalizeStringValue(result.rawData.amazonTitleOriginal) || normalizeStringValue(result.rawData.title)
    : null;
  const evidence = [
    result.title,
    result.sourceUrl,
    result.purchaseUrl,
    rawTitle
  ].filter((value): value is string => Boolean(value)).join(" ");

  return isSuspiciousEditionVariant(evidence);
}

function rankSourceCandidate(result: ImportedSourceCandidate, requestedTitle: string | null) {
  const similarity = requestedTitle ? titleSimilarity(slugify(result.candidate.title), slugify(requestedTitle)) : 1;
  return sourceReliabilityScore(result.source.name) * 2 + result.confidence * 100 + completenessScore(result.candidate) * 10 + similarity * 25;
}

function sourceReliabilityScore(sourceName: string) {
  const normalized = normalizeText(sourceName);

  if (/(asmodee|devir|maldito|fantasy flight|editorial|oficial|distribuid)/i.test(normalized)) {
    return 90;
  }

  if (/(juegos de la mesa redonda|dungeon marvels|dracotienda|mathom|zacatrus|masqueoca)/i.test(normalized)) {
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

      if (!isPreferredScalarValue(merged[key]) && isPreferredScalarValue(value)) {
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
  const normalizedResult = normalizeImportedResultCommerce(result);
  const key = importedResultKey(normalizedResult);
  if (seen.has(key)) {
    return;
  }

  seen.add(key);
  results.push(normalizedResult);
}

function importedResultKey(result: ImportedSourceCandidate) {
  return `${result.source.id}:${result.candidate.sourceUrl}:${slugify(result.candidate.title)}`;
}

function normalizeImportedResultCommerce(result: ImportedSourceCandidate): ImportedSourceCandidate {
  const metadata = normalizeCandidateMetadata(result.candidate.metadata);
  const availability = normalizeStringValue(metadata.availability);
  if (!isUnavailableOfferAvailability(availability)) {
    return result;
  }

  const rawData = isRecord(metadata.rawData) ? { ...metadata.rawData } : metadata.rawData;
  if (isRecord(rawData)) {
    delete rawData.price;
    delete rawData.currency;
    delete rawData.purchaseUrl;
    delete rawData.affiliateUrl;
  }

  const nextMetadata = { ...metadata };
  delete nextMetadata.price;
  delete nextMetadata.currency;
  delete nextMetadata.purchaseUrl;
  delete nextMetadata.affiliateUrl;
  nextMetadata.rawData = rawData;
  nextMetadata.unavailableOfferIgnored = true;

  return {
    ...result,
    candidate: {
      ...result.candidate,
      metadata: nextMetadata
    }
  };
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

function scoreAmazonSearchConfidence(requestedTitle: string, candidateTitle: string) {
  const requestedKey = canonicalGameTitleKey(requestedTitle);
  const candidateKey = canonicalGameTitleKey(candidateTitle);
  const baseScore = titleSimilarity(candidateKey, requestedKey);

  if (!requestedKey || !candidateKey) {
    return baseScore;
  }

  if (candidateKey.includes(requestedKey) || requestedKey.includes(candidateKey)) {
    return Math.max(baseScore, 0.85);
  }

  return baseScore;
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
