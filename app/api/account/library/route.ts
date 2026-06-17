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
      orderBy: { updatedAt: "desc" }
    });

    return NextResponse.json({
      entries: entries.map((entry) => ({
        id: entry.id,
        gameId: entry.gameId,
        owned: entry.owned,
        wantToPlay: entry.wantToPlay,
        wantToBuy: entry.wantToBuy,
        played: entry.played,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
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
    const body = (await request.json().catch(() => null)) as {
      gameId?: unknown;
      owned?: boolean;
      wantToPlay?: boolean;
      wantToBuy?: boolean;
      played?: boolean;
    } | null;

    const gameId = typeof body?.gameId === "string" ? body.gameId.trim() : "";

    if (!gameId) {
      return NextResponse.json({ error: "Falta el juego." }, { status: 400 });
    }

    const current = await prisma.userLibraryGame.findUnique({
      where: {
        userId_gameId: {
          userId: appUser.id,
          gameId
        }
      }
    });

    const owned = body?.owned ?? current?.owned ?? false;
    const wantToPlay = body?.wantToPlay ?? current?.wantToPlay ?? false;
    const wantToBuy = body?.wantToBuy ?? current?.wantToBuy ?? false;
    const played = body?.played ?? current?.played ?? false;

    if (!owned && !wantToPlay && !wantToBuy && !played) {
      await prisma.userLibraryGame.deleteMany({
        where: { userId: appUser.id, gameId }
      });
      return NextResponse.json({ ok: true, entry: null });
    }

    const entry = await prisma.userLibraryGame.upsert({
      where: {
        userId_gameId: {
          userId: appUser.id,
          gameId
        }
      },
      update: {
        owned,
        wantToPlay,
        wantToBuy,
        played
      },
      create: {
        userId: appUser.id,
        gameId,
        owned,
        wantToPlay,
        wantToBuy,
        played
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
