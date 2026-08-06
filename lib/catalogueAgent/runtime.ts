import { GameStatus, type Game, type Prisma } from "@prisma/client";
import { z } from "zod";
import { autoApplyGameWebAutofill } from "@/lib/ai/gameWebAutofill";
import { completeGameEditorialFieldsWithBedrock } from "@/lib/ai/completeGameEditorialFieldsWithBedrock";
import { prisma } from "@/lib/prisma";
import { buildSafeEditorialPatch } from "@/lib/games/buildSafeEditorialPatch";
import { canonicalGameTitleKey } from "@/lib/import/titleMatching";
import { prepareMasterImportCandidateDraft } from "@/lib/import/masterImportService";
import { sanitizeEditorialFields } from "@/lib/import/sanitizeEditorialFields";
import { convertCandidateToGame, gameRepository } from "@/lib/editorialRepositories";
import { normalizeCategories, normalizeMechanics } from "@/lib/taxonomy";
import { validateBeforePublish } from "@/lib/validateBeforePublish";
import {
  CATALOGUE_AGENT_PROMPT_VERSION,
  CatalogueAgentOutputError,
  runCatalogueAgent
} from "@/lib/catalogueAgent/catalogueAgent";
import {
  assertCatalogueAgentExternalCallsEnabled,
  CatalogueAgentExternalCallsDisabledError
} from "@/lib/catalogueAgent/config";
import {
  CATALOGUE_AGENT_DEFAULT_MODEL,
  createBedrockCatalogueModelInvoker,
  searchCatalogueCandidatesWithTavily
} from "@/lib/catalogueAgent/external";
import { findCatalogueDuplicate } from "@/lib/catalogueAgent/duplicates";
import {
  CatalogueAgentRunError,
  catalogueAgentSafeTechnicalDetail,
  type CatalogueAgentFailureStage
} from "@/lib/catalogueAgent/errors";
import {
  runCatalogueAgentWorkflow,
  type CatalogueDraftPreparation
} from "@/lib/catalogueAgent/workflow";
import type { CatalogueAgentRequest, CatalogueSelectedCandidate } from "@/lib/catalogueAgent/schemas";

export const CATALOGUE_AGENT_TIMEOUT_MS = 120_000;
export const CATALOGUE_AGENT_IMPORT_TIMEOUT_MS = 30_000;

const activeDraftPreparations = new Map<string, Promise<CatalogueDraftPreparation>>();

export async function runCatalogueAgentRequest(input: CatalogueAgentRequest) {
  const runId = crypto.randomUUID();
  const startedAt = Date.now();
  let stage: CatalogueAgentFailureStage = "setup";
  let modelCalls = 0;
  let tavilySearches = 0;

  try {
    assertCatalogueAgentExternalCallsEnabled();
    const signal = AbortSignal.timeout(CATALOGUE_AGENT_TIMEOUT_MS);
    const invokeModel = createBedrockCatalogueModelInvoker();
    stage = "workflow";

    let durableWriteStarted = false;
    let workflow: Awaited<ReturnType<typeof runCatalogueAgentWorkflow>> | null = null;

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        workflow = await runCatalogueAgentWorkflow(
          input,
          {
            async runAgent(agentInput, options) {
              const run = await runCatalogueAgent(
                agentInput,
                {
                  async invokeModel(modelInput) {
                    stage = "nova";
                    modelCalls += 1;
                    const response = await invokeModel(modelInput);
                    stage = "workflow";
                    return response;
                  },
                  listExistingGames: listExistingGamesForAgent,
                  async searchGameCandidates(searchInput) {
                    stage = "tavily";
                    tavilySearches += 1;
                    const candidates = await searchCatalogueCandidatesWithTavily(searchInput);
                    stage = "workflow";
                    return candidates;
                  }
                },
                options
              );
              stage = "workflow";
              return run;
            },
            findDuplicate: findCatalogueDuplicate,
            async prepareDraft(preparationInput) {
              stage = "import";
              // From this point on a connector may have persisted a Candidate before
              // surfacing an error. Never repeat the whole workflow after this boundary.
              durableWriteStarted = true;
              const importSignal = AbortSignal.any([
                signal,
                AbortSignal.timeout(CATALOGUE_AGENT_IMPORT_TIMEOUT_MS)
              ]);
              const prepared = await prepareDraftOnce(preparationInput.candidate, () =>
                prepareMasterImportCandidateDraft({
                  ...preparationInput,
                  signal: importSignal
                })
              );
              stage = "workflow";
              return prepared;
            },
            async convertAndEnrich(enrichmentInput) {
              stage = "enrichment";
              const enriched = await convertAndEnrichCandidate(enrichmentInput);
              modelCalls += enriched.modelCalls;
              tavilySearches += enriched.tavilySearches;
              stage = "workflow";
              return enriched;
            }
          },
          { signal, runId }
        );
        stage = "workflow";
        break;
      } catch (error) {
        const canRetry = attempt < 2 && !durableWriteStarted && isRetryableAgentError(error);
        if (!canRetry) {
          throw error;
        }

        console.warn("[catalogue-agent] transient workflow failure; retrying", {
          runId,
          attempt,
          stage,
          error: error instanceof Error ? error.name : "UnknownError"
        });
        stage = "workflow";
        await abortableDelay(2_000, signal);
      }
    }

    if (!workflow) {
      throw new Error("El workflow terminó sin resultado.");
    }

    const durationMs = Date.now() - startedAt;

    console.info("[catalogue-agent] run completed", {
      runId: workflow.runId,
      model: process.env.BEDROCK_MODEL_ID?.trim() || CATALOGUE_AGENT_DEFAULT_MODEL,
      promptVersion: CATALOGUE_AGENT_PROMPT_VERSION,
      steps: workflow.steps,
      toolsUsed: workflow.toolsUsed,
      searches: workflow.searches,
      durationMs,
      status: workflow.result.status
    });
    return {
      ...workflow,
      durationMs,
      diagnostics: {
        runId,
        modelCalls,
        tavilySearches,
        durationMs
      }
    };
  } catch (error) {
    const failure = new CatalogueAgentRunError({
      cause: error,
      diagnostics: { runId, stage, modelCalls, tavilySearches }
    });
    console.warn("[catalogue-agent] run failed", {
      runId,
      model: process.env.BEDROCK_MODEL_ID?.trim() || CATALOGUE_AGENT_DEFAULT_MODEL,
      promptVersion: CATALOGUE_AGENT_PROMPT_VERSION,
      durationMs: Date.now() - startedAt,
      status: "failed",
      error: error instanceof Error ? error.name : "UnknownError",
      stage,
      modelCalls,
      tavilySearches,
      reason: error instanceof Error ? error.message.slice(0, 500) : undefined
    });
    throw failure;
  }
}

