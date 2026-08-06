import test from "node:test";
import assert from "node:assert/strict";
import type { Game } from "@prisma/client";
import { AIMessage } from "@langchain/core/messages";
import { NextRequest } from "next/server";
import {
  CATALOGUE_AGENT_MAX_MODEL_STEPS,
  CATALOGUE_AGENT_MAX_SEARCHES,
  CatalogueAgentOutputError,
  buildCatalogueSearchQuery,
  runCatalogueAgent,
  type CatalogueAgentModelInvoker
} from "@/lib/catalogueAgent/catalogueAgent";
import {
  CATALOGUE_AGENT_IMPORT_DOMAINS,
  CATALOGUE_AGENT_LLM_MAX_RETRIES,
  catalogueAgentToolChoiceSupport,
  createBedrockCatalogueModelInvoker,
  normalizeTavilyCatalogueResults,
  retryCatalogueTavilySearch,
  searchCatalogueCandidatesWithTavily
} from "@/lib/catalogueAgent/external";
import { runCatalogueAgentWorkflow } from "@/lib/catalogueAgent/workflow";
import { catalogueAgentApiResultSchema } from "@/lib/catalogueAgent/schemas";
import {
  convertAndEnrichCandidate,
  isRetryableAgentError
} from "@/lib/catalogueAgent/runtime";
import { catalogueTitlesAreDuplicates } from "@/lib/catalogueAgent/duplicates";
import { POST as catalogueAgentPost } from "@/app/api/admin/catalogue-agent/route";
import { ADMIN_REQUEST_HEADER, ADMIN_REQUEST_HEADER_VALUE } from "@/lib/adminApiClient";
import {
  createCatalogueImportExecutionContext,
  mergeCatalogueAgentRequestTaxonomy
} from "@/lib/import/masterImportService";

process.env.CATALOGUE_AGENT_EXTERNAL_CALLS_ENABLED = "false";
process.env.MASTER_IMPORT_TAVILY_MODE = "off";
process.env.MASTER_IMPORT_BEDROCK_MODE = "off";
process.env.MASTER_IMPORT_VIDEO_SEARCH_MODE = "off";

const dominion = {
  title: "Dominion",
  sourceUrl: "https://example.com/dominion",
  providerId: "dominion-2008",
  snippet: "Juego de construcción de mazos.",
  score: 0.95
};

const deckbuildingRequest = {
  action: "add_new_game" as const,
  category: "Deckbuilding" as const,
  mechanic: "Deckbuilding" as const
};

test("declara explícitamente el soporte de tool_choice de Amazon Nova", () => {
  assert.deepEqual(
    catalogueAgentToolChoiceSupport("amazon.nova-micro-v1:0"),
    ["auto", "any", "tool"]
  );
  assert.equal(catalogueAgentToolChoiceSupport("modelo-desconocido"), undefined);
  assert.equal(CATALOGUE_AGENT_LLM_MAX_RETRIES, 2);
});

test("traduce Familiar como categoría familiar y no como palabra del título", () => {
  const query = buildCatalogueSearchQuery({
    action: "add_new_game",
    category: "Familiar",
    mechanic: null
  });

  assert.match(query, /family-friendly games suitable for families/i);
  assert.doesNotMatch(query, /\bfamiliar\b/i);
  assert.match(query, /board game juego de mesa/i);
  assert.doesNotMatch(query, /site:/i);

  const mechanicOnly = buildCatalogueSearchQuery({
    action: "add_new_game",
    category: null,
    mechanic: "Colocación de trabajadores"
  });
  const combinedAlternative = buildCatalogueSearchQuery({
    action: "add_new_game",
    category: "Familiar",
    mechanic: "Colocación de trabajadores"
  }, 2);

  assert.match(mechanicOnly, /worker-placement mechanic/i);
  assert.match(combinedAlternative, /family-friendly/i);
  assert.match(combinedAlternative, /worker-placement mechanic/i);
  assert.match(combinedAlternative, /popular/i);
  assert.doesNotMatch(combinedAlternative, /site:/i);
});

