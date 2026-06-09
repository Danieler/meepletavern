"use server";

import { redirect } from "next/navigation";
import { gameCandidateRepository } from "@/lib/editorialRepositories";

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

export async function createConnectorCandidateAction(formData: FormData) {
  const candidate = await gameCandidateRepository.createFromConnector({
    sourceId: formData.get("sourceId"),
    sourceUrl: formData.get("sourceUrl")
  });

  redirect(`/admin/candidates/${candidate.id}`);
}
