import { revalidatePath, revalidateTag } from "next/cache";
import { GameStatus } from "@prisma/client";
import { assertTrustedAdminApiRequest, jsonNoStore } from "@/lib/adminApiSecurity";
import { gameRepository } from "@/lib/editorialRepositories";
import { buildExternalRatingUpdate } from "@/lib/ratings/gameRatings";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    assertTrustedAdminApiRequest(request, { requireJson: true });
    const { id } = await context.params;
    const game = await gameRepository.getEditorById(id);

    if (!game) {
      return jsonNoStore({ error: "No existe ese juego." }, { status: 404 });
    }

    const update = await buildExternalRatingUpdate(game);
    const updatedGame = await gameRepository.update(id, {
      ratings: update.ratings
    });

    revalidateGameAdmin(id);
    if (updatedGame.status === GameStatus.published) {
      revalidateTag("public-games");
      revalidatePath("/juegos");
      revalidatePath(`/juegos/${updatedGame.slug}`);
    }

    return jsonNoStore({
      ok: true,
      game: updatedGame,
      appliedFields: ["ratings.external", "ratings.users"],
      warnings: update.warnings
    });
  } catch (error) {
    return jsonNoStore({ error: error instanceof Error ? error.message : "No se pudo recalcular el consenso externo." }, { status: 500 });
  }
}

function revalidateGameAdmin(id: string) {
  revalidatePath("/admin/games");
  revalidatePath(`/admin/games/${id}`);
  revalidatePath(`/admin/games/${id}/edit`);
}
