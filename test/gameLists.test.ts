import test from "node:test";
import assert from "node:assert/strict";
import { GameImageStatus, GameStatus } from "@prisma/client";
import {
  GAME_LIST_SEARCH_LIMIT,
  normalizeGameSearch,
  searchGamesForList
} from "@/lib/gameLists";

test("searchGamesForList keeps the catalog query small and explicit", async () => {
  let findManyArgs: Record<string, unknown> | undefined;
  const db = {
    game: {
      async findMany(args: Record<string, unknown>) {
        findManyArgs = args;
        return [
          {
            id: "game-1",
            title: "Ark Nova",
            name: "Ark Nova",
            slug: "ark-nova",
            coverImageUrl: null,
            coverImageAlt: "",
            imageStatus: GameImageStatus.missing,
            year: 2021
          }
        ];
      }
    }
  } as unknown as NonNullable<Parameters<typeof searchGamesForList>[1]>;

  const results = await searchGamesForList("  Ark   Nova  ", db);

  assert.equal(results.length, 1);
  assert.equal(results[0]?.title, "Ark Nova");
  assert.equal(findManyArgs?.take, GAME_LIST_SEARCH_LIMIT);
  assert.deepEqual(findManyArgs?.where, {
    status: GameStatus.published,
    OR: [
      { title: { contains: "Ark Nova", mode: "insensitive" } },
      { name: { contains: "Ark Nova", mode: "insensitive" } }
    ]
  });
  assert.deepEqual(Object.keys(findManyArgs?.select as Record<string, boolean>).sort(), [
    "coverImageAlt",
    "coverImageUrl",
    "id",
    "imageStatus",
    "name",
    "slug",
    "title",
    "year"
  ]);
  assert.equal("description" in (findManyArgs?.select as Record<string, boolean>), false);
  assert.equal("offers" in (findManyArgs?.select as Record<string, boolean>), false);
});

test("normalizeGameSearch requires three characters and caps oversized queries", () => {
  assert.equal(normalizeGameSearch("ab"), "");
  assert.equal(normalizeGameSearch("  brass   birmingham "), "brass birmingham");
  assert.equal(normalizeGameSearch("x".repeat(120)).length, 80);
});
