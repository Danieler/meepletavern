import { Prisma, ProfileVisibility, type UserProfile } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { TAVERN_ACTIVITY_CACHE_TAG } from "@/lib/activity/events";
import { getCatalogGamesByIds, type CatalogGame } from "@/lib/catalog";
import { auditDataSource } from "@/lib/egressAudit";
import { prisma } from "@/lib/prisma";
import { normalizeTavernSearch } from "@/lib/tavernSearch";
import { GENERATED_USERNAME_PREFIX, isSystemGeneratedUsername } from "@/lib/usernames";

type LibraryFlags = {
  owned: boolean;
  wantToPlay: boolean;
  wantToBuy: boolean;
  played: boolean;
};

export type PublicProfileStats = {
  owned: number;
  wantToPlay: number;
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
  avatarUrl: string | null;
  stats: PublicProfileStats | null;
};

export type PublicUserPage = {
  items: PublicUserCard[];
  nextCursor: string | null;
};

export const PUBLIC_USER_PAGE_SIZE = 8;
const MAX_PUBLIC_USER_PAGE_SIZE = 12;
const PUBLIC_USERS_REVALIDATE_SECONDS = 3600;

const publicProfileSelect = {
  userId: true,
  username: true,
  displayName: true,
  bio: true,
  avatarUrl: true,
  profileVisibility: true,
  collectionVisibility: true
} satisfies Prisma.UserProfileSelect;

export type PublicProfile = Prisma.UserProfileGetPayload<{ select: typeof publicProfileSelect }>;

export async function getPublicProfileByUsername(username: string) {
  if (isSystemGeneratedUsername(username.toLowerCase())) return null;
  return prisma.userProfile.findUnique({
    where: { username: username.toLowerCase() },
    select: publicProfileSelect
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

type PublicUsersDb = Pick<typeof prisma, "userProfile" | "userLibraryGame">;

export async function queryPublicUsersPage(
  input: { query?: string | null; cursor?: string | null; limit?: number } = {},
  db: PublicUsersDb = prisma
): Promise<PublicUserPage> {
  const search = normalizeTavernSearch(input.query);
  const limit = normalizePublicUserLimit(input.limit);
  const profiles = await db.userProfile.findMany({
    where: {
      profileVisibility: ProfileVisibility.PUBLIC,
      NOT: { username: { startsWith: GENERATED_USERNAME_PREFIX } },
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
      id: true,
      userId: true,
      username: true,
      avatarUrl: true,
      collectionVisibility: true
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {})
  });
  const hasMore = profiles.length > limit;
  const visibleProfiles = profiles.slice(0, limit);
  const publicCollectionUserIds = visibleProfiles
    .filter((profile) => profile.collectionVisibility === ProfileVisibility.PUBLIC)
    .map((profile) => profile.userId);
  const groupedStats = publicCollectionUserIds.length
    ? await db.userLibraryGame.groupBy({
        by: ["userId", "owned", "wantToPlay", "played"],
        where: { userId: { in: publicCollectionUserIds } },
        _count: { _all: true }
      })
    : [];
  const statsByUser = new Map<string, PublicProfileStats>();

  for (const group of groupedStats) {
    const current = statsByUser.get(group.userId) || { owned: 0, wantToPlay: 0, played: 0 };
    const count = group._count._all;
    statsByUser.set(group.userId, {
      owned: current.owned + (group.owned ? count : 0),
      wantToPlay: current.wantToPlay + (group.wantToPlay ? count : 0),
      played: current.played + (group.played ? count : 0)
    });
  }

  return auditDataSource("publicProfiles.usersPage.db", {
    items: visibleProfiles.map((profile) => {
      const hasPublicCollection = profile.collectionVisibility === ProfileVisibility.PUBLIC;

      return {
        username: profile.username || "tabernero",
        avatarUrl: profile.avatarUrl,
        stats: hasPublicCollection
          ? statsByUser.get(profile.userId) || { owned: 0, wantToPlay: 0, played: 0 }
          : null
      };
    }),
    nextCursor: hasMore ? visibleProfiles.at(-1)?.id || null : null
  }, {
    hasQuery: Boolean(search),
    hasCursor: Boolean(input.cursor),
    limit
  });
}

export function getPublicUsersPage(
  input: { query?: string | null; cursor?: string | null; limit?: number } = {}
) {
  const query = normalizeTavernSearch(input.query);
  const limit = normalizePublicUserLimit(input.limit);

  if (!query && !input.cursor && limit === PUBLIC_USER_PAGE_SIZE) {
    return getCachedPublicUsersFirstPage();
  }

  return queryPublicUsersPage(input);
}

const getCachedPublicUsersFirstPage = unstable_cache(
  () => queryPublicUsersPage({ limit: PUBLIC_USER_PAGE_SIZE }),
  ["public-tavern-users-first-page-v2"],
  { revalidate: PUBLIC_USERS_REVALIDATE_SECONDS, tags: [TAVERN_ACTIVITY_CACHE_TAG] }
);

export function getPublicProfileName(profile: Pick<UserProfile, "displayName" | "username">) {
  return profile.displayName || profile.username;
}

function normalizePublicUserLimit(value?: number) {
  if (!Number.isFinite(value)) return PUBLIC_USER_PAGE_SIZE;
  return Math.min(MAX_PUBLIC_USER_PAGE_SIZE, Math.max(1, Math.trunc(value || PUBLIC_USER_PAGE_SIZE)));
}