export type CatalogueCandidateEnrichmentDependencies = {
  convertCandidate(candidateId: string, status: "review"): Promise<{ id: string; slug: string }>;
  autoApplyWeb(
    gameId: string,
    onExternalCall?: (type: "model" | "tavily", count: number) => void
  ): Promise<unknown>;
  getGame(gameId: string): Promise<Game | null>;
  completeEditorial(game: Game): ReturnType<typeof completeGameEditorialFieldsWithBedrock>;
  updateGame(gameId: string, input: Prisma.GameUpdateInput): Promise<unknown>;
  countsEditorialModelCall?: boolean;
};

const defaultEnrichmentDependencies: CatalogueCandidateEnrichmentDependencies = {
  convertCandidate: (candidateId, status) => convertCandidateToGame(candidateId, status),
  async autoApplyWeb(gameId, onExternalCall) {
    assertCatalogueAgentExternalCallsEnabled();
    await autoApplyGameWebAutofill(gameId, { onExternalCall });
  },
  async getGame(gameId) {
    return gameRepository.getEditorById(gameId);
  },
  async completeEditorial(game) {
    assertCatalogueAgentExternalCallsEnabled();
    return completeGameEditorialFieldsWithBedrock(game);
  },
  async updateGame(gameId, input) {
    await gameRepository.update(gameId, input);
  },
  countsEditorialModelCall: true
};