test("reintenta Tavily una sola vez y conserva el primer error si ambos intentos fallan", async () => {
  let attempts = 0;
  const recovered = await retryCatalogueTavilySearch(async () => {
    attempts += 1;
    if (attempts === 1) throw new Error("primer fallo");
    return "ok";
  }, new AbortController().signal, 0);

  assert.equal(recovered, "ok");
  assert.equal(attempts, 2);

  const firstError = new Error("fallo original");
  attempts = 0;
  await assert.rejects(
    () => retryCatalogueTavilySearch(async () => {
      attempts += 1;
      throw attempts === 1 ? firstError : new Error("fallo secundario");
    }, new AbortController().signal, 0),
    (error) => error === firstError
  );
  assert.equal(attempts, 2);
});

test("clasifica los errores no transitorios antes de reintentar el workflow", () => {
  const timeout = new Error("tiempo agotado");
  timeout.name = "TimeoutError";

  assert.equal(isRetryableAgentError(new Error("ECONNRESET")), true);
  assert.equal(isRetryableAgentError(new Error("Falta la configuración TAVILY_API_KEY para el agente.")), false);
  assert.equal(isRetryableAgentError(timeout), false);
  assert.equal(isRetryableAgentError(new CatalogueAgentOutputError("salida inválida")), false);
});

test("Tavily queda limitado a dominios que el importador sabe procesar", () => {
  assert.deepEqual(CATALOGUE_AGENT_IMPORT_DOMAINS, [
    "juegosdelamesaredonda.com",
    "dungeonmarvels.com",
    "mathom.es",
    "dracotienda.com",
    "zacatrus.es",
    "masqueoca.com"
  ]);
});

test("el schema de API admite la ficha automatizada y diagnósticos del enriquecimiento", () => {
  const parsed = catalogueAgentApiResultSchema.parse({
    status: "candidate_selected",
    selectedCandidate: { title: "Just One", sourceUrl: "https://zacatrus.es/just-one.html" },
    reason: "Ficha preparada.",
    sources: ["https://zacatrus.es/just-one.html"],
    candidateId: "candidate-1",
    gameId: "game-1",
    gameSlug: "just-one",
    readyToPublish: false,
    missingFields: ["Imagen principal: falta una portada."],
    diagnostics: {
      runId: "44444444-4444-4444-8444-444444444444",
      modelCalls: 6,
      tavilySearches: 7,
      durationMs: 70_000
    }
  });

  assert.equal("gameId" in parsed ? parsed.gameId : null, "game-1");
});

test("descarta resultados Tavily defectuosos sin tumbar toda la ejecución", () => {
  assert.deepEqual(normalizeTavilyCatalogueResults([
    { title: "", url: "sin-url" },
    {
      title: "Aprender español",
      url: "https://example.com/spanish-games",
      content: "No es una tienda compatible.",
      score: 0.99
    },
    {
      title: "Just One",
      url: "https://zacatrus.es/just-one.html",
      content: "Party game cooperativo.",
      rawContent: { unexpected: true },
      score: 1.2
    }
  ]), [{
    title: "Just One",
    sourceUrl: "https://zacatrus.es/just-one.html",
    snippet: "Party game cooperativo.",
    score: 1
  }]);
});

test("conserva la taxonomía importada y añade Party y la mecánica solicitadas", () => {
  const metadata = mergeCatalogueAgentRequestTaxonomy({
    categories: ["Familiar"],
    mechanics: ["Push your luck"]
  }, {
    action: "add_new_game",
    category: "Party",
    mechanic: "Roles ocultos"
  });

  assert.deepEqual(metadata.categories, ["Familiar", "Party"]);
  assert.deepEqual(metadata.categoryHints, ["Familiar", "Party"]);
  assert.deepEqual(metadata.mechanics, ["Push your luck", "Roles ocultos"]);
  assert.deepEqual(metadata.mechanicHints, ["Push your luck", "Roles ocultos"]);
});

