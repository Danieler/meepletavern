"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCurrentAppUser } from "@/lib/accountLibrary";

export type SuggestGameState = {
  success?: boolean;
  error?: string;
  message?: string;
};

export async function submitGameSuggestion(
  prevState: SuggestGameState,
  formData: FormData
): Promise<SuggestGameState> {
  try {
    const appUser = await requireCurrentAppUser();

    const name = formData.get("name")?.toString().trim();
    const url = formData.get("url")?.toString().trim();
    const notes = formData.get("notes")?.toString().trim();

    if (!name) {
      return { error: "El nombre del juego es obligatorio." };
    }

    const normalizedName = name.toLowerCase().replace(/\s+/g, " ");

    const existing = await prisma.gameSuggestion.findUnique({
      where: {
        userId_normalizedName: {
          userId: appUser.id,
          normalizedName,
        },
      },
    });

    if (existing) {
      return { error: "Ya has sugerido este juego. Puedes revisarlo en tu perfil." };
    }

    await prisma.gameSuggestion.create({
      data: {
        userId: appUser.id,
        name,
        normalizedName,
        url: url || null,
        notes: notes || null,
      },
    });

    revalidatePath("/admin/suggestions");

    return { success: true, message: "¡Sugerencia enviada correctamente! Gracias por tu aportación." };
  } catch (error) {
    if (error instanceof Error && (error.message.includes("autenticado") || error.message.toLowerCase().includes("session") || error.message.toLowerCase().includes("auth"))) {
      return { error: "unauthenticated" };
    }
    return { error: "Ha ocurrido un error al enviar tu sugerencia." };
  }
}
