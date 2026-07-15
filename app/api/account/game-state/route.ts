import { accountApiErrorResponse, accountApiJson } from "@/lib/accountErrors";
import { requireCurrentAppUserWithGameState } from "@/lib/accountLibrary";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const gameId = url.searchParams.get("gameId")?.trim();

    if (!gameId) {
      return accountApiJson({ error: "Indica el juego." }, { status: 400 });
    }

    const appUserWithState = await requireCurrentAppUserWithGameState(gameId);

    const rating = appUserWithState.gameRatings[0] || null;
    const library = appUserWithState.library[0] || {
      owned: false,
      wantToPlay: false,
      wantToBuy: false,
      played: false
    };
    const playCount = appUserWithState.gamePlayCounts[0] || null;
    const comment = appUserWithState.comments[0] || null;

    return accountApiJson({
      ok: true,
      rating: rating?.score ?? null,
      library,
      playCount: playCount?.count ?? 0,
      comment: comment || null
    });
  } catch (error) {
    return accountApiErrorResponse(error);
  }
}
