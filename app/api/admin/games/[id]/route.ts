import { assertTrustedAdminApiRequest, jsonNoStore } from "@/lib/adminApiSecurity";
import { isUniqueConstraintError, updateGameFromPayload } from "@/lib/games";

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
    const game = await updateGameFromPayload(id, body);

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
