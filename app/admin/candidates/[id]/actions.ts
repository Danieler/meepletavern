"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { convertCandidateToGame, gameCandidateRepository, mediaAssetRepository } from "@/lib/editorialRepositories";

export type CandidateConversionActionState = {
  error?: string;
};

export async function rejectCandidateAction(formData: FormData) {
  const id = readId(formData);
  await gameCandidateRepository.reject(id);
  revalidatePath("/admin/candidates");
  revalidatePath(`/admin/candidates/${id}`);
}

export async function deleteCandidateAction(formData: FormData) {
  const id = readId(formData);
  const returnTo = readOptionalString(formData, "returnTo") || "/admin/candidates";
  await gameCandidateRepository.delete(id);
  revalidatePath("/admin/candidates");
  redirect(returnTo);
}

export async function deleteCandidatesBulkAction(formData: FormData) {
  const ids = readStringList(formData, "ids");
  const returnTo = readOptionalString(formData, "returnTo") || "/admin/candidates";

  if (!ids.length) {
    throw new Error("Selecciona al menos un candidato.");
  }

  for (const id of ids) {
    await gameCandidateRepository.delete(id);
  }

  revalidatePath("/admin/candidates");
  redirect(returnTo);
}

export async function convertCandidateAction(
  _state: CandidateConversionActionState,
  formData: FormData
): Promise<CandidateConversionActionState> {
  let id: string;
  let gameId: string;

  try {
    id = readId(formData);
    const game = await convertCandidateToGame(id, "review");
    gameId = game.id;
  } catch (error) {
    return {
      error: candidateConversionErrorMessage(error)
    };
  }

  revalidatePath("/admin/candidates");
  revalidatePath("/admin/games");
  redirect(`/admin/games/${gameId}`);
}

function candidateConversionErrorMessage(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return "Ya existe una ficha con el mismo título o identificador URL.";
  }

  if (error instanceof Error && [
    "No existe ese candidato.",
    "El candidato ya está convertido."
  ].includes(error.message)) {
    return error.message;
  }

  return "No se pudo crear la ficha desde el candidato. Inténtalo de nuevo o revisa los datos importados.";
}

export async function createMediaFromCandidateImageAction(formData: FormData) {
  const id = readId(formData);
  const imageUrl = readString(formData, "imageUrl", "Falta la URL de imagen.");
  await mediaAssetRepository.createFromCandidateImage(id, imageUrl, formData.get("type"));
  revalidatePath(`/admin/candidates/${id}`);
}

export async function updateMediaAssetAction(formData: FormData) {
  const candidateId = readId(formData);
  const mediaAssetId = readString(formData, "mediaAssetId", "Falta el identificador del asset.");

  await mediaAssetRepository.updateEditorial(mediaAssetId, {
    status: formData.get("status"),
    usage: formData.get("usage"),
    type: formData.get("type"),
    attribution: formData.get("attribution"),
    localPath: formData.get("localPath"),
    gameId: formData.get("gameId"),
    candidateId: formData.get("candidateId"),
    sourceId: formData.get("sourceId")
  });

  revalidatePath(`/admin/candidates/${candidateId}`);
}

function readId(formData: FormData) {
  return readString(formData, "id", "Falta el identificador del candidato.");
}

function readString(formData: FormData, key: string, message: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || !value.trim()) {
    throw new Error(message);
  }

  return value.trim();
}

function readOptionalString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function readStringList(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);
}
