import test from "node:test";
import assert from "node:assert/strict";
import { ActivityEventType, ActivityEventVisibility } from "@prisma/client";
import { queryTavernActivityFeed, TAVERN_ACTIVITY_PAGE_SIZE } from "@/lib/activity/feed";

test("queryTavernActivityFeed reads a minimal bounded cursor page", async () => {
  let findManyArgs: Record<string, unknown> | undefined;
  const rows = Array.from({ length: TAVERN_ACTIVITY_PAGE_SIZE + 1 }, (_, index) => ({
    id: `event-${index}`,
    type: ActivityEventType.WANT_TO_PLAY,
    actorNameSnapshot: `Usuario ${index}`,
    actorUsernameSnapshot: `usuario${index}`,
    actorAvatarUrlSnapshot: null,
    gameTitleSnapshot: "Dune: Imperium",
    gameSlugSnapshot: "dune-imperium",
    listTitleSnapshot: null,
    listSlugSnapshot: null,
    rating: null,
    commentSnippet: null,
    createdAt: new Date(`2026-06-20T12:${String(index).padStart(2, "0")}:00.000Z`)
  }));
  const db = {
    activityEvent: {
      async findMany(args: Record<string, unknown>) {
        findManyArgs = args;
        return rows;
      }
    }
  } as unknown as NonNullable<Parameters<typeof queryTavernActivityFeed>[1]>;

  const feed = await queryTavernActivityFeed(
    { limit: TAVERN_ACTIVITY_PAGE_SIZE, cursor: "previous-event" },
    db
  );

  assert.equal(feed.items.length, TAVERN_ACTIVITY_PAGE_SIZE);
  assert.equal(feed.nextCursor, `event-${TAVERN_ACTIVITY_PAGE_SIZE - 1}`);
  assert.equal(feed.items[0]?.actorName, "Usuario 0");
  assert.equal(feed.items[0]?.createdAt, "2026-06-20T12:00:00.000Z");
  assert.deepEqual(findManyArgs?.where, { visibility: ActivityEventVisibility.PUBLIC });
  assert.equal(findManyArgs?.take, TAVERN_ACTIVITY_PAGE_SIZE + 1);
  assert.deepEqual(findManyArgs?.cursor, { id: "previous-event" });
  assert.equal(findManyArgs?.skip, 1);

  const select = findManyArgs?.select as Record<string, boolean>;
  assert.deepEqual(Object.keys(select).sort(), [
    "actorAvatarUrlSnapshot",
    "actorNameSnapshot",
    "actorUsernameSnapshot",
    "commentSnippet",
    "createdAt",
    "gameSlugSnapshot",
    "gameTitleSnapshot",
    "id",
    "listSlugSnapshot",
    "listTitleSnapshot",
    "rating",
    "type"
  ]);
  assert.equal("actorUser" in select, false);
  assert.equal("game" in select, false);
});

test("queryTavernActivityFeed searches public actor and game snapshots in the database", async () => {
  let findManyArgs: Record<string, unknown> | undefined;
  const db = {
    activityEvent: {
      async findMany(args: Record<string, unknown>) {
        findManyArgs = args;
        return [];
      }
    }
  } as unknown as NonNullable<Parameters<typeof queryTavernActivityFeed>[1]>;

  await queryTavernActivityFeed({ query: "  Toma 6  " }, db);

  assert.deepEqual(findManyArgs?.where, {
    visibility: ActivityEventVisibility.PUBLIC,
    OR: [
      { actorNameSnapshot: { contains: "Toma 6", mode: "insensitive" } },
      { actorUsernameSnapshot: { contains: "Toma 6", mode: "insensitive" } },
      { gameTitleSnapshot: { contains: "Toma 6", mode: "insensitive" } },
      { listTitleSnapshot: { contains: "Toma 6", mode: "insensitive" } }
    ]
  });
  assert.equal(findManyArgs?.take, TAVERN_ACTIVITY_PAGE_SIZE + 1);
});
