import { revalidatePath } from "next/cache";
import { ActivityEventType } from "@prisma/client";
import { accountApiErrorResponse, accountApiJson } from "@/lib/accountErrors";
import { prisma } from "@/lib/prisma";
import { requireCurrentAppUser } from "@/lib/accountLibrary";
import {
  tryRecordPublicActivityEvent,
  tryRemoveActivityEvent
} from "@/lib/activity/events";
import { revalidateCommunityActivityCaches } from "@/lib/communityCache";

export async function GET(request: Request) {
  try {
    const appUser = await requireCurrentAppUser();
    const gameId = new URL(request.url).searchParams.get("gameId")?.trim();

    if (gameId) {
      const entry = await prisma.userLibraryGame.findUnique({
        where: { userId_gameId: { userId: appUser.id, gameId } },
        select: {
          gameId: true,
          owned: true,
          wantToPlay: true,
          wantToBuy: true,
          played: true
        }
      });

      return accountApiJson({ entry });
    }

    const entries = await prisma.userLibraryGame.findMany({
      where: { userId: appUser.id },
      select: {
        id: true,
        gameId: true,
        owned: true,
        wantToPlay: true,
        wantToBuy: true,
        played: true,
        createdAt: true,
        updatedAt: true,
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
    const gameIds = entries.map((entry) => entry.gameId);
    const playCounts = gameIds.length
      ? await prisma.userGamePlayCount.findMany({
          where: {
            userId: appUser.id,
            gameId: { in: gameIds }
          },
          select: {
            gameId: true,
            count: true
          }
        })
      : [];
    const playCountsByGameId = new Map(playCounts.map((entry) => [entry.gameId, entry.count]));

    return accountApiJson({
      entries: entries.map((entry) => ({
        id: entry.id,
        gameId: entry.gameId,
        owned: entry.owned,
        wantToPlay: entry.wantToPlay,
        wantToBuy: entry.wantToBuy,
        played: entry.played,
        playCount: playCountsByGameId.get(entry.gameId) || 0,
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
    return accountApiErrorResponse(error);
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
      return accountApiJson({ error: "Falta el juego." }, { status: 400 });
    }

    const game = await prisma.game.findUnique({
      where: { id: gameId },
      select: { id: true, slug: true, title: true, name: true }
    });

    if (!game) {
      return accountApiJson({ error: "El juego no existe." }, { status: 404 });
    }

    const current = await prisma.userLibraryGame.findUnique({
      where: {
        userId_gameId: {
          userId: appUser.id,
          gameId
        }
      },
      select: { owned: true, wantToPlay: true, wantToBuy: true, played: true }
    });

    const owned = body?.owned ?? current?.owned ?? false;
    const wantToPlay = body?.wantToPlay ?? current?.wantToPlay ?? false;
    const wantToBuy = body?.wantToBuy ?? current?.wantToBuy ?? false;
    const played = body?.played ?? current?.played ?? false;

    if (!owned && !wantToPlay && !wantToBuy && !played) {
      await prisma.userLibraryGame.deleteMany({
        where: { userId: appUser.id, gameId }
      });
      const activityChanged = await syncLibraryActivityEvents({
        actor: appUser,
        game,
        current,
        next: { owned, wantToPlay, played }
      });
      if (activityChanged) revalidateCommunityActivityCaches();
      revalidatePath(`/juegos/${game.slug}`);
      return accountApiJson({ ok: true, entry: null });
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
      },
      select: { gameId: true, owned: true, wantToPlay: true, wantToBuy: true, played: true }
    });

    const activityChanged = await syncLibraryActivityEvents({
      actor: appUser,
      game,
      current,
      next: { owned, wantToPlay, played }
    });
    if (activityChanged) revalidateCommunityActivityCaches();
    revalidatePath(`/juegos/${game.slug}`);
    return accountApiJson({ ok: true, entry });
  } catch (error) {
    return accountApiErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const appUser = await requireCurrentAppUser();
    const body = (await request.json().catch(() => null)) as { gameId?: unknown } | null;
    const gameId = typeof body?.gameId === "string" ? body.gameId.trim() : "";

    if (!gameId) {
      return accountApiJson({ error: "Falta el juego." }, { status: 400 });
    }

    const game = await prisma.game.findUnique({
      where: { id: gameId },
      select: { id: true, slug: true, title: true, name: true }
    });

    if (!game) {
      return accountApiJson({ error: "El juego no existe." }, { status: 404 });
    }

    const current = await prisma.userLibraryGame.findUnique({
      where: { userId_gameId: { userId: appUser.id, gameId } },
      select: { owned: true, wantToPlay: true, played: true }
    });
    await prisma.userLibraryGame.deleteMany({
      where: {
        userId: appUser.id,
        gameId
      }
    });

    const activityChanged = await syncLibraryActivityEvents({
      actor: appUser,
      game,
      current,
      next: { owned: false, wantToPlay: false, played: false }
    });
    if (activityChanged) revalidateCommunityActivityCaches();
    revalidatePath(`/juegos/${game.slug}`);
    return accountApiJson({ ok: true });
  } catch (error) {
    return accountApiErrorResponse(error);
  }
}

async function syncLibraryActivityEvents(input: {
  actor: Awaited<ReturnType<typeof requireCurrentAppUser>>;
  game: { id: string; slug: string; title: string | null; name: string };
  current: { owned: boolean; wantToPlay: boolean; played: boolean } | null;
  next: { owned: boolean; wantToPlay: boolean; played: boolean };
}) {
  const changes = [
    [ActivityEventType.COLLECTION_ADDED, input.current?.owned || false, input.next.owned],
    [ActivityEventType.WANT_TO_PLAY, input.current?.wantToPlay || false, input.next.wantToPlay],
    [ActivityEventType.PLAYED, input.current?.played || false, input.next.played]
  ] as const;
  const results = await Promise.all(
    changes.map(async ([type, previousValue, nextValue]) => {
      if (previousValue === nextValue) return false;
      return nextValue
        ? tryRecordPublicActivityEvent({
            type,
            actor: input.actor,
            game: input.game,
            requiresPublicCollection: true
          })
        : tryRemoveActivityEvent(type, input.actor.id, input.game.id);
    })
  );

  return results.some(Boolean);
}
