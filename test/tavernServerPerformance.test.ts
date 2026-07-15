import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("private tavern renders reuse request-scoped account and summary work", () => {
  const accountCache = readFileSync("lib/accountRequestCache.ts", "utf8");
  const tavernCache = readFileSync("lib/tavernRequestCache.ts", "utf8");
  const tavernGroups = readFileSync("lib/tavernGroups.ts", "utf8");

  assert.match(accountCache, /requireCurrentAppUserForRsc\s*=\s*cache\(requireCurrentAppUser\)/);
  assert.match(tavernCache, /getTavernGroupSummaryForRsc\s*=\s*cache\(getTavernGroupSummary\)/);
  assert.match(tavernGroups, /WHERE membership\."tavernId" = \$\{tavernId\}/);
  assert.match(tavernGroups, /AND membership\."userId" = \$\{userId\}/);
});

test("my taverns combines groups and invitations in one bounded query", () => {
  const groups = readFileSync("lib/tavernGroups.ts", "utf8");

  assert.match(groups, /WITH dashboard_taverns AS/);
  assert.match(groups, /pending_invitations AS/);
  assert.match(groups, /FROM dashboard_taverns\s+UNION ALL/);
  assert.doesNotMatch(groups, /const \[tavernRows, invitations\] = await Promise\.all/);
});

test("tavern plays page uses presentation-specific loaders", () => {
  const page = readFileSync("app/comunidad/tabernas/[tavernId]/partidas/page.tsx", "utf8");

  assert.match(page, /getTavernGroupPlayFormOptionsForMember\(tavernId\)/);
  assert.match(page, /getTavernGroupPlayHistoryForMember\(user\.id, tavernId, tavern\.role, filters\?\.page\)/);
  assert.doesNotMatch(page, /getTavernGroupMembersForMember/);
  assert.doesNotMatch(page, /getTavernGroupPlaysForMember/);
});

test("tavern play form options share one database round trip", () => {
  const groups = readFileSync("lib/tavernGroups.ts", "utf8");

  assert.match(groups, /getTavernGroupPlayFormOptionsForMember/);
  assert.match(groups, /WITH game_options AS/);
  assert.match(groups, /member_options AS/);
  assert.match(groups, /UNION ALL/);
});

test("tavern play history is bounded and paginated without a count query", () => {
  const groups = readFileSync("lib/tavernGroups.ts", "utf8");
  const plays = readFileSync("components/taverns/TavernPlaysClient.tsx", "utf8");

  assert.match(groups, /TAVERN_PLAYS_PAGE_SIZE = 20/);
  assert.match(groups, /take: TAVERN_PLAYS_PAGE_SIZE \+ 1/);
  assert.match(groups, /hasNext: plays\.length > TAVERN_PLAYS_PAGE_SIZE/);
  assert.match(plays, /Páginas del historial de partidas/);
});

test("tavern library sends one small page without a count query", () => {
  const page = readFileSync("app/comunidad/tabernas/[tavernId]/page.tsx", "utf8");
  const groups = readFileSync("lib/tavernGroups.ts", "utf8");

  assert.match(page, /getTavernGroupLibraryPageForMember/);
  assert.match(groups, /TAVERN_LIBRARY_PAGE_SIZE = 24/);
  assert.match(groups, /take: TAVERN_LIBRARY_PAGE_SIZE \+ 1/);
  assert.match(groups, /hasNext: rows\.length > TAVERN_LIBRARY_PAGE_SIZE/);
  assert.doesNotMatch(page, /getTavernGroupLibraryPreviewForMember/);
});
