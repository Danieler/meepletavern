"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { createReview, deleteReview, updateReview, getAdminReviewById, updateReviewInstagramPostId } from "@/lib/reviews";
import { publishToInstagram } from "@/lib/instagram";
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
    const actionVal = formData.get("action");
    const isApproved = actionVal === "publish" || actionVal === "save";

    const review = await createReview({
      gameId: requiredString(formData.get("gameId"), "Selecciona un juego."),
      authorName: requiredString(formData.get("authorName"), "Indica el autor visible."),
      title: requiredString(formData.get("title"), "El título es obligatorio."),
      summary: requiredString(formData.get("summary"), "El resumen es obligatorio."),
      body: requiredString(formData.get("body"), "La reseña es obligatoria."),
      isApproved,
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
    const actionVal = formData.get("action");
    const isApproved = actionVal === "publish" || actionVal === "save";
    const existingReview = await getAdminReviewById(id);

    const review = await updateReview(id, {
      gameId: requiredString(formData.get("gameId"), "Selecciona un juego."),
      authorName: requiredString(formData.get("authorName"), "Indica el autor visible."),
      title: requiredString(formData.get("title"), "El título es obligatorio."),
      summary: requiredString(formData.get("summary"), "El resumen es obligatorio."),
      body: requiredString(formData.get("body"), "La reseña es obligatoria."),
      isApproved
    });

    if (isApproved && existingReview && !existingReview.instagramPostId) {
      await tryPublishToInstagram(review.id);
    }

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

async function tryPublishToInstagram(reviewId: string) {
  try {
    const review = await getAdminReviewById(reviewId);
    if (!review) return;

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
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
        const authorUsername = review.user?.profile?.username;
        const authorText = authorUsername
          ? `${review.authorName} (${siteUrl}/u/${authorUsername})`
          : review.authorName;

        const caption = `Nueva reseña de ${review.game.title || review.game.name} por ${authorText}.\n\n${review.summary}\n\n¡Entra en la web, regístrate y crea tus propias reseñas como esta!`;
        try {
          const postId = await publishToInstagram(imageUrls, caption);
          if (postId) {
            await updateReviewInstagramPostId(review.id, postId);
          }
        } catch (error) {
          console.error("Error publishing to Instagram on create:", error);
        }
      }
    }
  } catch (error) {
    console.error("Failed to publish to Instagram:", error);
    // Don't throw, we don't want to break the review creation/update if Instagram fails
  }
}
