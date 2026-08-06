import test from "node:test";
import assert from "node:assert/strict";
import { runMasterImportBatch } from "@/lib/import/masterImportBatch";
import type { MasterImportBatchEvent } from "@/lib/import/masterImportBatchShared";
import type { MasterImportSummary } from "@/lib/import/masterImportService";

test("runMasterImportBatch emits progress and returns accumulated results", async () => {
  const events: MasterImportBatchEvent[] = [];

  const state = await runMasterImportBatch({
    rawInput: "Azul\nCascadia",
    sources: [],
    importGame: async ({ title }) => buildSummary(title ?? ""),
    onEvent: (event) => {
      events.push(event);
    }
  });

  assert.equal(state.totals?.requested, 2);
  assert.equal(state.totals?.imported, 2);
  assert.equal(state.totals?.failed, 0);
  assert.equal(state.results.length, 2);
  assert.deepEqual(
    events.map((event) => event.type),
    ["start", "item-start", "item-complete", "item-start", "item-complete", "done"]
  );
});

test("runMasterImportBatch muestra un motivo accionable cuando una tienda bloquea la ficha", async () => {
  const state = await runMasterImportBatch({
    rawInput: "Pengoloo",
    sources: [],
    importGame: async () => {
      throw new Error("La ficha original devolvió 403: forbidden");
    }
  });

  assert.equal(state.totals?.failed, 1);
  assert.match(state.error || "", /motivo concreto/i);
  assert.match(state.results[0]?.error || "", /rechazó el acceso/i);
  assert.doesNotMatch(state.results[0]?.error || "", /forbidden/i);
});

function buildSummary(title: string): MasterImportSummary {
  return {
    candidateId: `${title}-candidate`,
    gameId: `${title}-game`,
    title,
    normalizedTitle: title.toLowerCase(),
    status: "ready_to_publish",
    qualityScore: 90,
    matchedSources: ["Fuente"],
    failedSources: [],
    offersCreated: 0,
    offersUpdated: 0,
    bestOffer: null,
    missingFields: [],
    warnings: [],
    possibleDuplicates: [],
    suggestedAction: "review_candidate",
    sourceDiagnostics: [],
    sourcesWithOffers: [],
    sourcesWithoutOffers: [],
    imageDiagnostics: {
      totalFound: 0,
      publicSafeFound: 0,
      rejected: [],
      selectedMainImage: null,
      selectedAdditionalImages: []
    },
    fieldDiagnostics: {},
    taxonomyDiagnostics: {
      categories: [],
      mechanics: [],
      themes: [],
      confidence: 0,
      decisions: [],
      warnings: [],
      needsReview: true
    },
    cacheDiagnostics: [],
    externalCallDiagnostics: [],
    costDiagnostics: {
      tavilyUsed: false,
      tavilyReason: null,
      bedrockUsed: false,
      bedrockReason: null,
      videoSearchUsed: false
    }
  };
}
