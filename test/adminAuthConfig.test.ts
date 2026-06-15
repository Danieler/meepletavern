import test from "node:test";
import assert from "node:assert/strict";
import { readAdminAuthConfig } from "@/middleware";

test("readAdminAuthConfig requires explicit admin auth env vars in production", () => {
  assert.equal(readAdminAuthConfig("production", {}), null);
  assert.equal(
    readAdminAuthConfig("production", {
      ADMIN_USERNAME: "admin",
      ADMIN_PASSWORD: "meepletavern"
    }),
    null
  );
});

test("readAdminAuthConfig keeps local defaults outside production", () => {
  assert.deepEqual(readAdminAuthConfig("development", {}), {
    username: "admin",
    password: "meepletavern",
    sessionSecret: "meepletavern"
  });
});

test("readAdminAuthConfig uses explicit production credentials when present", () => {
  assert.deepEqual(
    readAdminAuthConfig("production", {
      ADMIN_USERNAME: "owner",
      ADMIN_PASSWORD: "strong-password",
      ADMIN_SESSION_SECRET: "separate-session-secret"
    }),
    {
      username: "owner",
      password: "strong-password",
      sessionSecret: "separate-session-secret"
    }
  );
});
