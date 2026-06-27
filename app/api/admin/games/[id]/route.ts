import { assertTrustedAdminApiRequest, jsonNoStore } from "@/lib/adminApiSecurity";
import { isUniqueConstraintError, updateGameFromPayload } from "@/lib/games";
import { prisma } from "@/lib/prisma";
import { revalidatePublicGameDetail, revalidatePublishedGame } from "@/lib/publicGameCache";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    assertTrustedAdminApiRequest(request, { requireJson: true });
    const { id } = await context.params;
    const body = await request.json();
    const previous = await prisma.game.findUnique({
      where: { id },
      select: {
        slug: true,
        status: true
      }
    });
    const game = await updateGameFromPayload(id, body);

    if (game.status === "published") {
      revalidatePublishedGame(game.slug);
      if (previous?.status === "published" && previous.slug !== game.slug) {
        revalidatePublicGameDetail(previous.slug);
      }
    } else if (previous?.status === "published") {
      revalidatePublishedGame(previous.slug);
    }

    return jsonNoStore({ gameId: game.id, slug: game.slug, status: game.status });
  } catch (error) {
    const message = isUniqueConstraintError(error)
      ? "Ya existe otro juego con ese slug."
      : error instanceof Error
        ? error.message
        : "No se pudo guardar el juego.";
    const status = error instanceof Error && "status" in error && typeof error.status === "number" ? error.status : 400;

    return jsonNoStore({ error: message }, { status });
  }
}
