import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { requireCurrentAppUser } from "@/lib/accountLibrary";
import { prisma } from "@/lib/prisma";
import { normalizeGameRatings } from "@/lib/ratings/gameRatings";
import { applyUserRatingVote } from "@/lib/ratings/userRatingVote";

export async function POST(request: Request) {
  try {
    await requireCurrentAppUser();
    const body = (await request.json().catch(() => null)) as { gameId?: unknown; score?: unknown } | null;
    const gameId = typeof body?.gameId === "string" ? body.gameId.trim() : "";
    const score = typeof body?.score === "number" ? body.score : Number(body?.score);

    if (!gameId || !Number.isFinite(score) || score < 1 || score > 10) {
      return NextResponse.json({ error: "Indica una nota entre 1 y 10." }, { status: 400 });
    }

    const game = await prisma.game.findUnique({
      where: { id: gameId },
      select: { id: true, slug: true, ratings: true }
    });

    if (!game) {
      return NextResponse.json({ error: "Ese juego no existe." }, { status: 404 });
    }

    const nextRatings = applyUserRatingVote(game.ratings, score);
    await prisma.game.update({
      where: { id: game.id },
      data: { ratings: nextRatings }
    });

    revalidateTag("public-games");
    revalidatePath("/");
    revalidatePath(`/juegos/${game.slug}`);

    return NextResponse.json({
      ok: true,
      ratings: normalizeGameRatings(nextRatings)
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No autenticado." },
      { status: 401 }
    );
  }
}
