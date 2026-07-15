import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  canEditTavernPlay,
  MAX_TAVERN_NAME_LENGTH,
  normalizeTavernName,
  normalizeTavernUsername,
  parseTavernRole
} from "@/lib/tavernGroups";
import {
  canReuseTavernMemberSearchPrefix,
  matchesTavernMemberSearch,
  MIN_TAVERN_MEMBER_QUERY_LENGTH,
  normalizeTavernMemberSearch
} from "@/lib/tavernMemberSearchQuery";

test("tavern input helpers normalize names, usernames and roles", () => {
  assert.equal(normalizeTavernName("  Los   del jueves  "), "Los del jueves");
  assert.equal(normalizeTavernName("x".repeat(100)).length, MAX_TAVERN_NAME_LENGTH);
  assert.equal(normalizeTavernUsername(" @Daniel "), "daniel");
  assert.equal(MIN_TAVERN_MEMBER_QUERY_LENGTH, 3);
  assert.equal(normalizeTavernMemberSearch("  @Los   Dados  "), "los dados");
  assert.equal(normalizeTavernMemberSearch("x".repeat(100)).length, 40);
  assert.equal(parseTavernRole("ADMIN"), "ADMIN");
  assert.throws(() => parseTavernRole("OWNER"), /rol no es válido/i);
});

test("member search safely reuses only complete cached prefixes", () => {
  const candidate = { username: "daniel", displayName: "Daniel Mesa" };

  assert.equal(matchesTavernMemberSearch(candidate, "DANI"), true);
  assert.equal(matchesTavernMemberSearch(candidate, "mesa"), true);
  assert.equal(matchesTavernMemberSearch(candidate, "otro"), false);
  assert.equal(canReuseTavernMemberSearchPrefix({
    prefix: "dani",
    query: "daniel",
    resultCount: 4,
    resultLimit: 8
  }), true);
  assert.equal(canReuseTavernMemberSearchPrefix({
    prefix: "dan",
    query: "dani",
    resultCount: 4,
    resultLimit: 8
  }), false);
  assert.equal(canReuseTavernMemberSearchPrefix({
    prefix: "dani",
    query: "daniel",
    resultCount: 8,
    resultLimit: 8
  }), false);
});

test("member suggestions debounce, bound their cache and ignore aborted responses", () => {
  const hook = readFileSync("hooks/useTavernMemberSuggestions.ts", "utf8");
  const members = readFileSync("components/taverns/TavernMembersClient.tsx", "utf8");

  assert.match(hook, /SEARCH_DELAY_MS = 375/);
  assert.match(hook, /MAX_CACHED_QUERIES = 12/);
  assert.match(hook, /controller\.signal\.aborted \|\| requestVersion\.current !== version/);
  assert.match(hook, /findReusableCachedPrefix/);
  assert.match(members, /memberSearchQuery\.length >= MIN_TAVERN_MEMBER_QUERY_LENGTH/);
  assert.doesNotMatch(members, /memberSearchQuery\.length >= 2/);
});

test("members edit their own plays while admins can edit any play", () => {
  assert.equal(canEditTavernPlay({ actorUserId: "u1", actorRole: "MEMBER", recordedByUserId: "u1" }), true);
  assert.equal(canEditTavernPlay({ actorUserId: "u1", actorRole: "MEMBER", recordedByUserId: "u2" }), false);
  assert.equal(canEditTavernPlay({ actorUserId: "u1", actorRole: "ADMIN", recordedByUserId: "u2" }), true);
});

test("tavern migration closes every private table to browser roles", () => {
  const migration = readFileSync("prisma/migrations/20260713120000_add_private_tavern_groups/migration.sql", "utf8");
  for (const table of ["TavernGroup", "TavernGroupMember", "TavernGroupInvitation", "TavernGroupPlay", "TavernGroupPlayParticipant"]) {
    assert.match(migration, new RegExp(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`));
    assert.match(migration, new RegExp(`REVOKE ALL ON TABLE "${table}" FROM anon, authenticated`));
  }
});
