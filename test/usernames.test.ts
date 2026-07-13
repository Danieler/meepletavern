import assert from "node:assert/strict";
import test from "node:test";
import {
  buildUsernameOnboardingPath,
  getUsernameValidationError,
  isSystemGeneratedUsername,
  normalizeUsername
} from "@/lib/usernames";

test("generated usernames require the mandatory choice step", () => {
  assert.equal(isSystemGeneratedUsername("meeple-a96d3388"), true);
  assert.equal(isSystemGeneratedUsername("meeple-a96d3388-2"), true);
  assert.equal(isSystemGeneratedUsername("daniel_juega"), false);
  assert.equal(buildUsernameOnboardingPath("/comunidad/tabernas?id=1"), "/bienvenida/usuario?next=%2Fcomunidad%2Ftabernas%3Fid%3D1");
});

test("public usernames are normalized and validated without using email", () => {
  assert.equal(normalizeUsername("  Daniel_Juega  "), "daniel_juega");
  assert.equal(getUsernameValidationError("daniel_juega"), null);
  assert.match(getUsernameValidationError("meeple-a96d3388") || "", /no está disponible/i);
  assert.match(getUsernameValidationError("daniel@email.com") || "", /solo puede contener/i);
});
