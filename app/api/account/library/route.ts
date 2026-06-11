import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentAppUser } from "@/lib/accountLibrary";

export async function GET() {
  try {
    const appUser = await requireCurrentAppUser();
    const entries = await prisma.userLibraryGame.findMany({
      where: { userId: appUser.id },
      include: {
        game: {
          select: {
            id: true,
            slug: true,
            title: true,
            name: true,
            coverImageUrl: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({
      entries: entries.map((entry) => ({
        id: entry.id,
        gameId: entry.gameId,
        createdAt: entry.createdAt,
        game: {
          id: entry.game.id,
          slug: entry.game.slug,
          title: entry.game.title || entry.game.name,
          coverImageUrl: entry.game.coverImageUrl
        }
      }))
    });
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
      return NextResponse.json({ error: "Ese juego no existe." }, { status: 404 });
    }

    const entry = await prisma.userLibraryGame.upsert({
      where: {
        userId_gameId: {
          userId: appUser.id,
          gameId
        }
      },
      update: {},
      create: {
        userId: appUser.id,
        gameId
      }
    });

    return NextResponse.json({ ok: true, entry });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No autenticado." },
      { status: 401 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const appUser = await requireCurrentAppUser();
    const body = (await request.json().catch(() => null)) as { gameId?: unknown } | null;
    const gameId = typeof body?.gameId === "string" ? body.gameId.trim() : "";

    if (!gameId) {
      return NextResponse.json({ error: "Falta el juego." }, { status: 400 });
    }

    await prisma.userLibraryGame.deleteMany({
      where: {
        userId: appUser.id,
        gameId
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No autenticado." },
      { status: 401 }
    );
  }
}
