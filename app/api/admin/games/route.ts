import { assertTrustedAdminApiRequest, jsonNoStore } from "@/lib/adminApiSecurity";
import { createManualGameDraft } from "@/lib/games";

export async function POST(request: Request) {
  try {
    assertTrustedAdminApiRequest(request);
    const game = await createManualGameDraft();
    return jsonNoStore({ gameId: game.id });
  } catch (error) {
    const status = error instanceof Error && "status" in error && typeof error.status === "number" ? error.status : 400;
    return jsonNoStore(
      { error: error instanceof Error ? error.message : "No se pudo crear el juego." },
      { status }
    );
  }
}
