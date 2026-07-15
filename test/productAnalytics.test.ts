import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PRIVACY_SAFE_ANALYTICS_EVENTS } from "@/lib/privacySafeAnalytics";

test("product analytics exposes only the approved privacy-safe event names", () => {
  assert.deepEqual([...PRIVACY_SAFE_ANALYTICS_EVENTS], [
    "search_submitted",
    "filter_changed",
    "save_started",
    "auth_started",
    "auth_method_selected",
    "auth_completed",
    "pending_action_completed",
    "pending_action_failed"
  ]);
});

test("tracked product events avoid private identifiers and raw text", () => {
  const sources = [
    "components/GameSearch.tsx",
    "components/GameFilters.tsx",
    "components/GameLibraryPanel.tsx",
    "components/auth-cta/GameCardSaveButton.tsx",
    "components/auth-cta/AuthCtaButton.tsx",
    "components/auth-cta/AuthPromptModal.tsx",
    "components/auth/QuickAuthForm.tsx",
    "components/PendingActionSync.tsx",
    "components/auth/PostAuthCoordinator.tsx"
  ].map((file) => readFileSync(file, "utf8")).join("\n");

  assert.doesNotMatch(sources, /trackEvent\("auth_email_/);
  assert.doesNotMatch(sources, /trackEvent\("auth_provider_/);
  assert.doesNotMatch(sources, /trackEvent\("modal_closed"/);
  const calls = sources.match(/trackEvent\([^;]+/g) || [];
  for (const call of calls) {
    assert.doesNotMatch(call, /(email|username|userId|gameId|gameTitle|path|url|error|message)\s*:/i);
    assert.doesNotMatch(call, /(\bquery\b|\bsearch\b|\bq\b)\s*:/i);
  }
  assert.match(sources, /trackEvent\("search_submitted"/);
  assert.match(sources, /trackEvent\("filter_changed"/);
  assert.match(sources, /trackEvent\("save_started"/);
});

test("privacySafeAnalytics drops unsafe property names at runtime", () => {
  const analytics = readFileSync("lib/privacySafeAnalytics.ts", "utf8");

  assert.match(analytics, /unsafePropertyNamePattern/);
  assert.match(analytics, /email\|mail\|username/);
  assert.match(analytics, /gameid\|game_id\|title/);
  assert.match(analytics, /query\|search\|q\$/);
  assert.match(analytics, /path\|route\|url\|hash/);
  assert.match(analytics, /comment\|message\|error/);
});
