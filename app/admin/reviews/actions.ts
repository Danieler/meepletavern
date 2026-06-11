"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { createReview, deleteReview, updateReview } from "@/lib/reviews";

export type AdminReviewActionState = {
  error?: string;
  message?: string;
};

export async function createAdminReviewAction(
  _state: AdminReviewActionState,
  formData: FormData
): Promise<AdminReviewActionState> {
  try {
    const review = await createReview({
      gameId: requiredString(formData.get("gameId"), "Selecciona un juego."),
      authorName: requiredString(formData.get("authorName"), "Indica el autor visible."),
      title: requiredString(formData.get("title"), "El título es obligatorio."),
      summary: requiredString(formData.get("summary"), "El resumen es obligatorio."),
      body: requiredString(formData.get("body"), "La reseña es obligatoria."),
      createdByAdmin: true
    });

    revalidateReviews(review.slug, review.game.slug);
    redirect(`/admin/reviews/${review.id}`);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No se pudo crear la reseña." };
  }
}

export async function updateAdminReviewAction(
  _state: AdminReviewActionState,
  formData: FormData
): Promise<AdminReviewActionState> {
  const id = requiredString(formData.get("id"), "Falta el identificador de la reseña.");

  try {
    const review = await updateReview(id, {
      gameId: requiredString(formData.get("gameId"), "Selecciona un juego."),
      authorName: requiredString(formData.get("authorName"), "Indica el autor visible."),
      title: requiredString(formData.get("title"), "El título es obligatorio."),
      summary: requiredString(formData.get("summary"), "El resumen es obligatorio."),
      body: requiredString(formData.get("body"), "La reseña es obligatoria.")
    });

    revalidateReviews(review.slug, review.game.slug);
    return { message: "Reseña guardada." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No se pudo guardar la reseña." };
  }
}

export async function deleteReviewsBulkAction(formData: FormData) {
  const ids = readStringList(formData, "ids");
  const returnTo = optionalString(formData.get("returnTo")) || "/admin/reviews";

  if (!ids.length) {
    throw new Error("Selecciona al menos una reseña.");
  }

  for (const id of ids) {
    const review = await deleteReview(id);
    revalidateReviews(review.slug, review.game.slug);
  }

  redirect(returnTo);
}

function revalidateReviews(slug: string, gameSlug: string) {
  revalidateTag("public-games");
  revalidatePath("/");
  revalidatePath("/resenas");
  revalidatePath(`/resenas/${slug}`);
  revalidatePath(`/juegos/${gameSlug}`);
  revalidatePath("/admin/reviews");
  revalidatePath("/sitemap.xml");
}

function requiredString(value: FormDataEntryValue | null, message: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(message);
  }

  return value.trim();
}

function optionalString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function readStringList(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);
}
