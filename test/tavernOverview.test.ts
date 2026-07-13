import test from "node:test";
import assert from "node:assert/strict";
import {
  ActivityEventType,
  ActivityEventVisibility,
  GameImageStatus,
  GameStatus,
  ProfileVisibility
} from "@prisma/client";
import { queryTavernOverview, TAVERN_RANKING_LIMIT } from "@/lib/tavernOverview";

test("queryTavernOverview uses bounded aggregates and one tiny game lookup", async () => {
  let activityArgs: Record<string, unknown> | undefined;
  const countArgs: Record<string, unknown>[] = [];
  const groupArgs: Record<string, unknown>[] = [];
  let gameArgs: Record<string, unknown> | undefined;
  const db = {
    activityEvent: {
      async findMany(args: Record<string, unknown>) {
        activityArgs = args;
        return [
          event("event-1", "game-1", ActivityEventType.COLLECTION_ADDED),
          event("event-2", "game-1", ActivityEventType.LIST_GAME_ADDED),
          event("event-3", "game-2", ActivityEventType.LIST_GAME_ADDED)
        ];
      },
      async count(args: Record<string, unknown>) {
        countArgs.push(args);
        return countArgs.length === 1 ? 4 : 9;
      }
    },
    userLibraryGame: {
      async groupBy(args: Record<string, unknown>) {
        groupArgs.push(args);
        const where = args.where as { wantToPlay?: boolean; played?: boolean };
        if (where.wantToPlay) return [{ gameId: "game-1", _count: { gameId: 3 } }];
        if ((where as { owned?: boolean }).owned) return [{ gameId: "game-2", _count: { gameId: 4 } }];
        return [{ gameId: "game-2", _count: { gameId: 2 } }];
      }
    },
    game: {
      async findMany(args: Record<string, unknown>) {
        gameArgs = args;
        return [game("game-1", "Ark Nova"), game("game-2", "Heat")];
      }
    }
  } as unknown as Parameters<typeof queryTavernOverview>[0];

  const overview = await queryTavernOverview(db);

  assert.equal(overview.recentGames.length, 2);
  assert.equal(overview.recentGames[0]?.title, "Ark Nova");
  assert.equal(overview.mostWanted[0]?.count, 3);
  assert.equal(overview.mostOwned[0]?.count, 4);
  assert.equal(overview.mostPlayed[0]?.count, 2);
  assert.equal(overview.highlights.weeklyLibraryAdds, 4);
  assert.equal(overview.highlights.weeklyActivityCount, 9);
  assert.deepEqual(overview.highlights.topWantedGame, {
    title: "Ark Nova",
    slug: "ark-nova",
    count: 3,
    coverImageUrl: null,
    coverImageAlt: ""
  });
  assert.equal(activityArgs?.take, 18);
  assert.deepEqual((activityArgs?.where as { visibility?: string }).visibility, ActivityEventVisibility.PUBLIC);
  assert.equal(groupArgs.length, 3);
  assert.equal(countArgs.length, 2);
  assert.equal(groupArgs[0]?.take, TAVERN_RANKING_LIMIT);

  const wantedWhere = groupArgs[0]?.where as {
    wantToPlay?: boolean;
    user?: { profile?: { is?: { profileVisibility?: string; collectionVisibility?: string } } };
  };
  assert.equal(wantedWhere.wantToPlay, true);
  assert.equal(wantedWhere.user?.profile?.is?.profileVisibility, ProfileVisibility.PUBLIC);
  assert.equal(wantedWhere.user?.profile?.is?.collectionVisibility, ProfileVisibility.PUBLIC);
  assert.deepEqual(
    (wantedWhere.user?.profile?.is as { NOT?: unknown })?.NOT,
    { username: { startsWith: "meeple-" } }
  );
  assert.deepEqual((gameArgs?.where as { status?: string }).status, GameStatus.published);
  assert.deepEqual(Object.keys(gameArgs?.select as Record<string, boolean>).sort(), [
    "coverImageAlt",
    "coverImageUrl",
    "id",
    "imageStatus",
    "name",
    "slug",
    "title"
  ]);
  assert.deepEqual(Object.keys(activityArgs?.select as Record<string, boolean>).sort(), [
    "actorNameSnapshot",
    "gameId",
    "listTitleSnapshot",
    "type"
  ]);
});

function event(id: string, gameId: string, type: ActivityEventType) {
  return {
    id,
    type,
    actorNameSnapshot: "Daniel",
    gameId,
    listTitleSnapshot: type === ActivityEventType.LIST_GAME_ADDED ? "Favoritos" : null,
    createdAt: new Date("2026-06-21T12:00:00.000Z")
  };
}

function game(id: string, title: string) {
  return {
    id,
    title,
    name: title,
    slug: title.toLowerCase().replace(/ /g, "-"),
    coverImageUrl: null,
    coverImageAlt: "",
    imageStatus: GameImageStatus.missing,
    year: 2023
  };
}