export async function convertAndEnrichCandidate(
  input: {
    candidateId: string;
    request: CatalogueAgentRequest;
    signal: AbortSignal;
  },
  deps: CatalogueCandidateEnrichmentDependencies = defaultEnrichmentDependencies
) {
  throwIfSignalAborted(input.signal);
  const converted = await deps.convertCandidate(input.candidateId, "review");
  let modelCalls = 0;
  let tavilySearches = 0;
  const recordExternalCall = (type: "model" | "tavily", count: number) => {
    if (type === "model") modelCalls += count;
    else tavilySearches += count;
  };
  const partialResult = (reason: string) => ({
    gameId: converted.id,
    gameSlug: converted.slug,
    readyToPublish: false,
    missingFields: [reason],
    modelCalls,
    tavilySearches
  });

  if (input.signal.aborted) {
    return partialResult("El tiempo del agente se agotó después de crear la ficha; revisa manualmente los campos pendientes.");
  }

  try {
    await deps.autoApplyWeb(converted.id, recordExternalCall);
  } catch (error) {
    logPartialEnrichmentFailure("web-autofill", converted.id, error);
  }

  if (input.signal.aborted) {
    return partialResult("El tiempo del agente se agotó durante el autofill web; la ficha quedó guardada en revisión.");
  }

  try {
    const game = await deps.getGame(converted.id);
    if (game) {
      if (deps.countsEditorialModelCall) {
        recordExternalCall("model", 1);
      }
      const completion = sanitizeEditorialFields(await deps.completeEditorial(game));
      const patch = buildSafeEditorialPatch(game, completion, { mode: "prefer_completion" });
      if (patch.appliedFields.length) {
        await deps.updateGame(converted.id, patch.patch);
      }
    } else {
      logPartialEnrichmentFailure("editorial", converted.id, new Error("No se encontró la ficha recién creada."));
    }
  } catch (error) {
    logPartialEnrichmentFailure("editorial", converted.id, error);
  }

  if (input.signal.aborted) {
    return partialResult("El tiempo del agente se agotó durante el enriquecimiento editorial; la ficha quedó guardada en revisión.");
  }

  try {
    const game = await deps.getGame(converted.id);
    if (game) {
      await deps.updateGame(converted.id, {
        categories: normalizeCategories([
          ...game.categories,
          ...(input.request.category ? [input.request.category] : [])
        ]),
        mechanics: normalizeMechanics([
          ...game.mechanics,
          ...(input.request.mechanic ? [input.request.mechanic] : [])
        ]),
        status: GameStatus.review,
        publishedAt: null
      });
    }
  } catch (error) {
    logPartialEnrichmentFailure("taxonomy", converted.id, error);
  }

  try {
    const finalGame = await deps.getGame(converted.id);
    if (!finalGame) {
      return partialResult("No se pudo recargar la ficha para verificar los campos de publicación.");
    }
    const validation = validateBeforePublish(finalGame);
    return {
      gameId: finalGame.id,
      gameSlug: finalGame.slug,
      readyToPublish: validation.valid,
      missingFields: validation.errors,
      modelCalls,
      tavilySearches
    };
  } catch (error) {
    logPartialEnrichmentFailure("validation", converted.id, error);
    return partialResult("No se pudo verificar automáticamente si la ficha está lista para publicar.");
  }
}

export function isRetryableAgentError(error: unknown): boolean {
  if (error instanceof CatalogueAgentExternalCallsDisabledError ||
      error instanceof CatalogueAgentOutputError ||
      error instanceof z.ZodError) {
    return false;
  }

  if (error instanceof Error) {
    if (error.name === "TimeoutError" || error.name === "AbortError") {
      return false;
    }
    if (error.message.startsWith("Falta la configuración")) {
      return false;
    }
  }

  return true;
}

function logPartialEnrichmentFailure(step: string, gameId: string, error: unknown) {
  console.warn("[catalogue-agent] automatic enrichment step failed", {
    step,
    gameId,
    detail: catalogueAgentSafeTechnicalDetail(error)
  });
}

function throwIfSignalAborted(signal: AbortSignal) {
  if (signal.aborted) {
    throw signal.reason instanceof Error
      ? signal.reason
      : new Error("La ejecución del agente excedió el tiempo permitido.");
  }
}

function abortableDelay(durationMs: number, signal: AbortSignal) {
  if (signal.aborted) {
    return Promise.reject(signal.reason);
  }

  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, durationMs);
    const abort = () => {
      clearTimeout(timeout);
      reject(signal.reason);
    };
    signal.addEventListener("abort", abort, { once: true });
  });
}

async function listExistingGamesForAgent() {
  const [games, candidates] = await Promise.all([
    prisma.game.findMany({
      select: {
        id: true,
        title: true,
        name: true,
        categories: true
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 1000
    }),
    prisma.gameCandidate.findMany({
      select: {
        id: true,
        title: true
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 1000
    })
  ]);

  return [
    ...games.map((game) => ({
      id: game.id,
      title: game.title || game.name,
      categories: game.categories
    })),
    ...candidates.map((candidate) => ({
      id: candidate.id,
      title: candidate.title,
      categories: []
    }))
  ];
}

function prepareDraftOnce(
  candidate: CatalogueSelectedCandidate,
  prepare: () => Promise<CatalogueDraftPreparation>
) {
  const key = canonicalGameTitleKey(candidate.title) || candidate.title.trim().toLocaleLowerCase("es");
  const active = activeDraftPreparations.get(key);
  if (active) {
    return active;
  }

  const promise = prepare().finally(() => {
    if (activeDraftPreparations.get(key) === promise) {
      activeDraftPreparations.delete(key);
    }
  });
  activeDraftPreparations.set(key, promise);
  return promise;
}
