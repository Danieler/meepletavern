"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createReview, deleteReview, updateReview, getAdminReviewById, updateReviewInstagramPostId } from "@/lib/reviews";
import { publishToInstagram } from "@/lib/instagram";
import { buildReviewInstagramCaption } from "@/lib/instagramSharing";
import { revalidatePublicGameDetail } from "@/lib/publicGameCache";
import { getEffectiveReviewRating } from "@/lib/reviewRating";
import { parseReviewContent } from "@/lib/reviewContent";

export type AdminReviewActionState = {
  error?: string;
  message?: string;
};

export async function createAdminReviewAction(
  _state: AdminReviewActionState,
  formData: FormData
): Promise<AdminReviewActionState> {
  try {
    const intentVal = formData.get("intent");
    const isApproved = intentVal === "publish" || intentVal === "save";

    const review = await createReview({
      gameId: requiredString(formData.get("gameId"), "Selecciona un juego."),
      authorName: requiredString(formData.get("authorName"), "Indica el autor visible."),
      title: requiredString(formData.get("title"), "El título es obligatorio."),
      summary: requiredString(formData.get("summary"), "El resumen es obligatorio."),
      body: requiredString(formData.get("body"), "La reseña es obligatoria."),
      isApproved,
      instagramHashtags: optionalString(formData.get("instagramHashtags")),
      createdByAdmin: true
    });

    if (isApproved) {
      await tryPublishToInstagram(review.id);
    }

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
    const intentVal = formData.get("intent");
    const isApproved = intentVal === "publish" || intentVal === "save";
    const existingReview = await getAdminReviewById(id);

    const review = await updateReview(id, {
      gameId: requiredString(formData.get("gameId"), "Selecciona un juego."),
      authorName: requiredString(formData.get("authorName"), "Indica el autor visible."),
      title: requiredString(formData.get("title"), "El título es obligatorio."),
      summary: requiredString(formData.get("summary"), "El resumen es obligatorio."),
      body: requiredString(formData.get("body"), "La reseña es obligatoria."),
      isApproved,
      instagramHashtags: optionalString(formData.get("instagramHashtags"))
    });

    let instagramError = "";
    if (isApproved && existingReview && !existingReview.instagramPostId) {
      const igResult = await tryPublishToInstagram(review.id);
      if (!igResult.success && igResult.error) {
        instagramError = igResult.error;
      }
    }

    revalidateReviews(review.slug, review.game.slug);

    if (instagramError) {
      return { error: `Guardado en la web, pero falló Instagram: ${instagramError}` };
    }
    return { message: isApproved ? "Reseña guardada y publicada." : "Reseña guardada como borrador." };
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
  revalidatePath("/resenas");
  revalidatePath(`/resenas/${slug}`);
  revalidatePublicGameDetail(gameSlug);
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

async function tryPublishToInstagram(reviewId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const review = await getAdminReviewById(reviewId);
    if (!review) return { success: false, error: "No se encontró la reseña." };

    if (!review.instagramPostId) {
      // Extract images from review body
      const blocks = parseReviewContent(review.body);
      const reviewImages = blocks.filter(b => b.type === "image").map(b => b.url);
      
      let imageUrls = reviewImages;
      if (imageUrls.length === 0) {
        const gameImage = review.game.coverImageUrl || review.game.imageUrl;
        if (gameImage) imageUrls = [gameImage];
      }

      if (imageUrls.length > 0) {
        const caption = buildReviewInstagramCaption({
          authorName: review.authorName,
          gameTitle: review.game.title || review.game.name,
          hashtags: review.instagramHashtags,
          rating: getEffectiveReviewRating(review.game.ratings, review.rating),
          reviewTitle: review.title,
          summary: review.summary
        });
        try {
          const postId = await publishToInstagram(imageUrls, caption);
          if (postId) {
            await updateReviewInstagramPostId(review.id, postId);
            return { success: true };
          }
        } catch (error) {
          console.error("Error publishing to Instagram on create:", error);
          return { success: false, error: error instanceof Error ? error.message : "Error desconocido al publicar." };
        }
      } else {
        return { success: false, error: "La reseña no tiene imágenes." };
      }
    }
    return { success: true };
  } catch (error) {
    console.error("Failed to publish to Instagram:", error);
    return { success: false, error: error instanceof Error ? error.message : "Fallo en la publicación." };
  }
}
