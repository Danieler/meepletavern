import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("community directory presents only completed useful public profiles by default", () => {
  const publicProfiles = readFileSync("lib/publicProfiles.ts", "utf8");

  assert.match(publicProfiles, /profileVisibility: ProfileVisibility\.PUBLIC/);
  assert.match(publicProfiles, /usernameSetupRequired: false/);
  assert.match(publicProfiles, /buildUsefulPublicProfileWhere/);
  assert.match(publicProfiles, /bio/);
  assert.match(publicProfiles, /avatarUrl/);
  assert.match(publicProfiles, /library/);
  assert.match(publicProfiles, /gameLists/);
  assert.match(publicProfiles, /items: \{ some: \{\} \}/);
  assert.match(publicProfiles, /activityEvents/);
});

test("community trends and now panels avoid misleading sparse signals", () => {
  const overview = readFileSync("lib/tavernOverview.ts", "utf8");
  const now = readFileSync("lib/tavernNow.ts", "utf8");

  assert.match(overview, /MIN_TRENDING_USER_COUNT = 3/);
  assert.match(overview, /group\.count >= MIN_TRENDING_USER_COUNT/);
  assert.match(now, /TAVERN_NOW_WINDOW_DAYS = 30/);
  assert.match(now, /items: \{ some: \{\} \}/);
});

test("empty lists and affinity archetypes are not presented as real user activity", () => {
  const listRoute = readFileSync("app/api/account/lists/route.ts", "utf8");
  const compatibility = readFileSync("components/home/CompatibilitySection.tsx", "utf8");

  assert.doesNotMatch(listRoute, /LIST_CREATED/);
  assert.doesNotMatch(compatibility, /Perfil Recomendado/);
  assert.match(compatibility, /Arquetipo de afinidad/);
});
