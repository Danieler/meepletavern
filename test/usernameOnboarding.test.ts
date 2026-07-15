import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("every authentication flow passes through mandatory username onboarding", () => {
  const authEntry = readFileSync("app/auth/page.tsx", "utf8");
  const authPage = readFileSync("components/auth/AuthPageClient.tsx", "utf8");
  const callback = readFileSync("app/auth/callback/route.ts", "utf8");
  const modal = readFileSync("components/auth-cta/AuthPromptModal.tsx", "utf8");
  const shell = readFileSync("components/PublicShell.tsx", "utf8");
  const guard = readFileSync("components/auth/UsernameChoiceGuard.tsx", "utf8");
  const middleware = readFileSync("middleware.ts", "utf8");

  assert.match(authEntry, /requireCurrentAppUser/);
  assert.match(authEntry, /usernameSetupRequired === true/);
  assert.match(authEntry, /if \(account\) \{\s*redirect\(/);
  assert.match(authPage, /payload\?\.required \? buildUsernameOnboardingPath\(nextPath\) : nextPath/);
  assert.match(callback, /usernameSetupRequired/);
  assert.match(callback, /buildUsernameOnboardingPath\(next\)/);
  assert.match(modal, /buildUsernameOnboardingPath\(next\)/);
  assert.match(shell, /<UsernameChoiceGuard \/>/);
  assert.match(guard, /pathname === "\/auth"/);
  assert.match(guard, /pathname === "\/bienvenida\/usuario"/);
  assert.match(middleware, /await supabaseClient\.supabase\.auth\.getUser\(\)/);
  assert.match(middleware, /"\/comunidad\/tabernas\/:path\*"/);
});

test("the required username form sends no email or display name", () => {
  const form = readFileSync("components/auth/ChooseUsernameClient.tsx", "utf8");

  assert.match(form, /body: JSON\.stringify\(\{ username \}\)/);
  assert.match(form, /sessionStorage\.setItem\(`meepletavern_username_ready:\$\{user\.id\}`,\s*"1"\)/);
  assert.doesNotMatch(form, /type="email"/);
  assert.doesNotMatch(form, /JSON\.stringify\(\{[^}]*email/);
});

test("legacy usernames stay valid while only new profiles require setup", () => {
  const migration = readFileSync(
    "prisma/migrations/20260713160000_require_username_for_new_profiles/migration.sql",
    "utf8"
  );
  const accounts = readFileSync("lib/userAccounts.ts", "utf8");
  const usernameApi = readFileSync("app/api/account/username/route.ts", "utf8");

  assert.match(migration, /"usernameSetupRequired" BOOLEAN NOT NULL DEFAULT false/);
  assert.match(accounts, /usernameSetupRequired: true/);
  assert.match(usernameApi, /usernameSetupRequired: false/);
});
