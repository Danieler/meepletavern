import test from "node:test";
import assert from "node:assert/strict";
import { ProfileVisibility } from "@prisma/client";
import { PUBLIC_USER_PAGE_SIZE, queryPublicUsersPage } from "@/lib/publicProfiles";

test("queryPublicUsersPage uses a bounded cursor page and aggregates only visible profiles", async () => {
  let findManyArgs: Record<string, unknown> | undefined;
  let groupByArgs: Record<string, unknown> | undefined;
  const profiles = Array.from({ length: PUBLIC_USER_PAGE_SIZE + 1 }, (_, index) => ({
    id: `profile-${index}`,
    userId: `user-${index}`,
    username: `usuario${index}`,
    displayName: `Usuario ${index}`,
    avatarUrl: null,
    collectionVisibility: ProfileVisibility.PUBLIC
  }));
  const db = {
    userProfile: {
      async findMany(args: Record<string, unknown>) {
        findManyArgs = args;
        return profiles;
      }
    },
    userLibraryGame: {
      async groupBy(args: Record<string, unknown>) {
        groupByArgs = args;
        return [
          {
            userId: "user-0",
            owned: true,
            wantToPlay: false,
            played: true,
            _count: { _all: 3 }
          }
        ];
      }
    }
  } as unknown as NonNullable<Parameters<typeof queryPublicUsersPage>[1]>;

  const page = await queryPublicUsersPage(
    { query: "  Daniel  ", cursor: "profile-before", limit: PUBLIC_USER_PAGE_SIZE },
    db
  );

  assert.equal(page.items.length, PUBLIC_USER_PAGE_SIZE);
  assert.equal(page.nextCursor, "profile-7");
  assert.deepEqual(page.items[0]?.stats, { owned: 3, wantToPlay: 0, played: 3 });
  assert.equal(findManyArgs?.take, PUBLIC_USER_PAGE_SIZE + 1);
  assert.deepEqual(findManyArgs?.cursor, { id: "profile-before" });
  assert.equal(findManyArgs?.skip, 1);
  assert.deepEqual(findManyArgs?.orderBy, [{ updatedAt: "desc" }, { id: "desc" }]);
  assert.deepEqual(findManyArgs?.where, {
    profileVisibility: ProfileVisibility.PUBLIC,
    NOT: { username: { startsWith: "meeple-" } },
    OR: [
      { username: { contains: "Daniel", mode: "insensitive" } },
      { displayName: { contains: "Daniel", mode: "insensitive" } }
    ]
  });

  const groupedWhere = groupByArgs?.where as { userId?: { in?: string[] } };
  assert.deepEqual(
    groupedWhere.userId?.in,
    Array.from({ length: PUBLIC_USER_PAGE_SIZE }, (_, index) => `user-${index}`)
  );
  assert.deepEqual(groupByArgs?.by, ["userId", "owned", "wantToPlay", "played"]);
});
