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
