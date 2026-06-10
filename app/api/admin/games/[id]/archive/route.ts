import { assertTrustedAdminApiRequest, jsonNoStore } from "@/lib/adminApiSecurity";
import { archiveGame } from "@/lib/games";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    assertTrustedAdminApiRequest(request);
    const { id } = await context.params;
    const game = await archiveGame(id);

    return jsonNoStore({ gameId: game.id, status: game.status, slug: game.slug });
  } catch (error) {
    const status = error instanceof Error && "status" in error && typeof error.status === "number" ? error.status : 400;
    return jsonNoStore(
      { error: error instanceof Error ? error.message : "No se pudo archivar el juego." },
      { status }
    );
  }
}