test("la fusión de taxonomía ignora filtros nulos sin introducir valores vacíos", () => {
  const metadata = mergeCatalogueAgentRequestTaxonomy({}, {
    action: "add_new_game",
    category: "Familiar",
    mechanic: null
  });

  assert.deepEqual(metadata.categories, ["Familiar"]);
  assert.deepEqual(metadata.categoryHints, ["Familiar"]);
  assert.deepEqual(metadata.mechanics, []);
  assert.deepEqual(metadata.mechanicHints, []);
});

test("la comprobación de duplicados no confunde un juego base con títulos diferentes", () => {
  assert.equal(catalogueTitlesAreDuplicates("Pengoloo", "Pengoloo"), true);
  assert.equal(catalogueTitlesAreDuplicates("Dominion", "Dominion Board Game"), true);
  assert.equal(catalogueTitlesAreDuplicates("Pengoloo", "Pengoloo Junior"), false);
  assert.equal(catalogueTitlesAreDuplicates("Catan", "Catan Starfarers"), false);
});

test("el agente consulta, busca y selecciona un candidato respaldado por evidencia", async () => {
  let searches = 0;
  const toolChoices: string[] = [];
  const invokeModel = scriptedModel([
    toolCall("listExistingGames", {}, "list-1"),
    toolCall("searchGameCandidates", {}, "search-1"),
    selectionCall({
      status: "candidate_selected",
      selectedCandidate: {
        title: dominion.title,
        sourceUrl: dominion.sourceUrl,
        providerId: dominion.providerId
      },
      reason: "Es un referente de construcción de mazos y no aparece en el catálogo.",
      sources: [dominion.sourceUrl]
    })
  ], toolChoices);

  const run = await runCatalogueAgent(
    deckbuildingRequest,
    {
      invokeModel,
      async listExistingGames() {
        return [{ id: "game-1", title: "Azul", categories: ["Abstracto"] }];
      },
      async searchGameCandidates() {
        searches += 1;
        return [dominion];
      }
    }
  );

  assert.equal(run.result.status, "candidate_selected");
  assert.equal(run.result.selectedCandidate?.title, "Dominion");
  assert.equal(searches, 1);
  assert.deepEqual(run.toolsUsed, ["listExistingGames", "searchGameCandidates", "submitCandidateSelection"]);
  assert.deepEqual(toolChoices, ["listExistingGames", "searchGameCandidates", "submitCandidateSelection"]);
});

test("filtra de la evidencia los títulos que ya existen y usa la segunda búsqueda", async () => {
  let modelCalls = 0;
  let searches = 0;
  const run = await runCatalogueAgent(
    deckbuildingRequest,
    {
      invokeModel: scriptedModel([
        toolCall("listExistingGames", {}, "list-1"),
        toolCall("searchGameCandidates", {}, "search-1"),
        toolCall("searchGameCandidates", {}, "search-2")
      ], undefined, () => { modelCalls += 1; }),
      async listExistingGames() {
        return [{ id: "dominion", title: "Dominion", categories: ["Deckbuilding"] }];
      },
      async searchGameCandidates() {
        searches += 1;
        return [dominion];
      }
    }
  );

  assert.equal(run.result.status, "insufficient_evidence");
  assert.match(run.result.reason, /ningún candidato importable/i);
  assert.equal(searches, CATALOGUE_AGENT_MAX_SEARCHES);
  assert.equal(modelCalls, 3);
});

