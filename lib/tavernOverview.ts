import { unstable_cache } from "next/cache";
import {
  ActivityEventType,
  ActivityEventVisibility,
  GameStatus,
  ProfileVisibility,
  type GameImageStatus
} from "@prisma/client";
import { TAVERN_ACTIVITY_CACHE_TAG } from "@/lib/activity/events";
import { auditDataSource } from "@/lib/egressAudit";
import { prisma } from "@/lib/prisma";

const RECENT_ACTIVITY_SCAN_LIMIT = 18;
export const TAVERN_RECENT_GAMES_LIMIT = 6;
export const TAVERN_RANKING_LIMIT = 5;
const TAVERN_OVERVIEW_REVALIDATE_SECONDS = 600;

export type TavernOverviewGame = {
  gameId: string;
  title: string;
  slug: string;
  coverImageUrl: string | null;
  coverImageAlt: string;
  imageStatus: GameImageStatus;
};

export type TavernRecentGame = TavernOverviewGame & {
  actorName: string;
  context: string;
};

export type TavernRankedGame = TavernOverviewGame & {
  count: number;
};

export type TavernOverview = {
  recentGames: TavernRecentGame[];
  mostWanted: TavernRankedGame[];
  mostOwned: TavernRankedGame[];
  mostPlayed: TavernRankedGame[];
  highlights: TavernActivityHighlights;
};

export type TavernActivityHighlights = {
  weeklyLibraryAdds: number;
  weeklyActivityCount: number;
  topWantedGame: { 
    title: string; 
    slug: string; 
    count: number;
    coverImageUrl: string | null;
    coverImageAlt: string | null;
  } | null;
};

type TavernOverviewDb = Pick<typeof prisma, "activityEvent" | "userLibraryGame" | "game">;

export async function queryTavernOverview(db: TavernOverviewDb = prisma): Promise<TavernOverview> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const publicRecentWhere = {
    visibility: ActivityEventVisibility.PUBLIC,
    createdAt: { gte: since }
  } as const;
  const publicCollectionWhere = {
    user: {
      profile: {
        is: {
          profileVisibility: ProfileVisibility.PUBLIC,
          collectionVisibility: ProfileVisibility.PUBLIC
        }
      }
    }
  } as const;

  const [recentEvents, wantedGroups, ownedGroups, playedGroups, weeklyLibraryAdds, weeklyActivityCount] = await Promise.all([
    db.activityEvent.findMany({
      where: {
        visibility: ActivityEventVisibility.PUBLIC,
        type: { in: [ActivityEventType.COLLECTION_ADDED, ActivityEventType.LIST_GAME_ADDED] },
        gameId: { not: null }
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: RECENT_ACTIVITY_SCAN_LIMIT,
      select: {
        type: true,
        actorNameSnapshot: true,
        gameId: true,
        listTitleSnapshot: true
      }
    }),
    db.userLibraryGame.groupBy({
      by: ["gameId"],
      where: { wantToPlay: true, ...publicCollectionWhere },
      _count: { gameId: true },
      orderBy: { _count: { gameId: "desc" } },
      take: TAVERN_RANKING_LIMIT
    }),
    db.userLibraryGame.groupBy({
      by: ["gameId"],
      where: { owned: true, ...publicCollectionWhere },
      _count: { gameId: true },
      orderBy: { _count: { gameId: "desc" } },
      take: TAVERN_RANKING_LIMIT
    }),
    db.userLibraryGame.groupBy({
      by: ["gameId"],
      where: { played: true, ...publicCollectionWhere },
      _count: { gameId: true },
      orderBy: { _count: { gameId: "desc" } },
      take: TAVERN_RANKING_LIMIT
    }),
    db.activityEvent.count({
      where: {
        ...publicRecentWhere,
        type: { in: [ActivityEventType.COLLECTION_ADDED, ActivityEventType.LIST_GAME_ADDED] }
      }
    }),
    db.activityEvent.count({ where: publicRecentWhere })
  ]);

  const gameIds = [...new Set([
    ...recentEvents.flatMap((event) => event.gameId ? [event.gameId] : []),
    ...wantedGroups.map((group) => group.gameId),
    ...ownedGroups.map((group) => group.gameId),
    ...playedGroups.map((group) => group.gameId)
  ])];
  const games = gameIds.length
    ? await db.game.findMany({
        where: { id: { in: gameIds }, status: GameStatus.published },
        select: {
          id: true,
          title: true,
          name: true,
          slug: true,
          coverImageUrl: true,
          coverImageAlt: true,
          imageStatus: true
        }
      })
    : [];
  const gamesById = new Map(games.map((game) => [game.id, game]));
  const seenRecentGames = new Set<string>();
  const recentGames = recentEvents.flatMap((event): TavernRecentGame[] => {
    if (!event.gameId || seenRecentGames.has(event.gameId)) return [];
    const game = gamesById.get(event.gameId);
    if (!game) return [];
    seenRecentGames.add(event.gameId);

    return [{
      ...toOverviewGame(game),
      actorName: event.actorNameSnapshot?.trim() || "Un tabernero",
      context: event.type === ActivityEventType.LIST_GAME_ADDED && event.listTitleSnapshot
        ? `lo añadió a “${event.listTitleSnapshot}”`
        : "lo añadió a su ludoteca"
    }];
  }).slice(0, TAVERN_RECENT_GAMES_LIMIT);
  const mostWanted = toRanking(wantedGroups, gamesById);
  const mostOwned = toRanking(ownedGroups, gamesById);
  const mostPlayed = toRanking(playedGroups, gamesById);
  const topWanted = mostWanted[0];

  return auditDataSource("tavern.overview.db", {
    recentGames,
    mostWanted,
    mostOwned,
    mostPlayed,
    highlights: {
      weeklyLibraryAdds,
      weeklyActivityCount,
      topWantedGame: topWanted
        ? { 
            title: topWanted.title, 
            slug: topWanted.slug, 
            count: topWanted.count,
            coverImageUrl: topWanted.coverImageUrl,
            coverImageAlt: topWanted.coverImageAlt
          }
        : null
    }
  });
}

const getCachedTavernOverview = unstable_cache(
  () => queryTavernOverview(),
  ["tavern-overview-v3"],
  { revalidate: TAVERN_OVERVIEW_REVALIDATE_SECONDS, tags: [TAVERN_ACTIVITY_CACHE_TAG, "public-games"] }
);

export function getTavernOverview() {
  return getCachedTavernOverview();
}

function toRanking(
  groups: Array<{ gameId: string; _count: { gameId: number } }>,
  gamesById: Map<string, {
    id: string;
    title: string;
    name: string;
    slug: string;
    coverImageUrl: string | null;
    coverImageAlt: string;
    imageStatus: GameImageStatus;
  }>
) {
  return groups.flatMap((group): TavernRankedGame[] => {
    const game = gamesById.get(group.gameId);
    return game ? [{ ...toOverviewGame(game), count: group._count.gameId }] : [];
  }).slice(0, TAVERN_RANKING_LIMIT);
}

function toOverviewGame(game: {
  id: string;
  title: string;
  name: string;
  slug: string;
  coverImageUrl: string | null;
  coverImageAlt: string;
  imageStatus: GameImageStatus;
}): TavernOverviewGame {
  return {
    gameId: game.id,
    title: game.title.trim() || game.name,
    slug: game.slug,
    coverImageUrl: game.coverImageUrl,
    coverImageAlt: game.coverImageAlt,
    imageStatus: game.imageStatus
  };
}
