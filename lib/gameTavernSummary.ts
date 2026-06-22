import { Prisma, ProfileVisibility } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { TAVERN_ACTIVITY_CACHE_TAG } from "@/lib/activity/events";
import { prisma } from "@/lib/prisma";

export const GAME_TAVERN_SAMPLE_LIMIT = 3;

export type GameTavernStatus = "OWNED" | "WANT_TO_PLAY" | "PLAYED";

export type GameTavernSampleUser = {
  id: string;
  username: string;
  avatarUrl: string | null;
  status: GameTavernStatus;
  rating?: number;
};

export type GameTavernSummary = {
  ownedCount: number;
  wantToPlayCount: number;
  playedCount: number;
  communityRating: number | null;
  ratingCount: number;
  sampleUsers: GameTavernSampleUser[];
};

type GameTavernDb = Pick<typeof prisma, "userLibraryGame" | "userGameRating">;

type TavernCountGroup = {
  owned: boolean;
  wantToPlay: boolean;
  played: boolean;
  _count: { _all: number };
};

type TavernEntry = {
  userId: string;
  owned: boolean;
  wantToPlay: boolean;
  played: boolean;
  user: {
    profile: {
      username: string;
      avatarUrl: string | null;
    } | null;
    gameRatings: Array<{ score: number }>;
  };
};

export async function queryGameTavernSummary(
  gameId: string,
  db: GameTavernDb = prisma
): Promise<GameTavernSummary> {
  const publicInteractionsWhere: Prisma.UserLibraryGameWhereInput = {
    gameId,
    OR: [{ owned: true }, { wantToPlay: true }, { played: true }],
    user: {
      profile: {
        is: {
          profileVisibility: ProfileVisibility.PUBLIC,
          collectionVisibility: ProfileVisibility.PUBLIC
        }
      }
    }
  };

  const [rawCountGroups, rawEntries, ratingAggregate] = await Promise.all([
    db.userLibraryGame.groupBy({
      by: ["owned", "wantToPlay", "played"],
      where: publicInteractionsWhere,
      _count: { _all: true }
    }),
    db.userLibraryGame.findMany({
      where: publicInteractionsWhere,
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      take: GAME_TAVERN_SAMPLE_LIMIT,
      select: {
        userId: true,
        owned: true,
        wantToPlay: true,
        played: true,
        user: {
          select: {
            profile: {
              select: {
                username: true,
                avatarUrl: true
              }
            },
            gameRatings: {
              where: { gameId },
              select: { score: true },
              take: 1
            }
          }
        }
      }
    }),
    db.userGameRating.aggregate({
      where: {
        gameId,
        user: {
          profile: {
            is: { profileVisibility: ProfileVisibility.PUBLIC }
          }
        }
      },
      _avg: { score: true },
      _count: { _all: true }
    })
  ]);
  const countGroups = rawCountGroups as TavernCountGroup[];
  const entries = rawEntries as TavernEntry[];

  const counts = countGroups.reduce(
    (summary, group) => ({
      ownedCount: summary.ownedCount + (group.owned ? group._count._all : 0),
      wantToPlayCount: summary.wantToPlayCount + (group.wantToPlay ? group._count._all : 0),
      playedCount: summary.playedCount + (group.played ? group._count._all : 0)
    }),
    { ownedCount: 0, wantToPlayCount: 0, playedCount: 0 }
  );

  const sampleUsers = entries.slice(0, GAME_TAVERN_SAMPLE_LIMIT).flatMap((entry) => {
    const profile = entry.user.profile;

    if (!profile) {
      return [];
    }

    const status = getPrimaryStatus(entry);
    const rating = status === "PLAYED" ? entry.user.gameRatings[0]?.score : undefined;

    return [
      {
        id: entry.userId,
        username: profile.username || "tabernero",
        avatarUrl: profile.avatarUrl,
        status,
        ...(rating !== undefined ? { rating } : {})
      }
    ];
  });

  return {
    ...counts,
    communityRating: ratingAggregate._avg.score === null
      ? null
      : Math.round(ratingAggregate._avg.score * 10) / 10,
    ratingCount: ratingAggregate._count._all,
    sampleUsers
  };
}

const getCachedGameTavernSummary = unstable_cache(
  (gameId: string) => queryGameTavernSummary(gameId),
  ["game-tavern-summary-v1"],
  { revalidate: 180, tags: [TAVERN_ACTIVITY_CACHE_TAG] }
);

export function getGameTavernSummary(gameId: string) {
  return getCachedGameTavernSummary(gameId);
}

function getPrimaryStatus(entry: { owned: boolean; wantToPlay: boolean; played: boolean }): GameTavernStatus {
  if (entry.played) return "PLAYED";
  if (entry.owned) return "OWNED";
  return "WANT_TO_PLAY";
}
