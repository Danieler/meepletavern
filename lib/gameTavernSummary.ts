import { Prisma, ProfileVisibility } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { TAVERN_ACTIVITY_CACHE_TAG } from "@/lib/activity/events";
import { prisma } from "@/lib/prisma";

export const GAME_TAVERN_SAMPLE_LIMIT = 3;

export type GameTavernStatus = "OWNED" | "WANT_TO_PLAY" | "PLAYED";

export type GameTavernSampleUser = {
  id: string;
  name: string;
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

type GameTavernDb = {
  userLibraryGame: typeof prisma.userLibraryGame;
  userGameRating?: {
    aggregate: typeof prisma.userGameRating.aggregate;
  };
  $queryRaw?: <T = unknown>(query: Prisma.Sql) => Promise<T>;
};

type RatingAggregate = {
  _avg: { score: number | null };
  _count: { _all: number };
};

type RatingAggregateRow = {
  averageScore: number | string | null;
  votesCount: number;
};

type SampleRatingRow = {
  userId: string;
  score: number;
};

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
      displayName: string | null;
      username: string;
      avatarUrl: string | null;
    } | null;
    gameRatings?: Array<{ score: number }>;
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
                displayName: true,
                avatarUrl: true
              }
            }
          }
        }
      }
    }),
    queryPublicRatingAggregate(gameId, db)
  ]);
  const countGroups = rawCountGroups as TavernCountGroup[];
  const entries = rawEntries as TavernEntry[];
  const sampleRatings = await querySampleRatings(gameId, entries, db);

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
    const rating = status === "PLAYED" ? sampleRatings.get(entry.userId) : undefined;

    return [
      {
        id: entry.userId,
        name: profile.displayName || profile.username || "tabernero",
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

async function queryPublicRatingAggregate(gameId: string, db: GameTavernDb): Promise<RatingAggregate> {
  try {
    if (db.userGameRating) {
      return db.userGameRating.aggregate({
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
      });
    }

    if (!db.$queryRaw) {
      return emptyRatingAggregate();
    }

    const [row] = await db.$queryRaw<RatingAggregateRow[]>(Prisma.sql`
      SELECT
        ROUND(AVG(ugr."score")::numeric, 1) AS "averageScore",
        COUNT(*)::int AS "votesCount"
      FROM "UserGameRating" ugr
      INNER JOIN "User" u ON u."id" = ugr."userId"
      INNER JOIN "UserProfile" p ON p."userId" = u."id"
      WHERE ugr."gameId" = ${gameId}
        AND p."profileVisibility" = ${ProfileVisibility.PUBLIC}::"ProfileVisibility"
    `);

    return {
      _avg: {
        score: numberOrNull(row?.averageScore)
      },
      _count: {
        _all: Number(row?.votesCount || 0)
      }
    };
  } catch {
    return emptyRatingAggregate();
  }
}

async function querySampleRatings(gameId: string, entries: TavernEntry[], db: GameTavernDb) {
  const ratings = new Map<string, number>();

  for (const entry of entries) {
    const score = entry.user.gameRatings?.[0]?.score;
    if (typeof score === "number") {
      ratings.set(entry.userId, score);
    }
  }

  const missingUserIds = entries
    .filter((entry) => !ratings.has(entry.userId))
    .map((entry) => entry.userId);

  if (!missingUserIds.length || !db.$queryRaw) {
    return ratings;
  }

  try {
    const rows = await db.$queryRaw<SampleRatingRow[]>(Prisma.sql`
      SELECT "userId", "score"
      FROM "UserGameRating"
      WHERE "gameId" = ${gameId}
        AND "userId" IN (${Prisma.join(missingUserIds)})
    `);

    for (const row of rows) {
      ratings.set(row.userId, row.score);
    }
  } catch {
    return ratings;
  }

  return ratings;
}

function emptyRatingAggregate(): RatingAggregate {
  return {
    _avg: { score: null },
    _count: { _all: 0 }
  };
}

function numberOrNull(value: number | string | null | undefined) {
  if (value === null || typeof value === "undefined") {
    return null;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

const getCachedGameTavernSummary = (gameId: string) => unstable_cache(
  () => queryGameTavernSummary(gameId),
  ["game-tavern-summary-v1", gameId],
  { revalidate: 180, tags: [TAVERN_ACTIVITY_CACHE_TAG] }
)();

export function getGameTavernSummary(gameId: string) {
  return getCachedGameTavernSummary(gameId);
}

function getPrimaryStatus(entry: { owned: boolean; wantToPlay: boolean; played: boolean }): GameTavernStatus {
  if (entry.played) return "PLAYED";
  if (entry.owned) return "OWNED";
  return "WANT_TO_PLAY";
}
