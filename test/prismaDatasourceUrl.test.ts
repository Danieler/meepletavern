import assert from "node:assert/strict";
import test from "node:test";
import { getRuntimeDatasourceUrl } from "@/lib/prismaDatasourceUrl";

test("development uses the stable direct connection with a bounded Prisma pool", () => {
  const result = getRuntimeDatasourceUrl({
    nodeEnv: "development",
    databaseUrl: "postgresql://user:pass@pool.example.test:6543/app?pgbouncer=true",
    directUrl: "postgresql://user:pass@db.example.test:5432/app"
  });
  const url = new URL(result!);

  assert.equal(url.host, "db.example.test:5432");
  assert.equal(url.searchParams.get("connection_limit"), "5");
  assert.equal(url.searchParams.get("pool_timeout"), "30");
  assert.equal(url.searchParams.get("connect_timeout"), "10");
});

test("production keeps the pooler and respects explicit connection settings", () => {
  const result = getRuntimeDatasourceUrl({
    nodeEnv: "production",
    databaseUrl: "postgresql://user:pass@pool.example.test:6543/app?pgbouncer=true&connection_limit=3&pool_timeout=45",
    directUrl: "postgresql://user:pass@db.example.test:5432/app",
    connectionLimit: "9"
  });
  const url = new URL(result!);

  assert.equal(url.host, "pool.example.test:6543");
  assert.equal(url.searchParams.get("connection_limit"), "3");
  assert.equal(url.searchParams.get("pool_timeout"), "45");
});
