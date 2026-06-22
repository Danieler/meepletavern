import { prisma } from "@/lib/prisma";

export async function getCurrentUserGamePlayCount(userId: string, gameId: string) {
  const entry = await prisma.userGamePlayCount.findUnique({
    where: {
      userId_gameId: {
        userId,
        gameId
      }
    },
    select: {
      count: true
    }
  });

  return entry?.count ?? 0;
}

export async function incrementCurrentUserGamePlayCount(userId: string, gameId: string) {
  return prisma.userGamePlayCount.upsert({
    where: {
      userId_gameId: {
        userId,
        gameId
      }
    },
    update: {
      count: {
        increment: 1
      }
    },
    create: {
      userId,
      gameId,
      count: 1
    },
    select: {
      count: true
    }
  });
}
