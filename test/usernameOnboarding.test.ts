import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("every authentication flow passes through mandatory username onboarding", () => {
  const authPage = readFileSync("components/auth/AuthPageClient.tsx", "utf8");
  const callback = readFileSync("app/auth/callback/route.ts", "utf8");
  const modal = readFileSync("components/auth-cta/AuthPromptModal.tsx", "utf8");
  const shell = readFileSync("components/PublicShell.tsx", "utf8");

  assert.match(authPage, /buildUsernameOnboardingPath\(nextPath\)/);
  assert.match(callback, /isSystemGeneratedUsername/);
  assert.match(callback, /buildUsernameOnboardingPath\(next\)/);
  assert.match(modal, /buildUsernameOnboardingPath\(next\)/);
  assert.match(shell, /<UsernameChoiceGuard \/>/);
});

test("the required username form sends no email or display name", () => {
  const form = readFileSync("components/auth/ChooseUsernameClient.tsx", "utf8");

  assert.match(form, /body: JSON\.stringify\(\{ username \}\)/);
  assert.doesNotMatch(form, /type="email"/);
  assert.doesNotMatch(form, /JSON\.stringify\(\{[^}]*email/);
});
