import { NextResponse } from "next/server";
import { requireCurrentAppUser } from "@/lib/accountLibrary";
import { prisma } from "@/lib/prisma";
import { incrementCurrentUserGamePlayCount } from "@/lib/userGamePlayCounts";

export async function POST(request: Request) {
  try {
    const appUser = await requireCurrentAppUser();
    const body = (await request.json().catch(() => null)) as { gameId?: unknown } | null;
    const gameId = typeof body?.gameId === "string" ? body.gameId.trim() : "";

    if (!gameId) {
      return NextResponse.json({ error: "Falta el juego." }, { status: 400 });
    }

    const game = await prisma.game.findUnique({
      where: { id: gameId },
      select: { id: true }
    });

    if (!game) {
      return NextResponse.json({ error: "El juego no existe." }, { status: 404 });
    }

    const result = await incrementCurrentUserGamePlayCount(appUser.id, game.id);
    return NextResponse.json({ ok: true, count: result.count });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No autenticado." },
      { status: 401 }
    );
  }
}
