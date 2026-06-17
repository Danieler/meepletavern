import { Prisma, ProfileVisibility, type UserProfile } from "@prisma/client";
import { getCatalogGamesByIds, type CatalogGame } from "@/lib/catalog";
import { prisma } from "@/lib/prisma";

type LibraryFlags = {
  owned: boolean;
  wantToPlay: boolean;
  wantToBuy: boolean;
  played: boolean;
};

export type PublicProfileStats = {
  owned: number;
  wantToPlay: number;
  wantToBuy: number;
  played: number;
};

export type PublicCollectionEntry = LibraryFlags & {
  id: string;
  gameId: string;
  updatedAt: Date;
  game: CatalogGame;
};

export type PublicUserCard = {
  username: string;
  displayName: string;
  avatarUrl: string | null;
  hasPublicCollection: boolean;
  stats: PublicProfileStats | null;
};

const profileWithUser = Prisma.validator<Prisma.UserProfileDefaultArgs>()({
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

export type PublicProfile = Prisma.UserProfileGetPayload<typeof profileWithUser>;

export async function getPublicProfileByUsername(username: string) {
  return prisma.userProfile.findUnique({
    where: { username: username.toLowerCase() },
    ...profileWithUser
  });
}

export async function getPublicUserCollection(userId: string) {
  const entries = await prisma.userLibraryGame.findMany({
    where: { userId },
    select: {
      id: true,
      gameId: true,
      owned: true,
      wantToPlay: true,
      wantToBuy: true,
      played: true,
      updatedAt: true
    },
    orderBy: { updatedAt: "desc" }
  });
  const games = await getCatalogGamesByIds(entries.map((entry) => entry.gameId));
  const gamesById = new Map(games.map((game) => [game.id, game]));
  const collectionEntries = entries.flatMap((entry): PublicCollectionEntry[] => {
    const game = gamesById.get(entry.gameId);
    return game ? [{ ...entry, game }] : [];
  });

  return {
    owned: collectionEntries.filter((entry) => entry.owned),
    wantToPlay: collectionEntries.filter((entry) => entry.wantToPlay),
    wantToBuy: collectionEntries.filter((entry) => entry.wantToBuy),
    played: collectionEntries.filter((entry) => entry.played)
  };
}

export async function getPublicUsers(query?: string): Promise<PublicUserCard[]> {
  const search = query?.trim();
  const profiles = await prisma.userProfile.findMany({
    where: {
      profileVisibility: ProfileVisibility.PUBLIC,
      ...(search
        ? {
            OR: [
              { username: { contains: search, mode: "insensitive" } },
              { displayName: { contains: search, mode: "insensitive" } }
            ]
          }
        : {})
    },
    select: {
      username: true,
      displayName: true,
      avatarUrl: true,
      collectionVisibility: true,
      user: {
        select: {
          library: {
            select: {
              owned: true,
              wantToPlay: true,
              wantToBuy: true,
              played: true
            }
          }
        }
      }
    },
    orderBy: [{ displayName: "asc" }, { username: "asc" }]
  });

  return profiles.map((profile) => {
    const hasPublicCollection = profile.collectionVisibility === ProfileVisibility.PUBLIC;

    return {
      username: profile.username,
      displayName: profile.displayName || profile.username,
      avatarUrl: profile.avatarUrl,
      hasPublicCollection,
      stats: hasPublicCollection ? countLibraryStats(profile.user.library) : null
    };
  });
}

export async function getGameCommunityUsers(gameId: string) {
  const entries = await prisma.userLibraryGame.findMany({
    where: {
      gameId,
      user: {
        profile: {
          is: {
            profileVisibility: ProfileVisibility.PUBLIC,
            collectionVisibility: ProfileVisibility.PUBLIC
          }
        }
      }
    },
    select: {
      owned: true,
      wantToPlay: true,
      wantToBuy: true,
      played: true,
      user: {
        select: {
          profile: true
        }
      }
    },
    orderBy: { updatedAt: "desc" }
  });
  const profiles = entries.flatMap((entry) => {
    const profile = entry.user.profile;
    return profile ? [{ entry, profile }] : [];
  });

  return {
    owned: profiles.filter(({ entry }) => entry.owned).map(({ profile }) => profile),
    wantToPlay: profiles.filter(({ entry }) => entry.wantToPlay).map(({ profile }) => profile),
    wantToBuy: profiles.filter(({ entry }) => entry.wantToBuy).map(({ profile }) => profile),
    played: profiles.filter(({ entry }) => entry.played).map(({ profile }) => profile)
  };
}

function countLibraryStats(entries: LibraryFlags[]): PublicProfileStats {
  return entries.reduce(
    (stats, entry) => ({
      owned: stats.owned + Number(entry.owned),
      wantToPlay: stats.wantToPlay + Number(entry.wantToPlay),
      wantToBuy: stats.wantToBuy + Number(entry.wantToBuy),
      played: stats.played + Number(entry.played)
    }),
    { owned: 0, wantToPlay: 0, wantToBuy: 0, played: 0 }
  );
}

export function getPublicProfileName(profile: Pick<UserProfile, "displayName" | "username">) {
  return profile.displayName || profile.username;
}