test("reintenta una selección estructurada incompleta sin recurrir a JSON libre", async () => {
  const toolChoices: string[] = [];
  const run = await runCatalogueAgent(
    deckbuildingRequest,
    {
      invokeModel: scriptedModel([
        toolCall("listExistingGames", {}, "list-1"),
        toolCall("searchGameCandidates", {}, "search-1"),
        selectionCall({
          status: "candidate_selected",
          reason: "Falta el candidato.",
          sources: [dominion.sourceUrl]
        }, "invalid-selection"),
        selectionCall({
          status: "candidate_selected",
          selectedCandidate: {
            title: dominion.title,
            sourceUrl: dominion.sourceUrl,
            providerId: dominion.providerId
          },
          reason: "Selección corregida.",
          sources: [dominion.sourceUrl]
        }, "valid-selection")
      ], toolChoices),
      async listExistingGames() { return []; },
      async searchGameCandidates() { return [dominion]; }
    }
  );

  assert.equal(run.result.status, "candidate_selected");
  assert.equal(run.result.selectedCandidate?.title, "Dominion");
  assert.deepEqual(toolChoices, [
    "listExistingGames",
    "searchGameCandidates",
    "submitCandidateSelection",
    "submitCandidateSelection"
  ]);
});

test("una URL de evidencia admite un título web decorado y conserva el título limpio", async () => {
  let receivedQuery = "";
  const sourceUrl = "https://example.com/ticket-to-ride";
  const run = await runCatalogueAgent(
    { action: "add_new_game", category: "Familiar", mechanic: null },
    {
      invokeModel: scriptedModel([
        toolCall("listExistingGames", {}, "list-1"),
        toolCall("searchGameCandidates", {}, "search-1"),
        selectionCall({
          status: "candidate_selected",
          selectedCandidate: { title: "Ticket to Ride" },
          reason: "Es un juego accesible para familias y no aparece en el catálogo.",
          sources: [sourceUrl]
        })
      ]),
      async listExistingGames() { return []; },
      async searchGameCandidates({ query }) {
        receivedQuery = query;
        return [{
          title: "Ticket to Ride | Days of Wonder",
          sourceUrl: `${sourceUrl}/`,
          snippet: "An accessible family board game.",
          score: 0.94
        }];
      }
    }
  );

  assert.match(receivedQuery, /family-friendly/i);
  assert.doesNotMatch(receivedQuery, /\bfamiliar\b/i);
  assert.equal(run.result.status, "candidate_selected");
  assert.equal(run.result.selectedCandidate?.title, "Ticket to Ride");
  assert.equal(run.result.selectedCandidate?.sourceUrl, `${sourceUrl}/`);
});

test("una URL real no respalda un título distinto", async () => {
  const sourceUrl = "https://example.com/familiar-tales";
  const run = await runCatalogueAgent(
    { action: "add_new_game", category: "Familiar", mechanic: null },
    {
      invokeModel: scriptedModel([
        toolCall("listExistingGames", {}, "list-1"),
        toolCall("searchGameCandidates", {}, "search-1"),
        selectionCall({
          status: "candidate_selected",
          selectedCandidate: { title: "A Familiar Find", sourceUrl },
          reason: "Candidato encontrado.",
          sources: [sourceUrl]
        })
      ]),
      async listExistingGames() { return []; },
      async searchGameCandidates() {
        return [{
          title: "Familiar Tales",
          sourceUrl,
          snippet: "A different board game.",
          score: 0.9
        }];
      }
    }
  );

  assert.equal(run.result.status, "insufficient_evidence");
});

for (const differentTitle of [
  "Catan Starfarers",
  "Azul Summer Pavilion",
  "Pandemic Legacy Season 1"
]) {
  test(`no confunde un juego base con ${differentTitle}`, async () => {
    const sourceUrl = `https://example.com/${differentTitle.toLowerCase().replaceAll(" ", "-")}`;
    const baseTitle = differentTitle.split(" ")[0];
    const run = await runCatalogueAgent(
      { action: "add_new_game", category: "Familiar", mechanic: null },
      {
        invokeModel: scriptedModel([
          toolCall("listExistingGames", {}, "list-1"),
          toolCall("searchGameCandidates", {}, "search-1"),
          selectionCall({
            status: "candidate_selected",
            selectedCandidate: { title: baseTitle, sourceUrl },
            reason: "Candidato encontrado.",
            sources: [sourceUrl]
          })
        ]),
        async listExistingGames() { return []; },
        async searchGameCandidates() {
          return [{
            title: differentTitle,
            sourceUrl,
            snippet: "A distinct board game.",
            score: 0.9
          }];
        }
      }
    );

    assert.equal(run.result.status, "insufficient_evidence");
  });
}

