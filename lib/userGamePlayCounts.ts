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

export async function decrementCurrentUserGamePlayCount(userId: string, gameId: string) {
  await prisma.userGamePlayCount.updateMany({
    where: {
      userId,
      gameId,
      count: {
        gt: 0
      }
    },
    data: {
      count: {
        decrement: 1
      }
    }
  });

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

  return {
    count: Math.max(0, entry?.count ?? 0)
  };
}
