"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { gameCandidateRepository } from "@/lib/editorialRepositories";
import { importAndEnrichGame, type MasterImportSummary } from "@/lib/import/masterImportService";
import { parseMasterImportTitles } from "@/lib/import/parseMasterImportTitles";
import { autoCompleteImportedGameWithAi, cleanupImportedCandidate, type ImportedGameResult } from "@/lib/import/importedGame";
import { importSourceProductReview } from "@/lib/import/importSourceProduct";

export type ImportSourceState = {
  error: string | null;
  result: ImportedGameResult | null;
};

export type MasterImportBatchItem = {
  inputTitle: string;
  importedTitle: string | null;
  status: "ready_to_publish" | "needs_review" | "draft" | "update_existing" | "duplicate" | "failed";
  candidateId: string | null;
  gameId: string | null;
  matchedSources: string[];
  offersCreated: number;
  offersUpdated: number;
  sourcesWithOffers: string[];
  sourcesWithoutOffers: string[];
  failedSources: MasterImportSummary["failedSources"];
  sourceDiagnostics: MasterImportSummary["sourceDiagnostics"];
  bestOffer: MasterImportSummary["bestOffer"];
  warnings: string[];
  error: string | null;
};

export type MasterImportBatchState = {
  error: string | null;
  message: string | null;
  results: MasterImportBatchItem[];
  totals: {
    requested: number;
    imported: number;
    failed: number;
  } | null;
};

export async function importSourceAction(_state: ImportSourceState, formData: FormData): Promise<ImportSourceState> {
  try {
    const imported = await importSourceProductReview({
      sourceId: formData.get("sourceId"),
      sourceInput: formData.get("sourceInput")
    });
    const result = await autoCompleteImportedGameWithAi(imported);
    await cleanupImportedCandidate(imported.candidateId);

    revalidatePath("/admin/import");
    revalidatePath("/admin/games");
    revalidatePath("/admin/candidates");

    return {
      error: null,
      result
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "No se pudo importar el juego.",
      result: null
    };
  }
}

export async function importSourceAndOpenGameAction(formData: FormData) {
  let result: ImportedGameResult;

  try {
    const imported = await importSourceProductReview({
      sourceId: formData.get("sourceId"),
      sourceInput: formData.get("sourceInput")
    });
    result = await autoCompleteImportedGameWithAi(imported);
    await cleanupImportedCandidate(imported.candidateId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo importar el juego.";
    const sourceId = typeof formData.get("sourceId") === "string" ? String(formData.get("sourceId")) : "";
    const params = new URLSearchParams({
      error: message
    });

    if (sourceId) {
      params.set("sourceId", sourceId);
    }

    redirect(`/admin/import?${params.toString()}`);
  }

  revalidatePath("/admin/import");
  revalidatePath("/admin/games");
  revalidatePath("/admin/candidates");
  redirect(`/admin/games/${result.gameId}?imported=1`);
}

const initialMasterImportState: MasterImportBatchState = {
  error: null,
  message: null,
  results: [],
  totals: null
};

export async function importMasterGamesAction(
  _state: MasterImportBatchState = initialMasterImportState,
  formData: FormData
): Promise<MasterImportBatchState> {
  const titlesEntry = formData.get("titles");
  const rawInput = typeof titlesEntry === "string" ? titlesEntry : "";
  const titles = parseMasterImportTitles(rawInput);

  if (!titles.length) {
    return {
      error: "Escribe al menos un juego. Puedes pegar una lista con una línea por juego o un array JSON.",
      message: null,
      results: [],
      totals: null
    };
  }

  const results: MasterImportBatchItem[] = [];

  for (const title of titles) {
    try {
      const summary = await importAndEnrichGame({
        title,
        mode: "search",
        allowCrossSourceSearch: true
      });

      results.push({
        inputTitle: title,
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
        bestOffer: summary.bestOffer,
        warnings: summary.warnings,
        error: null
      });
    } catch (error) {
      results.push({
        inputTitle: title,
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
        bestOffer: null,
        warnings: [],
        error: error instanceof Error ? error.message : "No se pudo importar este juego."
      });
    }
  }

  revalidatePath("/admin/import");
  revalidatePath("/admin/candidates");

  const imported = results.filter((result) => result.status !== "failed").length;
  const failed = results.length - imported;

  return {
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
}

export async function createManualCandidateAction(formData: FormData) {
  const candidate = await gameCandidateRepository.create({
    sourceId: formData.get("sourceId"),
    sourceUrl: formData.get("sourceUrl"),
    title: formData.get("title"),
    originalTitle: formData.get("originalTitle"),
    year: formData.get("year"),
    minPlayers: formData.get("minPlayers"),
    maxPlayers: formData.get("maxPlayers"),
    minAge: formData.get("minAge"),
    minPlayTime: formData.get("minPlayTime"),
    maxPlayTime: formData.get("maxPlayTime"),
    publisher: formData.get("publisher"),
    candidateImageUrl: formData.get("candidateImageUrl")
  });

  redirect(`/admin/candidates/${candidate.id}`);
}
