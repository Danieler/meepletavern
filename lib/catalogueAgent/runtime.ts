import { prisma } from "@/lib/prisma";
import { canonicalGameTitleKey } from "@/lib/import/titleMatching";
import { prepareMasterImportCandidateDraft } from "@/lib/import/masterImportService";
import {
  CATALOGUE_AGENT_PROMPT_VERSION,
  runCatalogueAgent
} from "@/lib/catalogueAgent/catalogueAgent";
import {
  assertCatalogueAgentExternalCallsEnabled
} from "@/lib/catalogueAgent/config";
import {
  CATALOGUE_AGENT_DEFAULT_MODEL,
  createBedrockCatalogueModelInvoker,
  searchCatalogueCandidatesWithTavily
} from "@/lib/catalogueAgent/external";
import { findCatalogueDuplicate } from "@/lib/catalogueAgent/duplicates";
import {
  CatalogueAgentRunError,
  type CatalogueAgentFailureStage
} from "@/lib/catalogueAgent/errors";
import {
  runCatalogueAgentWorkflow,
  type CatalogueDraftPreparation
} from "@/lib/catalogueAgent/workflow";
import type { CatalogueAgentRequest, CatalogueSelectedCandidate } from "@/lib/catalogueAgent/schemas";

export const CATALOGUE_AGENT_TIMEOUT_MS = 45_000;
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

    const workflow = await runCatalogueAgentWorkflow(
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
          const importSignal = AbortSignal.timeout(CATALOGUE_AGENT_IMPORT_TIMEOUT_MS);
          const prepared = await prepareDraftOnce(preparationInput.candidate, () =>
            prepareMasterImportCandidateDraft({
              ...preparationInput,
              signal: importSignal
            })
          );
          stage = "workflow";
          return prepared;
        }
      },
      { signal, runId }
    );

    console.info("[catalogue-agent] run completed", {
      runId: workflow.runId,
      model: process.env.BEDROCK_MODEL_ID?.trim() || CATALOGUE_AGENT_DEFAULT_MODEL,
      promptVersion: CATALOGUE_AGENT_PROMPT_VERSION,
      steps: workflow.steps,
      toolsUsed: workflow.toolsUsed,
      searches: workflow.searches,
      durationMs: workflow.durationMs,
      status: workflow.result.status
    });
    return {
      ...workflow,
      diagnostics: {
        runId,
        modelCalls,
        tavilySearches,
        durationMs: workflow.durationMs
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

async function listExistingGamesForAgent() {
  const games = await prisma.game.findMany({
    select: {
      id: true,
      title: true,
      name: true,
      categories: true
    },
    orderBy: [{ updatedAt: "desc" }],
    take: 1000
  });

  return games.map((game) => ({
    id: game.id,
    title: game.title || game.name,
    categories: game.categories
  }));
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
