import { GameListVisibility, GameStatus, ProfileVisibility } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { TAVERN_ACTIVITY_CACHE_TAG } from "@/lib/activity/events";
import { auditDataSource } from "@/lib/egressAudit";
import { prisma } from "@/lib/prisma";
import type { TavernOverview, TavernRankedGame } from "@/lib/tavernOverview";

const TAVERN_NOW_REVALIDATE_SECONDS = 3600;

export type TavernNowGameSignal = {
  gameTitle: string;
  gameSlug: string;
  count: number;
  tagline: string;
};

export type TavernNowSummary = {
  mostWanted: TavernNowGameSignal | null;
  mostOwned: TavernNowGameSignal | null;
  latestRating: {
    gameTitle: string;
    gameSlug: string;
    rating: number;
    userName: string;
    userSlug: string;
  } | null;
  latestList: {
    listTitle: string;
    listSlug: string;
    userName: string;
    userSlug: string;
    gameCount: number;
  } | null;
};

type TavernNowDb = Pick<typeof prisma, "userGameRating" | "gameList">;

export async function queryLatestTavernNowSignals(db: TavernNowDb = prisma) {
  const [rating, list] = await Promise.all([
    db.userGameRating.findFirst({
      where: {
        user: { profile: { is: {
          profileVisibility: ProfileVisibility.PUBLIC
        } } },
        game: { status: GameStatus.published }
      },
      orderBy: [{ updatedAt: "desc" }, { userId: "asc" }, { gameId: "asc" }],
      select: {
        score: true,
        game: { select: { title: true, name: true, slug: true } },
        user: {
          select: {
            profile: { select: { username: true } }
          }
        }
      }
    }),
    db.gameList.findFirst({
      where: {
        visibility: GameListVisibility.PUBLIC,
        user: { profile: { is: {
          profileVisibility: ProfileVisibility.PUBLIC
        } } }
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: {
        name: true,
        slug: true,
        _count: { select: { items: true } },
        user: {
          select: {
            profile: { select: { username: true } }
          }
        }
      }
    })
  ]);
  const ratingProfile = rating?.user.profile;
  const listProfile = list?.user.profile;

  return auditDataSource("tavern.nowLatestSignals.db", {
    latestRating: rating && ratingProfile
      ? {
          gameTitle: rating.game.title.trim() || rating.game.name,
          gameSlug: rating.game.slug,
          rating: rating.score,
          userName: ratingProfile.username || "tabernero",
          userSlug: ratingProfile.username || "tabernero"
        }
      : null,
    latestList: list && listProfile
      ? {
          listTitle: list.name,
          listSlug: list.slug,
          userName: listProfile.username || "tabernero",
          userSlug: listProfile.username || "tabernero",
          gameCount: list._count.items
      }
      : null
  });
}

const getCachedLatestTavernNowSignals = unstable_cache(
  () => queryLatestTavernNowSignals(),
  ["tavern-now-latest-signals-v3"],
  { revalidate: TAVERN_NOW_REVALIDATE_SECONDS, tags: [TAVERN_ACTIVITY_CACHE_TAG, "public-games"] }
);

export async function getTavernNowSummary(overviewPromise: Promise<TavernOverview>): Promise<TavernNowSummary> {
  const [overview, latest] = await Promise.all([overviewPromise, getCachedLatestTavernNowSignals()]);

  return auditDataSource("tavern.nowSummary", {
    mostWanted: toNowGameSignal(overview.mostWanted?.[0], "Para tenerlo en el radar."),
    mostOwned: toNowGameSignal(overview.mostOwned?.[0], "Fácil de sacar a mesa."),
    ...latest
  });
}

function toNowGameSignal(game: TavernRankedGame | undefined, tagline: string): TavernNowGameSignal | null {
  return game
    ? { gameTitle: game.title, gameSlug: game.slug, count: game.count, tagline }
    : null;
}
