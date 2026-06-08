import { NextResponse } from "next/server";
import { createManualGameDraft } from "@/lib/games";

export async function POST() {
  try {
    const game = await createManualGameDraft();
    return NextResponse.json({ gameId: game.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo crear el juego." },
      { status: 400 }
    );
  }
}

