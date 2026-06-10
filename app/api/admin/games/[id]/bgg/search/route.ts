import { assertTrustedAdminApiRequest, jsonNoStore } from "@/lib/adminApiSecurity";
import { searchBggGames, BggApiError } from "@/lib/bgg";
import { gameRepository } from "@/lib/editorialRepositories";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    assertTrustedAdminApiRequest(request, { requireJson: true });
    const { id } = await context.params;
    const body = (await request.json()) as { query?: string };
    const game = await gameRepository.getEditorById(id);

    if (!game) {
      return jsonNoStore({ error: "No existe ese juego." }, { status: 404 });
    }

    const query = body.query?.trim() || game.title || game.name;
    const results = await searchBggGames(query);

    return jsonNoStore({
      query,
      results
    });
  } catch (error) {
    return jsonNoStore({ error: mapBggError(error) }, { status: statusFromError(error) });
  }
}

function mapBggError(error: unknown) {
  if (error instanceof BggApiError) {
    return error.message;
  }

  return error instanceof Error ? error.message : "No se pudo buscar en BGG.";
}

function statusFromError(error: unknown) {
  if (error instanceof BggApiError) {
    return error.status;
  }

  if (error instanceof Error && "status" in error && typeof error.status === "number") {
    return error.status;
  }

  return 500;
}
