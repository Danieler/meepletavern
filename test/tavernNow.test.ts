import test from "node:test";
import assert from "node:assert/strict";
import { GameListVisibility, GameStatus, ProfileVisibility } from "@prisma/client";
import { queryLatestTavernNowSignals, TAVERN_NOW_WINDOW_DAYS } from "@/lib/tavernNow";

test("queryLatestTavernNowSignals reads one tiny public rating and list", async () => {
  let ratingArgs: Record<string, unknown> | undefined;
  let listArgs: Record<string, unknown> | undefined;
  const db = {
    userGameRating: {
      async findFirst(args: Record<string, unknown>) {
        ratingArgs = args;
        return {
          score: 8,
          game: { title: "Wingspan", name: "Wingspan", slug: "wingspan" },
          user: { profile: { username: "daniel", displayName: "Daniel" } }
        };
      }
    },
    gameList: {
      async findFirst(args: Record<string, unknown>) {
        listArgs = args;
        return {
          name: "Favoritos familiares",
          slug: "favoritos-familiares",
          _count: { items: 6 },
          user: { profile: { username: "laura", displayName: "Laura" } }
        };
      }
    }
  } as unknown as Parameters<typeof queryLatestTavernNowSignals>[0];

  const result = await queryLatestTavernNowSignals(db);

  assert.deepEqual(result.latestRating, {
    gameTitle: "Wingspan",
    gameSlug: "wingspan",
    rating: 8,
    userName: "daniel",
    userSlug: "daniel"
  });
  assert.equal(result.latestList?.gameCount, 6);

  const ratingWhere = ratingArgs?.where as {
    updatedAt?: { gte?: Date };
    user?: { profile?: { is?: { profileVisibility?: string } } };
    game?: { status?: string };
  };
  assert.ok(ratingWhere.updatedAt?.gte instanceof Date);
  assert.equal(ratingWhere.user?.profile?.is?.profileVisibility, ProfileVisibility.PUBLIC);
  assert.equal(ratingWhere.game?.status, GameStatus.published);
  assert.deepEqual(Object.keys(ratingArgs?.select as Record<string, unknown>).sort(), ["game", "score", "user"]);

  const listWhere = listArgs?.where as {
    createdAt?: { gte?: Date };
    visibility?: string;
    items?: { some?: Record<string, never> };
    user?: { profile?: { is?: { profileVisibility?: string } } };
  };
  assert.ok(listWhere.createdAt?.gte instanceof Date);
  assert.equal(listWhere.visibility, GameListVisibility.PUBLIC);
  assert.deepEqual(listWhere.items, { some: {} });
  assert.equal(listWhere.user?.profile?.is?.profileVisibility, ProfileVisibility.PUBLIC);
  assert.deepEqual(Object.keys(listArgs?.select as Record<string, unknown>).sort(), ["_count", "name", "slug", "user"]);
  assert.equal(TAVERN_NOW_WINDOW_DAYS, 30);
});
