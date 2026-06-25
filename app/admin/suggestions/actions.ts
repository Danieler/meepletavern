"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { GameSuggestionStatus } from "@prisma/client";

export async function deleteSuggestionAction(formData: FormData): Promise<void> {
  const id = formData.get("id") as string;
  if (!id) {
    throw new Error("Falta el identificador de la sugerencia.");
  }

  await prisma.gameSuggestion.delete({
    where: { id }
  });

  revalidatePath("/admin/suggestions");
}

export async function markSuggestionAction(formData: FormData): Promise<void> {
  const id = formData.get("id") as string;
  const statusStr = formData.get("status") as string;

  if (!id) {
    throw new Error("Falta el identificador de la sugerencia.");
  }

  const validStatuses = Object.values(GameSuggestionStatus);
  if (!statusStr || !validStatuses.includes(statusStr as GameSuggestionStatus)) {
    throw new Error("Estado de sugerencia no válido.");
  }
  const status = statusStr as GameSuggestionStatus;


  await prisma.gameSuggestion.update({
    where: { id },
    data: { status }
  });

  revalidatePath("/admin/suggestions");
}
