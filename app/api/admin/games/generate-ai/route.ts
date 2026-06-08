import { NextResponse } from "next/server";
import { createGeneratedGameDraft } from "@/lib/games";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { name?: unknown };
    const name = typeof body.name === "string" ? body.name.trim() : "";

    if (!name) {
      return NextResponse.json({ error: "Escribe el nombre de un juego." }, { status: 400 });
    }

    const game = await createGeneratedGameDraft(name);
    return NextResponse.json({ gameId: game.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo generar la ficha." },
      { status: 400 }
    );
  }
}

