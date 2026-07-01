import { revalidatePath, revalidateTag } from "next/cache";

export const PUBLIC_GAMES_LIST_TAG = "public-games-list";
export const PUBLIC_GAME_TAXONOMY_TAG = "public-game-taxonomy";
export const PUBLIC_REVIEWS_TAG = "public-games";

export function publicGameDetailTag(slug: string) {
  return `public-game:${slug}`;
}

export function revalidatePublicGameDetail(slug: string) {
  revalidateTag(publicGameDetailTag(slug));
  revalidateTag(PUBLIC_REVIEWS_TAG);
  revalidatePath(`/api/mobile/v1/games/${encodeURIComponent(slug)}`);
  revalidatePath(`/juegos/${slug}`);
  revalidatePath("/resenas");
  revalidatePath("/instagram");
}

export function revalidatePublicGameCollections() {
  revalidateTag(PUBLIC_GAMES_LIST_TAG);
  revalidateTag(PUBLIC_GAME_TAXONOMY_TAG);
  revalidatePath("/");
  revalidatePath("/api/mobile/v1/categories");
  revalidatePath("/api/mobile/v1/filters");
  revalidatePath("/api/mobile/v1/games");
  revalidatePath("/api/mobile/v1/mechanics");
  revalidatePath("/juegos");
  revalidatePath("/rankings");
}

export function revalidatePublishedGame(slug: string, options?: { includeCollections?: boolean }) {
  revalidatePublicGameDetail(slug);

  if (options?.includeCollections !== false) {
    revalidatePublicGameCollections();
  }
}
