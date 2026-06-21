import { NextResponse } from "next/server";
import { requireCurrentAppUser } from "@/lib/accountLibrary";
import {
  GAME_LIST_SEARCH_MAX_LENGTH,
  GAME_LIST_SEARCH_MIN_LENGTH,
  normalizeGameSearch,
  searchGamesForList
} from "@/lib/gameLists";

export async function GET(request: Request) {
  try {
    await requireCurrentAppUser();
    const rawQuery = new URL(request.url).searchParams.get("q") || "";
    const query = normalizeGameSearch(rawQuery);
    if (!query || rawQuery.trim().length > GAME_LIST_SEARCH_MAX_LENGTH) {
      return NextResponse.json(
        { error: `Escribe entre ${GAME_LIST_SEARCH_MIN_LENGTH} y ${GAME_LIST_SEARCH_MAX_LENGTH} caracteres.` },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const games = await searchGamesForList(query);
    return NextResponse.json({ games }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo buscar el juego." },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }
}
