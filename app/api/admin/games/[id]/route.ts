import { NextResponse } from "next/server";
import { isUniqueConstraintError, updateGameFromPayload } from "@/lib/games";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const game = await updateGameFromPayload(id, body);

    return NextResponse.json({ gameId: game.id, slug: game.slug, status: game.status });
  } catch (error) {
    const message = isUniqueConstraintError(error)
      ? "Ya existe otro juego con ese slug."
      : error instanceof Error
        ? error.message
        : "No se pudo guardar el juego.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}

