import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("production builds do not run database migrations", () => {
  const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
    scripts: Record<string, string>;
    prisma?: unknown;
  };

  assert.equal(packageJson.scripts.build, "prisma generate && next build");
  assert.equal(packageJson.scripts["db:deploy"], "prisma migrate deploy");
  assert.equal(packageJson.prisma, undefined);
});

test("Prisma CLI keeps migrations and seeding in the dedicated config", () => {
  const config = readFileSync("prisma.config.ts", "utf8");

  assert.match(config, /MIGRATION_DATABASE_URL/);
  assert.match(config, /DIRECT_URL/);
  assert.match(config, /path: "prisma\/migrations"/);
  assert.match(config, /seed: "tsx prisma\/seed\.ts"/);
});