test("un juego existente no llega a preparar ni persistir un Candidate", async () => {
  let candidateCreates = 0;
  let gameCreates = 0;
  const run = await runCatalogueAgentWorkflow(
    deckbuildingRequest,
    {
      async runAgent() {
        return {
          result: {
            status: "candidate_selected",
            selectedCandidate: { title: "Dominion", sourceUrl: dominion.sourceUrl },
            reason: "Candidato encontrado.",
            sources: [dominion.sourceUrl]
          },
          steps: 3,
          searches: 1,
          toolsUsed: ["listExistingGames", "searchGameCandidates"]
        };
      },
      async findDuplicate() {
        return { title: "Dominion", kind: "game", reason: "Ya existe en Games." };
      },
      async prepareDraft() {
        candidateCreates += 1;
        return { candidateId: "should-not-exist", title: "Dominion" };
      },
      async convertAndEnrich() {
        gameCreates += 1;
        return {
          gameId: "should-not-exist",
          gameSlug: "dominion",
          readyToPublish: false,
          missingFields: []
        };
      }
    },
    { signal: new AbortController().signal, runId: "duplicate-run" }
  );

  assert.equal(run.result.status, "possible_duplicate");
  assert.equal(run.candidateId, null);
  assert.equal(candidateCreates, 0);
  assert.equal(gameCreates, 0);
});

test("una sospecha de Nova no bloquea Pengoloo: el backend comprueba e inicia la importación", async () => {
  const sourceUrl = "https://example.com/family-friendly-board-games";
  let duplicateChecks = 0;
  let imports = 0;
  let conversions = 0;
  const run = await runCatalogueAgentWorkflow(
    { action: "add_new_game", category: "Familiar", mechanic: null },
    {
      runAgent(input, options) {
        return runCatalogueAgent(
          input,
          {
            invokeModel: scriptedModel([
              toolCall("listExistingGames", {}, "list-1"),
              toolCall("searchGameCandidates", {}, "search-1"),
              selectionCall({
                status: "possible_duplicate",
                selectedCandidate: { title: "Pengoloo", sourceUrl },
                reason: "El modelo cree que puede existir, pero no es la autoridad.",
                sources: [sourceUrl]
              })
            ]),
            async listExistingGames() { return []; },
            async searchGameCandidates() {
              return [{
                title: "25 Family-Friendly Board Games",
                sourceUrl,
                snippet: "Pengoloo is a memory game for children and families.",
                score: 0.91
              }];
            }
          },
          options
        );
      },
      async findDuplicate(candidate) {
        duplicateChecks += 1;
        assert.equal(candidate.title, "Pengoloo");
        return null;
      },
      async prepareDraft({ candidate, request, signal }) {
        imports += 1;
        assert.deepEqual(request, {
          action: "add_new_game",
          category: "Familiar",
          mechanic: null
        });
        assert.equal(signal.aborted, false);
        return { candidateId: "candidate-pengoloo", title: candidate.title };
      },
      async convertAndEnrich({ candidateId, request, signal }) {
        conversions += 1;
        assert.equal(candidateId, "candidate-pengoloo");
        assert.equal(request.category, "Familiar");
        assert.equal(signal.aborted, false);
        return {
          gameId: "game-pengoloo",
          gameSlug: "pengoloo",
          readyToPublish: true,
          missingFields: []
        };
      }
    },
    { signal: new AbortController().signal, runId: "pengoloo-run" }
  );

  assert.equal(duplicateChecks, 1);
  assert.equal(imports, 1);
  assert.equal(conversions, 1);
  assert.equal(run.result.status, "candidate_selected");
  assert.equal(run.candidateId, "candidate-pengoloo");
  assert.equal(run.gameId, "game-pengoloo");
  assert.equal(run.readyToPublish, true);
  assert.match(run.result.reason, /ficha se creó y enriqueció/i);
});

