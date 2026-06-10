import { assertTrustedAdminApiRequest, jsonNoStore } from "@/lib/adminApiSecurity";
import { createGeneratedGameDraft } from "@/lib/games";

export async function POST(request: Request) {
  try {
    assertTrustedAdminApiRequest(request, { requireJson: true });
    const body = (await request.json()) as { name?: unknown };
    const name = typeof body.name === "string" ? body.name.trim() : "";

    if (!name) {
      return jsonNoStore({ error: "Escribe el nombre de un juego." }, { status: 400 });
    }

    const game = await createGeneratedGameDraft(name);
    return jsonNoStore({ gameId: game.id });
  } catch (error) {
    const status = error instanceof Error && "status" in error && typeof error.status === "number" ? error.status : 400;
    return jsonNoStore(
      { error: error instanceof Error ? error.message : "No se pudo generar la ficha." },
      { status }
    );
  }
}
