import test from "node:test";
import assert from "node:assert/strict";
import { ActivityEventType, GameListVisibility, ProfileVisibility } from "@prisma/client";
import {
  recordPublicActivityEvent,
  recordPublicListActivityEvent,
  truncateActivityComment
} from "@/lib/activity/events";

test("recordPublicActivityEvent stores only safe snapshots and a stable dedupe key", async () => {
  let upsertArgs: Record<string, unknown> | undefined;
  let deleteCalls = 0;
  const db = {
    activityEvent: {
      async upsert(args: Record<string, unknown>) {
        upsertArgs = args;
        return {};
      },
      async deleteMany() {
        deleteCalls += 1;
        return { count: 0 };
      }
    }
  } as unknown as NonNullable<Parameters<typeof recordPublicActivityEvent>[1]>;

  const changed = await recordPublicActivityEvent(
    {
      type: ActivityEventType.WANT_TO_PLAY,
      actor: actor(),
      game: { id: "game-1", slug: "ark-nova", title: "Ark Nova", name: "Ark Nova" },
      requiresPublicCollection: true
    },
    db
  );

  assert.equal(changed, true);
  assert.equal(deleteCalls, 0);
  assert.deepEqual(upsertArgs?.where, { dedupeKey: "WANT_TO_PLAY:user-1:game-1" });
  const create = upsertArgs?.create as Record<string, unknown>;
  assert.equal(create.actorNameSnapshot, "Daniel");
  assert.equal(create.actorUsernameSnapshot, "daniel");
  assert.equal(create.actorAvatarUrlSnapshot, "https://example.com/avatar.jpg");
  assert.equal(create.gameTitleSnapshot, "Ark Nova");
  assert.equal(create.gameSlugSnapshot, "ark-nova");
  assert.equal("email" in create, false);
  assert.equal("profile" in create, false);
});

test("recordPublicActivityEvent removes stale collection activity when the collection is private", async () => {
  let deletedKey = "";
  let upsertCalls = 0;
  const db = {
    activityEvent: {
      async upsert() {
        upsertCalls += 1;
        return {};
      },
      async deleteMany(args: { where: { dedupeKey: string } }) {
        deletedKey = args.where.dedupeKey;
        return { count: 1 };
      }
    }
  } as unknown as NonNullable<Parameters<typeof recordPublicActivityEvent>[1]>;
  const privateActor = actor();
  privateActor.profile.collectionVisibility = ProfileVisibility.PRIVATE;

  const changed = await recordPublicActivityEvent(
    {
      type: ActivityEventType.COLLECTION_ADDED,
      actor: privateActor,
      game: { id: "game-1", slug: "heat", title: "Heat", name: "Heat" },
      requiresPublicCollection: true
    },
    db
  );

  assert.equal(changed, true);
  assert.equal(upsertCalls, 0);
  assert.equal(deletedKey, "COLLECTION_ADDED:user-1:game-1");
});

test("system-generated usernames never create public activity", async () => {
  let upsertCalls = 0;
  const db = {
    activityEvent: {
      async upsert() {
        upsertCalls += 1;
        return {};
      },
      async deleteMany() {
        return { count: 0 };
      }
    }
  } as unknown as NonNullable<Parameters<typeof recordPublicActivityEvent>[1]>;
  const incompleteActor = actor();
  incompleteActor.profile.username = "meeple-a96d3388";

  const changed = await recordPublicActivityEvent(
    {
      type: ActivityEventType.PLAYED,
      actor: incompleteActor,
      game: { id: "game-1", slug: "heat", title: "Heat", name: "Heat" }
    },
    db
  );

  assert.equal(changed, false);
  assert.equal(upsertCalls, 0);
});

test("truncateActivityComment normalizes whitespace and truncates snippets", () => {
  assert.equal(truncateActivityComment("  Muy bueno\n  a cuatro jugadores  "), "Muy bueno a cuatro jugadores");
  assert.equal(truncateActivityComment("123456789", 8), "12345...");
});

test("recordPublicListActivityEvent stores only compact public list snapshots", async () => {
  let upsertArgs: Record<string, unknown> | undefined;
  const db = {
    activityEvent: {
      async upsert(args: Record<string, unknown>) {
        upsertArgs = args;
        return {};
      }
    }
  } as unknown as NonNullable<Parameters<typeof recordPublicListActivityEvent>[1]>;

  const changed = await recordPublicListActivityEvent(
    {
      type: ActivityEventType.LIST_GAME_ADDED,
      actor: actor(),
      list: {
        id: "list-1",
        name: "Juegos en familia",
        slug: "juegos-en-familia",
        visibility: GameListVisibility.PUBLIC
      },
      game: { id: "game-1", slug: "ark-nova", title: "Ark Nova", name: "Ark Nova" }
    },
    db
  );

  assert.equal(changed, true);
  assert.deepEqual(upsertArgs?.where, { dedupeKey: "LIST_GAME_ADDED:user-1:list-1:game-1" });
  const create = upsertArgs?.create as Record<string, unknown>;
  assert.equal(create.listTitleSnapshot, "Juegos en familia");
  assert.equal(create.listSlugSnapshot, "juegos-en-familia");
  assert.equal(create.gameTitleSnapshot, "Ark Nova");
  assert.equal("list" in create, false);
  assert.equal("actor" in create, false);
});

function actor() {
  return {
    id: "user-1",
    displayName: "Daniel Cuenta",
    profile: {
      username: "daniel",
      displayName: "Daniel",
      avatarUrl: "https://example.com/avatar.jpg",
      profileVisibility: ProfileVisibility.PUBLIC as ProfileVisibility,
      collectionVisibility: ProfileVisibility.PUBLIC as ProfileVisibility
    }
  };
}
