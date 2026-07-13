import test from "node:test";
import assert from "node:assert/strict";
import { ProfileVisibility } from "@prisma/client";
import { GAME_TAVERN_SAMPLE_LIMIT, queryGameTavernSummary } from "@/lib/gameTavernSummary";

test("getGameTavernSummary returns public counts and at most three tiny profile previews", async () => {
  let groupByArgs: Record<string, unknown> | undefined;
  let findManyArgs: Record<string, unknown> | undefined;
  let ratingArgs: Record<string, unknown> | undefined;
  const db = {
    userLibraryGame: {
      async groupBy(args: Record<string, unknown>) {
        groupByArgs = args;
        return [
          { owned: true, wantToPlay: false, played: true, _count: { _all: 2 } },
          { owned: false, wantToPlay: true, played: false, _count: { _all: 1 } }
        ];
      },
      async findMany(args: Record<string, unknown>) {
        findManyArgs = args;
        return [
          entry("user-1", "daniel", "Daniel", { owned: true, played: true, rating: 8 }),
          entry("user-2", "aitor", "Aitor", { wantToPlay: true }),
          entry("user-3", "laura", "Laura", { owned: true }),
          entry("user-4", "extra", "Extra", { owned: true })
        ];
      }
    },
    userGameRating: {
      async aggregate(args: Record<string, unknown>) {
        ratingArgs = args;
        return { _avg: { score: 8.35 }, _count: { _all: 2 } };
      }
    }
  } as unknown as NonNullable<Parameters<typeof queryGameTavernSummary>[1]>;

  const summary = await queryGameTavernSummary("game-1", db);

  assert.deepEqual(
    { ownedCount: summary.ownedCount, wantToPlayCount: summary.wantToPlayCount, playedCount: summary.playedCount },
    { ownedCount: 2, wantToPlayCount: 1, playedCount: 2 }
  );
  assert.equal(summary.communityRating, 8.4);
  assert.equal(summary.ratingCount, 2);
  assert.equal(summary.sampleUsers.length, GAME_TAVERN_SAMPLE_LIMIT);
  assert.deepEqual(summary.sampleUsers[0], {
    id: "user-1",
    name: "Daniel",
    username: "daniel",
    avatarUrl: null,
    status: "PLAYED",
    rating: 8
  });
  assert.equal(summary.sampleUsers[1]?.status, "WANT_TO_PLAY");
  assert.equal(summary.sampleUsers[2]?.status, "OWNED");

  const where = groupByArgs?.where as {
    gameId?: string;
    user?: { profile?: { is?: { profileVisibility?: string; collectionVisibility?: string } } };
  };
  assert.equal(where.gameId, "game-1");
  assert.equal(where.user?.profile?.is?.profileVisibility, ProfileVisibility.PUBLIC);
  assert.equal(where.user?.profile?.is?.collectionVisibility, ProfileVisibility.PUBLIC);
  assert.equal(findManyArgs?.take, GAME_TAVERN_SAMPLE_LIMIT);

  const select = findManyArgs?.select as {
    user?: {
      select?: {
        profile?: { select?: Record<string, boolean> };
        gameRatings?: { take?: number; select?: Record<string, boolean> };
      };
    };
  };
  assert.deepEqual(Object.keys(select.user?.select?.profile?.select || {}).sort(), ["avatarUrl", "displayName", "username"]);
  assert.equal(select.user?.select?.gameRatings, undefined);
  assert.deepEqual(ratingArgs?._avg, { score: true });
  assert.deepEqual(ratingArgs?._count, { _all: true });
});

function entry(
  userId: string,
  username: string,
  displayName: string,
  flags: { owned?: boolean; wantToPlay?: boolean; played?: boolean; rating?: number }
) {
  return {
    userId,
    owned: flags.owned || false,
    wantToPlay: flags.wantToPlay || false,
    played: flags.played || false,
    user: {
      profile: { username, displayName, avatarUrl: null },
      gameRatings: flags.rating === undefined ? [] : [{ score: flags.rating }]
    }
  };
}
