"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { gameCandidateRepository } from "@/lib/editorialRepositories";
import { autoCompleteImportedGameWithAi, cleanupImportedCandidate, type ImportedGameResult } from "@/lib/import/importedGame";
import { importSourceProductReview } from "@/lib/import/importSourceProduct";

export type ImportSourceState = {
  error: string | null;
  result: ImportedGameResult | null;
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