test("una salida inválida repetida termina de forma controlada y no como 502", async () => {
  const run = await runCatalogueAgent(
    { action: "add_new_game", category: "Cooperativo", mechanic: "Cooperativo" },
    {
      invokeModel: scriptedModel(
        Array.from({ length: CATALOGUE_AGENT_MAX_MODEL_STEPS }, () => new AIMessage("esto no es JSON"))
      ),
      async listExistingGames() { return []; },
      async searchGameCandidates() { return []; }
    }
  );

  assert.equal(run.result.status, "limit_reached");
  assert.match(run.result.reason, /selección estructurada/i);
});

test("el agente termina sin otra llamada a Nova tras dos búsquedas vacías", async () => {
  let searches = 0;
  let modelCalls = 0;
  const run = await runCatalogueAgent(
    { action: "add_new_game", category: "Cartas", mechanic: "Gestión de mano" },
    {
      invokeModel: scriptedModel([
        toolCall("listExistingGames", {}, "list-1"),
        toolCall("searchGameCandidates", { query: "juegos de bazas" }, "search-1"),
        toolCall("searchGameCandidates", { query: "trick taking board games" }, "search-2"),
        toolCall("searchGameCandidates", { query: "más juegos de bazas" }, "search-3")
      ], undefined, () => { modelCalls += 1; }),
      async listExistingGames() { return []; },
      async searchGameCandidates() {
        searches += 1;
        return [];
      }
    }
  );

  assert.equal(run.result.status, "insufficient_evidence");
  assert.equal(searches, CATALOGUE_AGENT_MAX_SEARCHES);
  assert.equal(run.searches, CATALOGUE_AGENT_MAX_SEARCHES);
  assert.equal(modelCalls, 3);
});

test("el agente finaliza al alcanzar cuatro pasos de modelo", async () => {
  const responses = Array.from({ length: CATALOGUE_AGENT_MAX_MODEL_STEPS }, (_, index) =>
    toolCall("listExistingGames", {}, `list-${index}`)
  );
  const run = await runCatalogueAgent(
    { action: "add_new_game", category: "Familiar", mechanic: null },
    {
      invokeModel: scriptedModel(responses),
      async listExistingGames() { return []; },
      async searchGameCandidates() { return []; }
    }
  );

  assert.equal(run.result.status, "limit_reached");
  assert.equal(run.steps, CATALOGUE_AGENT_MAX_MODEL_STEPS);
});

test("el workflow convierte el Candidate en una ficha de revisión enriquecida", async () => {
  const writes: Array<{ model: string; aiDraft: boolean }> = [];
  const run = await runCatalogueAgentWorkflow(
    deckbuildingRequest,
    {
      async runAgent() {
        return {
          result: {
            status: "candidate_selected",
            selectedCandidate: { title: "Dominion", sourceUrl: dominion.sourceUrl },
            reason: "La evidencia es suficiente.",
            sources: [dominion.sourceUrl]
          },
          steps: 3,
          searches: 1,
          toolsUsed: ["listExistingGames", "searchGameCandidates"]
        };
      },
      async findDuplicate() { return null; },
      async prepareDraft() {
        writes.push({ model: "GameCandidate", aiDraft: true });
        return { candidateId: "candidate-1", title: "Dominion" };
      },
      async convertAndEnrich() {
        writes.push({ model: "Game", aiDraft: false });
        return {
          gameId: "game-1",
          gameSlug: "dominion",
          readyToPublish: false,
          missingFields: ["Imagen principal: falta una portada."]
        };
      }
    },
    { signal: new AbortController().signal, runId: "candidate-only-run" }
  );

  assert.equal(run.candidateId, "candidate-1");
  assert.equal(run.gameId, "game-1");
  assert.equal(run.gameSlug, "dominion");
  assert.equal(run.readyToPublish, false);
  assert.deepEqual(run.missingFields, ["Imagen principal: falta una portada."]);
  assert.deepEqual(writes, [
    { model: "GameCandidate", aiDraft: true },
    { model: "Game", aiDraft: false }
  ]);
});

