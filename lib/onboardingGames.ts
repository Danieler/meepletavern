import "server-only";

import { ActivityEventType } from "@prisma/client";
import { tryRecordPublicActivityEvent, type RecordActivityEventInput } from "@/lib/activity/events";
import { revalidateCommunityActivityCaches } from "@/lib/communityCache";
import { compatibilityCache } from "@/lib/compatibility";
import { prisma } from "@/lib/prisma";

export const COMPATIBILITY_AFFINITY_ONBOARDING_SOURCE = "compatibility_affinity";
export const AUTH_ONBOARDING_SOURCE = "auth_onboarding";

export function normalizeOnboardingGameIds(value: unknown) {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value.flatMap((gameId) => {
        if (typeof gameId !== "string") return [];
        const trimmedGameId = gameId.trim();
        return trimmedGameId ? [trimmedGameId] : [];
      })
    )
  );
}

export function normalizeOnboardingSource(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : AUTH_ONBOARDING_SOURCE;
}

export async function syncOnboardingGamesForUser(input: {
  appUser: RecordActivityEventInput["actor"];
  gameIds: string[];
  source: string;
}) {
  const gameIds = normalizeOnboardingGameIds(input.gameIds);
  if (gameIds.length === 0) {
    return { ok: false, gamesCount: 0, activityRecorded: false };
  }

  const addToWantToPlay = input.source === COMPATIBILITY_AFFINITY_ONBOARDING_SOURCE;

  const games = await prisma.game.findMany({
    where: {
      id: { in: gameIds }
    },
    select: {
      id: true,
      slug: true,
      title: true,
      name: true
    }
  });

  let activityRecorded = false;
  for (const game of games) {
    const current = await prisma.userLibraryGame.findUnique({
      where: {
        userId_gameId: {
          userId: input.appUser.id,
          gameId: game.id
        }
      },
      select: {
        wantToPlay: true,
        played: true
      }
    });

    await prisma.userLibraryGame.upsert({
      where: {
        userId_gameId: {
          userId: input.appUser.id,
          gameId: game.id
        }
      },
      create: {
        userId: input.appUser.id,
        gameId: game.id,
        played: addToWantToPlay ? false : true,
        owned: false,
        wantToPlay: addToWantToPlay,
        wantToBuy: false
      },
      update: addToWantToPlay
        ? {
            wantToPlay: true
          }
        : {
            played: true,
            owned: false,
            wantToPlay: false,
            wantToBuy: false
          }
    });

    const shouldRecordActivity = addToWantToPlay ? !current?.wantToPlay : !current?.played;
    const eventRecorded = shouldRecordActivity
      ? await tryRecordPublicActivityEvent({
          type: addToWantToPlay ? ActivityEventType.WANT_TO_PLAY : ActivityEventType.PLAYED,
          actor: input.appUser,
          game,
          requiresPublicCollection: true
        })
      : false;

    if (eventRecorded) {
      activityRecorded = true;
    }
  }

  compatibilityCache.delete(input.appUser.id);

  if (activityRecorded) {
    revalidateCommunityActivityCaches();
  }

  return { ok: games.length > 0, gamesCount: games.length, activityRecorded };
}
