import { NextResponse } from "next/server";
import { requireCurrentAppUser } from "@/lib/accountLibrary";
import { createGameSuggestion, GameListError } from "@/lib/gameLists";

export async function POST(request: Request) {
  try {
    const appUser = await requireCurrentAppUser();
    const body = (await request.json().catch(() => null)) as {
      name?: unknown;
      url?: unknown;
      notes?: unknown;
    } | null;
    const result = await createGameSuggestion(appUser.id, {
      name: body?.name,
      url: body?.url,
      notes: body?.notes
    });
    return NextResponse.json(
      {
        ok: true,
        duplicate: result.duplicate,
        message: result.duplicate
          ? "Ya teníamos apuntado ese juego. Lo revisaremos."
          : "Gracias. Lo revisaremos para añadirlo al catálogo."
      },
      { status: result.duplicate ? 200 : 201, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const status = error instanceof GameListError ? error.status : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo enviar la sugerencia." },
      { status, headers: { "Cache-Control": "no-store" } }
    );
  }
}