test("si falla la conversión automática conserva el Candidate como fallback", async () => {
  const run = await runCatalogueAgentWorkflow(
    deckbuildingRequest,
    {
      async runAgent() {
        return {
          result: {
            status: "candidate_selected",
            selectedCandidate: { title: "Dominion", sourceUrl: dominion.sourceUrl },
            reason: "La evidencia es suficiente.",
            sources: [dominion.sourceUrl]
          },
          steps: 3,
          searches: 1,
          toolsUsed: ["listExistingGames", "searchGameCandidates"]
        };
      },
      async findDuplicate() { return null; },
      async prepareDraft() { return { candidateId: "candidate-fallback", title: "Dominion" }; },
      async convertAndEnrich() { throw new Error("fallo de conversión simulado"); }
    },
    { signal: new AbortController().signal, runId: "candidate-fallback-run" }
  );

  assert.equal(run.candidateId, "candidate-fallback");
  assert.equal(run.gameId, null);
  assert.match(run.result.reason, /continuar manualmente/i);
});

test("una selección sin evidencia termina de forma controlada", async () => {
  const run = await runCatalogueAgent(
    { action: "add_new_game", category: "Narrativo", mechanic: null },
    {
      invokeModel: scriptedModel([
        finalMessage({
          status: "candidate_selected",
          selectedCandidate: { title: "Juego inventado", sourceUrl: "https://example.com/inventado" },
          reason: "Parece adecuado.",
          sources: ["https://example.com/inventado"]
        })
      ]),
      async listExistingGames() { return []; },
      async searchGameCandidates() { return []; }
    }
  );

  assert.equal(run.result.status, "insufficient_evidence");
  assert.equal(run.result.selectedCandidate, undefined);
});

test("la conversión automática continúa sin publicar si fallan los enriquecimientos opcionales", async () => {
  const game = {
    id: "game-party",
    title: "Just One",
    name: "Just One",
    slug: "just-one",
    status: "review",
    publishedAt: null,
    year: 2018,
    players: { min: 3, max: 7 },
    minPlayers: 3,
    maxPlayers: 7,
    playtime: "20 min",
    minAge: 8,
    age: "8+",
    difficulty: "Fácil",
    complexity: "Fácil",
    categories: [],
    mechanics: [],
    themes: [],
    shortDescription: "Juego cooperativo de pistas para grupos.",
    shortSummary: "Juego cooperativo de pistas para grupos.",
    description: null,
    quickVerdict: null,
    review: null,
    bestFor: null,
    notFor: null,
    pros: [],
    cons: [],
    faq: [],
    faqs: [],
    seoTitle: null,
    seoDescription: null,
    primaryImageId: "image-1",
    imageFallbackAccepted: false
  } as unknown as Game;
  let webAttempts = 0;
  let editorialAttempts = 0;

  const result = await convertAndEnrichCandidate({
    candidateId: "candidate-party",
    request: { action: "add_new_game", category: "Party", mechanic: "Roles ocultos" },
    signal: new AbortController().signal
  }, {
    async convertCandidate(candidateId, status) {
      assert.equal(candidateId, "candidate-party");
      assert.equal(status, "review");
      return { id: game.id, slug: game.slug };
    },
    async autoApplyWeb(_gameId, onExternalCall) {
      webAttempts += 1;
      onExternalCall?.("tavily", 4);
      throw new Error("web autofill mock failed");
    },
    async getGame() {
      return game;
    },
    async completeEditorial() {
      editorialAttempts += 1;
      throw new Error("editorial mock failed");
    },
    async updateGame(_gameId, input) {
      if (Array.isArray(input.categories)) {
        game.categories = input.categories.filter((value): value is string => typeof value === "string");
      }
      if (Array.isArray(input.mechanics)) {
        game.mechanics = input.mechanics.filter((value): value is string => typeof value === "string");
      }
      if (typeof input.status === "string") {
        game.status = input.status;
      }
      if (input.publishedAt === null) {
        game.publishedAt = null;
      }
    },
    countsEditorialModelCall: true
  });

  assert.equal(webAttempts, 1);
  assert.equal(editorialAttempts, 1);
  assert.deepEqual(game.categories, ["Party"]);
  assert.deepEqual(game.mechanics, ["Roles ocultos"]);
  assert.equal(game.status, "review");
  assert.equal(game.publishedAt, null);
  assert.equal(result.gameId, "game-party");
  assert.equal(result.readyToPublish, true);
  assert.equal(result.modelCalls, 1);
  assert.equal(result.tavilySearches, 4);
});

