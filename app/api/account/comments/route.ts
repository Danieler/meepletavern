import { GameStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { requireCurrentAppUser } from "@/lib/accountLibrary";
import { getGameComments, validateGameCommentBody } from "@/lib/gameComments";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const appUser = await requireCurrentAppUser();
    const gameId = new URL(request.url).searchParams.get("gameId")?.trim() || "";

    if (!gameId) {
      return NextResponse.json({ error: "Falta el juego." }, { status: 400 });
    }

    const comment = await prisma.gameComment.findUnique({
      where: {
        userId_gameId: {
          userId: appUser.id,
          gameId
        }
      },
      select: {
        id: true,
        body: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return NextResponse.json({ comment });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No autenticado." },
      { status: 401 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const appUser = await requireCurrentAppUser();
    const body = (await request.json().catch(() => null)) as { gameId?: unknown; body?: unknown } | null;
    const gameId = typeof body?.gameId === "string" ? body.gameId.trim() : "";
    const rawComment = typeof body?.body === "string" ? body.body : "";

    if (!gameId) {
      return NextResponse.json({ error: "Falta el juego." }, { status: 400 });
    }

    const validation = validateGameCommentBody(rawComment);

    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const game = await prisma.game.findFirst({
      where: {
        id: gameId,
        status: GameStatus.published
      },
      select: {
        id: true,
        slug: true
      }
    });

    if (!game) {
      return NextResponse.json({ error: "Ese juego no existe o no está publicado." }, { status: 404 });
    }

    const savedComment = await prisma.gameComment.upsert({
      where: {
        userId_gameId: {
          userId: appUser.id,
          gameId: game.id
        }
      },
      update: {
        body: validation.value
      },
      create: {
        gameId: game.id,
        userId: appUser.id,
        body: validation.value
      }
    });

    revalidatePath(`/juegos/${game.slug}`);

    const comments = await getGameComments(game.id);

    return NextResponse.json({
      ok: true,
      comment: {
        id: savedComment.id,
        body: savedComment.body,
        createdAt: savedComment.createdAt.toISOString(),
        updatedAt: savedComment.updatedAt.toISOString()
      },
      comments
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo guardar el comentario." },
      { status: 401 }
    );
  }
}
