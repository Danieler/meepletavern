import { unstable_cache } from "next/cache";
import { ActivityEventType, ActivityEventVisibility } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { TAVERN_ACTIVITY_CACHE_TAG } from "@/lib/activity/events";
import { normalizeTavernSearch } from "@/lib/tavernSearch";

export const TAVERN_ACTIVITY_PAGE_SIZE = 8;
const MAX_TAVERN_ACTIVITY_PAGE_SIZE = 12;
const TAVERN_ACTIVITY_REVALIDATE_SECONDS = 180;

export type TavernActivityFeedItem = {
  id: string;
  type: ActivityEventType;
  actorName: string | null;
  actorUsername: string | null;
  actorAvatarUrl: string | null;
  gameTitle: string | null;
  gameSlug: string | null;
  listTitle: string | null;
  listSlug: string | null;
  rating: number | null;
  commentSnippet: string | null;
  gameCoverImageUrl: string | null;
  createdAt: string;
};

export type TavernActivityFeed = {
  items: TavernActivityFeedItem[];
  nextCursor: string | null;
};

type ActivityFeedDb = Pick<typeof prisma, "activityEvent">;

export async function queryTavernActivityFeed(
  input: { limit?: number; cursor?: string | null; query?: string | null; type?: string | null } = {},
  db: ActivityFeedDb = prisma
): Promise<TavernActivityFeed> {
  const limit = normalizeLimit(input.limit);
  const search = normalizeTavernSearch(input.query);
  const typeFilter = normalizeTypeFilter(input.type);
  const rows = await db.activityEvent.findMany({
    where: {
      visibility: ActivityEventVisibility.PUBLIC,
      ...(typeFilter ? { type: { in: typeFilter } } : {}),
      ...(search
        ? {
            OR: [
              { actorNameSnapshot: { contains: search, mode: "insensitive" } },
              { actorUsernameSnapshot: { contains: search, mode: "insensitive" } },
              { gameTitleSnapshot: { contains: search, mode: "insensitive" } },
              { listTitleSnapshot: { contains: search, mode: "insensitive" } }
            ]
          }
        : {})
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
    select: {
      id: true,
      type: true,
      actorNameSnapshot: true,
      actorUsernameSnapshot: true,
      actorAvatarUrlSnapshot: true,
      gameTitleSnapshot: true,
      gameSlugSnapshot: true,
      listTitleSnapshot: true,
      listSlugSnapshot: true,
      rating: true,
      commentSnippet: true,
      createdAt: true,
      game: {
        select: { coverImageUrl: true }
      }
    }
  });
  const hasMore = rows.length > limit;
  const visibleRows = rows.slice(0, limit);

  return {
    items: visibleRows.map((row) => ({
      id: row.id,
      type: row.type,
      actorName: row.actorNameSnapshot,
      actorUsername: row.actorUsernameSnapshot,
      actorAvatarUrl: row.actorAvatarUrlSnapshot,
      gameTitle: row.gameTitleSnapshot,
      gameSlug: row.gameSlugSnapshot,
      listTitle: row.listTitleSnapshot,
      listSlug: row.listSlugSnapshot,
      rating: row.rating,
      commentSnippet: row.commentSnippet,
      gameCoverImageUrl: row.game?.coverImageUrl || null,
      createdAt: row.createdAt.toISOString()
    })),
    nextCursor: hasMore ? visibleRows.at(-1)?.id || null : null
  };
}

const getCachedTavernActivityFeed = unstable_cache(
  async (limit: number, cursor: string | null) => queryTavernActivityFeed({ limit, cursor }),
  ["tavern-activity-feed-v2"],
  { revalidate: TAVERN_ACTIVITY_REVALIDATE_SECONDS, tags: [TAVERN_ACTIVITY_CACHE_TAG] }
);

export function getTavernActivityFeed(
  input: { limit?: number; cursor?: string | null; query?: string | null; type?: string | null } = {}
) {
  const search = normalizeTavernSearch(input.query);
  const typeFilter = normalizeTypeFilter(input.type);
  
  if (search || input.type) {
    return queryTavernActivityFeed({ limit: input.limit, cursor: input.cursor, query: search, type: input.type });
  }

  return getCachedTavernActivityFeed(normalizeLimit(input.limit), input.cursor || null);
}

function normalizeLimit(value?: number) {
  if (!Number.isFinite(value)) return TAVERN_ACTIVITY_PAGE_SIZE;
  return Math.min(MAX_TAVERN_ACTIVITY_PAGE_SIZE, Math.max(1, Math.trunc(value || TAVERN_ACTIVITY_PAGE_SIZE)));
}

function normalizeTypeFilter(type?: string | null): ActivityEventType[] | null {
  if (!type || type === "all") return null;
  switch (type) {
    case "ratings":
      return [ActivityEventType.RATED, ActivityEventType.COMMENTED];
    case "lists":
      return [ActivityEventType.LIST_CREATED, ActivityEventType.LIST_GAME_ADDED];
    case "games":
      return [ActivityEventType.COLLECTION_ADDED, ActivityEventType.WANT_TO_PLAY, ActivityEventType.PLAYED];
    default:
      return null;
  }
}