test("el modo seguro bloquea Bedrock y Tavily antes de crear clientes o enviar peticiones", async () => {
  assert.throws(
    () => createBedrockCatalogueModelInvoker(),
    /llamadas externas.*deshabilitadas/i
  );
  await assert.rejects(
    () => searchCatalogueCandidatesWithTavily({
      query: "deckbuilding board games",
      signal: new AbortController().signal
    }),
    /llamadas externas.*deshabilitadas/i
  );
});

test("el enriquecimiento candidate-only fuerza Nova, Tavily y vídeo a off aunque el entorno diga always", () => {
  const previous = {
    tavily: process.env.MASTER_IMPORT_TAVILY_MODE,
    bedrock: process.env.MASTER_IMPORT_BEDROCK_MODE,
    video: process.env.MASTER_IMPORT_VIDEO_SEARCH_MODE
  };
  process.env.MASTER_IMPORT_TAVILY_MODE = "always";
  process.env.MASTER_IMPORT_BEDROCK_MODE = "always";
  process.env.MASTER_IMPORT_VIDEO_SEARCH_MODE = "always";

  try {
    const context = createCatalogueImportExecutionContext();
    assert.equal(context.tavilyMode, "off");
    assert.equal(context.bedrockMode, "off");
    assert.equal(context.videoSearchMode, "off");
  } finally {
    process.env.MASTER_IMPORT_TAVILY_MODE = previous.tavily;
    process.env.MASTER_IMPORT_BEDROCK_MODE = previous.bedrock;
    process.env.MASTER_IMPORT_VIDEO_SEARCH_MODE = previous.video;
  }
});

test("el endpoint devuelve un resultado controlado con el modo seguro y no carga el runtime", async () => {
  const response = await catalogueAgentPost(new NextRequest("http://localhost/api/admin/catalogue-agent", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "http://localhost",
      [ADMIN_REQUEST_HEADER]: ADMIN_REQUEST_HEADER_VALUE
    },
    body: JSON.stringify(deckbuildingRequest)
  }));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.status, "external_calls_disabled");
  assert.equal(body.candidateId, null);
});

test("el endpoint rechaza peticiones que no superan la protección admin", async () => {
  const response = await catalogueAgentPost(new NextRequest("http://localhost/api/admin/catalogue-agent", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost" },
    body: JSON.stringify(deckbuildingRequest)
  }));

  assert.equal(response.status, 403);
});

function scriptedModel(
  messages: AIMessage[],
  toolChoices?: string[],
  onInvoke?: () => void
): CatalogueAgentModelInvoker {
  let index = 0;
  return async (input) => {
    onInvoke?.();
    toolChoices?.push(input.toolChoice);
    const message = messages[index];
    index += 1;
    if (!message) throw new Error("El modelo mock no tiene más respuestas.");
    return message;
  };
}

function toolCall(
  name: "listExistingGames" | "searchGameCandidates" | "submitCandidateSelection",
  args: Record<string, unknown>,
  id: string
) {
  return new AIMessage({
    content: "",
    tool_calls: [{ id, name, args, type: "tool_call" }]
  });
}

function selectionCall(value: Record<string, unknown>, id = "selection-1") {
  return toolCall("submitCandidateSelection", value, id);
}

function finalMessage(value: unknown, wrapped = false) {
  const json = JSON.stringify(value);
  return new AIMessage(wrapped ? `<thinking>selección completada</thinking>\n\`\`\`json\n${json}\n\`\`\`` : json);
}
