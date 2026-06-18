import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { requireCurrentAppUser } from "@/lib/accountLibrary";
import { prisma } from "@/lib/prisma";
import {
  deleteCurrentUserGameRating,
  getCurrentUserGameRating,
  listCurrentUserGameRatings,
  upsertCurrentUserGameRating
} from "@/lib/userGameRatings";

export async function GET(request: Request) {
  try {
    const appUser = await requireCurrentAppUser();
    const url = new URL(request.url);
    const gameId = url.searchParams.get("gameId")?.trim();

    if (gameId) {
      const score = await getCurrentUserGameRating(appUser.id, gameId);
      return NextResponse.json({ ok: true, score });
    }

    const ratings = await listCurrentUserGameRatings(appUser.id);
    return NextResponse.json({ ok: true, ratings });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No autenticado." },
      { status: 401 }
    );
  }
}

export async function POST(request: Request) {
  return saveRating(request);
}

export async function PATCH(request: Request) {
  return saveRating(request);
}

export async function DELETE(request: Request) {
  try {
    const appUser = await requireCurrentAppUser();
    const body = (await request.json().catch(() => null)) as { gameId?: unknown; score?: unknown } | null;
    const gameId = typeof body?.gameId === "string" ? body.gameId.trim() : "";

    if (!gameId) {
      return NextResponse.json({ error: "Indica qué juego quieres limpiar." }, { status: 400 });
    }

    const game = await prisma.game.findUnique({
      where: { id: gameId },
      select: { id: true, slug: true }
    });

    if (!game) {
      return NextResponse.json({ error: "Ese juego no existe." }, { status: 404 });
    }

    const result = await deleteCurrentUserGameRating(appUser.id, game.id);

    revalidateTag("public-games");
    revalidatePath("/");
    revalidatePath("/juegos");
    revalidatePath("/rankings");
    revalidatePath("/mi-perfil");
    revalidatePath(`/juegos/${game.slug}`);

    return NextResponse.json({
      ok: true,
      ratings: result.ratings
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No autenticado." },
      { status: 401 }
    );
  }
}

async function saveRating(request: Request) {
  try {
    const appUser = await requireCurrentAppUser();
    const body = (await request.json().catch(() => null)) as { gameId?: unknown; score?: unknown } | null;
    const gameId = typeof body?.gameId === "string" ? body.gameId.trim() : "";
    const score = typeof body?.score === "number" ? body.score : Number(body?.score);

    if (!gameId || !Number.isFinite(score) || score < 1 || score > 10) {
      return NextResponse.json({ error: "Indica una nota entre 1 y 10." }, { status: 400 });
    }

    const game = await prisma.game.findUnique({
      where: { id: gameId },
      select: { id: true, slug: true }
    });

    if (!game) {
      return NextResponse.json({ error: "Ese juego no existe." }, { status: 404 });
    }

    const result = await upsertCurrentUserGameRating(appUser.id, game.id, score);

    revalidateTag("public-games");
    revalidatePath("/");
    revalidatePath("/juegos");
    revalidatePath("/rankings");
    revalidatePath("/mi-perfil");
    revalidatePath(`/juegos/${game.slug}`);

    return NextResponse.json({
      ok: true,
      ratings: result.ratings,
      score: result.score
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No autenticado." },
      { status: 401 }
    );
  }
}
