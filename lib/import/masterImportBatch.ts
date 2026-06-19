import { createMasterImportService, listMasterImportSources, type MasterImportInput, type MasterImportSummary } from "@/lib/import/masterImportService";
import {
  type MasterImportBatchEvent,
  type MasterImportBatchItem,
  initialMasterImportBatchState,
  type MasterImportBatchState,
  type MasterImportSource
} from "@/lib/import/masterImportBatchShared";
import { parseMasterImportTitles } from "@/lib/import/parseMasterImportTitles";

type RunMasterImportBatchInput = {
  rawInput: string;
  onEvent?: (event: MasterImportBatchEvent) => void | Promise<void>;
  importGame?: (input: MasterImportInput) => Promise<MasterImportSummary>;
  sources?: MasterImportSource[];
  listSources?: () => Promise<MasterImportSource[]>;
};

export async function runMasterImportBatch(input: RunMasterImportBatchInput): Promise<MasterImportBatchState> {
  const titles = parseMasterImportTitles(input.rawInput);

  if (!titles.length) {
    return {
      error: "Escribe al menos un juego. Puedes pegar una lista con una línea por juego o un array JSON.",
      message: null,
      results: [],
      totals: null
    };
  }

  const sources = input.sources || (input.listSources ? await input.listSources() : await listMasterImportSources());
  const importGame =
    input.importGame ||
    createMasterImportService({
      listSources: async () => sources
    });

  const results: MasterImportBatchItem[] = [];
  let imported = 0;
  let failed = 0;

  await input.onEvent?.({
    type: "start",
    total: titles.length
  });

  for (const [index, title] of titles.entries()) {
    await input.onEvent?.({
      type: "item-start",
      index,
      total: titles.length,
      title,
      imported,
      failed
    });

    try {
      const summary = await importGame({
        title,
        mode: "search",
        allowCrossSourceSearch: true
      });
      const item = buildSuccessBatchItem(title, summary);
      results.push(item);
      imported += 1;

      await input.onEvent?.({
        type: "item-complete",
        index,
        total: titles.length,
        title,
        imported,
        failed,
        item
      });
    } catch (error) {
      const item = buildFailedBatchItem(title, error);
      results.push(item);
      failed += 1;

      await input.onEvent?.({
        type: "item-complete",
        index,
        total: titles.length,
        title,
        imported,
        failed,
        item
      });
    }
  }

  const state: MasterImportBatchState = {
    error: imported ? null : "No se pudo importar ningún juego del lote.",
    message: imported
      ? `Importación maestra completada: ${imported} juego(s) procesado(s) y ${failed} fallo(s).`
      : null,
    results,
    totals: {
      requested: titles.length,
      imported,
      failed
    }
  };

  await input.onEvent?.({
    type: "done",
    state
  });

  return state;
}

function buildSuccessBatchItem(inputTitle: string, summary: MasterImportSummary): MasterImportBatchItem {
  return {
    inputTitle,
    importedTitle: summary.title,
    status: summary.status,
    candidateId: summary.candidateId,
    gameId: summary.gameId,
    matchedSources: summary.matchedSources,
    offersCreated: summary.offersCreated,
    offersUpdated: summary.offersUpdated,
    sourcesWithOffers: summary.sourcesWithOffers,
    sourcesWithoutOffers: summary.sourcesWithoutOffers,
    failedSources: summary.failedSources,
    sourceDiagnostics: summary.sourceDiagnostics,
    imageDiagnostics: summary.imageDiagnostics,
    fieldDiagnostics: summary.fieldDiagnostics,
    taxonomyDiagnostics: summary.taxonomyDiagnostics,
    cacheDiagnostics: summary.cacheDiagnostics,
    externalCallDiagnostics: summary.externalCallDiagnostics,
    costDiagnostics: summary.costDiagnostics,
    bestOffer: summary.bestOffer,
    warnings: summary.warnings,
    error: null
  };
}

function buildFailedBatchItem(inputTitle: string, error: unknown): MasterImportBatchItem {
  return {
    inputTitle,
    importedTitle: null,
    status: "failed",
    candidateId: null,
    gameId: null,
    matchedSources: [],
    offersCreated: 0,
    offersUpdated: 0,
    sourcesWithOffers: [],
    sourcesWithoutOffers: [],
    failedSources: [],
    sourceDiagnostics: [],
    imageDiagnostics: undefined,
    fieldDiagnostics: undefined,
    taxonomyDiagnostics: undefined,
    cacheDiagnostics: [],
    externalCallDiagnostics: [],
    costDiagnostics: undefined,
    bestOffer: null,
    warnings: [],
    error: error instanceof Error ? error.message : "No se pudo importar este juego."
  };
}
