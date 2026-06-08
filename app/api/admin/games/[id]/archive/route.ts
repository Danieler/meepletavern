import { NextResponse } from "next/server";
import { archiveGame } from "@/lib/games";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const game = await archiveGame(id);

    return NextResponse.json({ gameId: game.id, status: game.status, slug: game.slug });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo archivar el juego." },
      { status: 400 }
    );
  }
}

