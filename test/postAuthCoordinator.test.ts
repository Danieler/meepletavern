import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("post-auth coordinator avoids auth/onboarding loops and executes pending actions once", () => {
  const coordinator = readFileSync("components/auth/PostAuthCoordinator.tsx", "utf8");

  assert.match(coordinator, /runningRef\.current/);
  assert.match(coordinator, /isAuthRoute\(pathname\)/);
  assert.match(coordinator, /pathname === "\/auth"/);
  assert.match(coordinator, /pathname === "\/bienvenida\/usuario"/);
  assert.match(coordinator, /window\.sessionStorage\.getItem\(usernameReadyKey\)/);
  assert.match(coordinator, /executePendingAction\(\)/);
  assert.match(coordinator, /pending_action_completed/);
  assert.match(coordinator, /pending_action_failed/);
});
