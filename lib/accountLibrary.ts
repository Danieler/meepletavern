import { cookies } from "next/headers";
import { AuthenticationRequiredError } from "@/lib/accountErrors";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { upsertAppUserFromAuthUser } from "@/lib/userAccounts";

export async function requireCurrentAppUser() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new AuthenticationRequiredError();
  }

  // Try to find the user first to avoid writing on every API call
  const existingUser = await prisma.user.findUnique({
    where: { authUserId: user.id },
    include: { profile: true }
  });

  if (existingUser && existingUser.profile) {
    return existingUser;
  }

  return upsertAppUserFromAuthUser(user);
}

export async function requireCurrentAppUserWithGameState(gameId: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new AuthenticationRequiredError();
  }

  // Find user and retrieve game-specific state in a single query
  const existingUser = await prisma.user.findUnique({
    where: { authUserId: user.id },
    select: {
      id: true,
      profile: {
        select: {
          id: true
        }
      },
      gameRatings: {
        where: { gameId },
        select: { score: true }
      },
      library: {
        where: { gameId },
        select: {
          owned: true,
          wantToPlay: true,
          wantToBuy: true,
          played: true
        }
      },
      gamePlayCounts: {
        where: { gameId },
        select: { count: true }
      },
      comments: {
        where: { gameId },
        select: {
          id: true,
          body: true,
          createdAt: true,
          updatedAt: true
        }
      }
    }
  });

  if (existingUser && existingUser.profile) {
    return existingUser;
  }

  // If the user doesn't exist, upsert them first (this is rare, only on first login)
  const fullUser = await upsertAppUserFromAuthUser(user);
  
  // Now run the query for this user to get the game state
  return prisma.user.findUniqueOrThrow({
    where: { id: fullUser.id },
    select: {
      id: true,
      gameRatings: {
        where: { gameId },
        select: { score: true }
      },
      library: {
        where: { gameId },
        select: {
          owned: true,
          wantToPlay: true,
          wantToBuy: true,
          played: true
        }
      },
      gamePlayCounts: {
        where: { gameId },
        select: { count: true }
      },
      comments: {
        where: { gameId },
        select: {
          id: true,
          body: true,
          createdAt: true,
          updatedAt: true
        }
      }
    }
  });
}

export async function getCurrentUserLibraryGameIds() {
  const appUser = await requireCurrentAppUser();
  const entries = await prisma.userLibraryGame.findMany({
    where: { userId: appUser.id },
    select: { gameId: true }
  });

  return new Set(entries.map((entry) => entry.gameId));
}

export async function listCurrentUserLibraryEntries(userId: string) {
  const entries = await prisma.userLibraryGame.findMany({
    where: { userId },
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
          userId,
          gameId: { in: gameIds }
        },
        select: {
          gameId: true,
          count: true
        }
      })
    : [];
  const playCountsByGameId = new Map(playCounts.map((entry) => [entry.gameId, entry.count]));

  return entries.map((entry) => ({
    id: entry.id,
    gameId: entry.gameId,
    owned: entry.owned,
    wantToPlay: entry.wantToPlay,
    wantToBuy: entry.wantToBuy,
    played: entry.played,
    playCount: playCountsByGameId.get(entry.gameId) || 0,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
    game: {
      id: entry.game.id,
      slug: entry.game.slug,
      title: entry.game.title || entry.game.name,
      coverImageUrl: entry.game.coverImageUrl
    }
  }));
}
