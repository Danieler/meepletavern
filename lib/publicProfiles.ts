import { prisma } from "@/lib/prisma";
import { ProfileVisibility } from "@prisma/client";

export async function getPublicProfileByUsername(username: string) {
  const profile = await prisma.userProfile.findUnique({
    where: { username },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          displayName: true
        }
      }
    }
  });

  if (!profile) {
    return null;
  }

  return profile;
}

export async function getPublicUserCollection(userId: string) {
  const entries = await prisma.userLibraryGame.findMany({
    where: { userId },
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

  return {
    owned: entries.filter((e) => e.owned),
    wantToPlay: entries.filter((e) => e.wantToPlay),
    wantToBuy: entries.filter((e) => e.wantToBuy),
    played: entries.filter((e) => e.played)
  };
}

export async function getPublicUsers(query?: string) {
  const where: any = {
    profileVisibility: ProfileVisibility.PUBLIC
  };

  if (query) {
    where.OR = [
      { username: { contains: query, mode: "insensitive" } },
      { displayName: { contains: query, mode: "insensitive" } }
    ];
  }

  const profiles = await prisma.userProfile.findMany({
    where,
    include: {
      user: {
        include: {
          _count: {
            select: {
              library: true
            }
          }
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  // We need more granular counts for the card
  // This is a bit expensive if many users, but fine for now.
  return Promise.all(
    profiles.map(async (profile) => {
      const counts = await prisma.userLibraryGame.groupBy({
        by: ['userId'],
        where: { userId: profile.userId },
        _sum: {
          owned: true,
          wantToPlay: true,
          wantToBuy: true,
          played: true
        }
      });

      const stats = counts[0] || { _sum: { owned: 0, wantToPlay: 0, wantToBuy: 0, played: 0 } };

      return {
        username: profile.username,
        displayName: profile.displayName || profile.username,
        avatarUrl: profile.avatarUrl,
        collectionVisibility: profile.collectionVisibility,
        stats: {
          owned: Number(stats._sum.owned || 0),
          wantToPlay: Number(stats._sum.wantToPlay || 0),
          wantToBuy: Number(stats._sum.wantToBuy || 0),
          played: Number(stats._sum.played || 0)
        }
      };
    })
  );
}

export async function getGameCommunityUsers(gameId: string) {
  const entries = await prisma.userLibraryGame.findMany({
    where: {
      gameId,
      user: {
        profile: {
          profileVisibility: ProfileVisibility.PUBLIC,
          collectionVisibility: ProfileVisibility.PUBLIC
        }
      }
    },
    include: {
      user: {
        include: {
          profile: true
        }
      }
    }
  });

  return {
    owned: entries.filter((e) => e.owned).map((e) => e.user.profile!),
    wantToPlay: entries.filter((e) => e.wantToPlay).map((e) => e.user.profile!),
    wantToBuy: entries.filter((e) => e.wantToBuy).map((e) => e.user.profile!),
    played: entries.filter((e) => e.played).map((e) => e.user.profile!)
  };
}
