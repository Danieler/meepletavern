"use server";

import { GameStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { convertCandidateToGame, gameCandidateRepository, mediaAssetRepository } from "@/lib/editorialRepositories";

export async function rejectCandidateAction(formData: FormData) {
  const id = readId(formData);
  await gameCandidateRepository.reject(id);
  revalidatePath("/admin/candidates");
  revalidatePath(`/admin/candidates/${id}`);
}

export async function convertCandidateAction(formData: FormData) {
  const id = readId(formData);
  const status = formData.get("status") === GameStatus.review ? GameStatus.review : GameStatus.draft;
  const game = await convertCandidateToGame(id, status);

  revalidatePath("/admin/candidates");
  revalidatePath("/admin/games");
  redirect(`/admin/games/${game.id}`);
}

export async function generateAiDraftAction(formData: FormData) {
  const id = readId(formData);
  await gameCandidateRepository.generateAiDraft(id);
  revalidatePath(`/admin/candidates/${id}`);
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
