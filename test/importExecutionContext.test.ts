import test from "node:test";
import assert from "node:assert/strict";
import {
  createImportExecutionContext,
  runTrackedExternalCall
} from "@/lib/import/importExecutionContext";

test("execution context caches calls within one import", async () => {
  const context = createImportExecutionContext();
  let calls = 0;

  const first = await context.withCache("source-search:a:earth", async () => {
    calls += 1;
    return ["earth"];
  });
  const second = await context.withCache("source-search:a:earth", async () => {
    calls += 1;
    return ["wrong"];
  });

  assert.deepEqual(first, ["earth"]);
  assert.deepEqual(second, ["earth"]);
  assert.equal(calls, 1);
  assert.deepEqual(context.cacheDiagnostics.map((entry) => entry.hit), [false, true]);
});

test("execution context allows at most one Tavily call by default", async () => {
  const previous = process.env.MASTER_IMPORT_TAVILY_MODE;
  process.env.MASTER_IMPORT_TAVILY_MODE = "missing_only";
  const context = createImportExecutionContext();

  const result = await runTrackedExternalCall(context, {
    type: "tavily_search",
    reason: "critical data missing",
    requireExplicitAllowance: true
  }, async () => "ok");

  await assert.rejects(
    () => runTrackedExternalCall(context, {
      type: "tavily_search",
      reason: "critical data still missing",
      requireExplicitAllowance: true
    }, async () => "not ok"),
    /bloqueado/
  );

  restoreEnv("MASTER_IMPORT_TAVILY_MODE", previous);
  assert.equal(result, "ok");
  assert.equal(context.diagnostics.filter((entry) => entry.type === "tavily_search" && entry.allowed).length, 1);
});

test("execution context blocks video search by default", () => {
  const previous = process.env.MASTER_IMPORT_VIDEO_SEARCH_MODE;
  delete process.env.MASTER_IMPORT_VIDEO_SEARCH_MODE;
  const context = createImportExecutionContext();

  assert.equal(context.canUseExternalCall("video_search", "master import default"), false);
  assert.equal(context.diagnostics.at(-1)?.allowed, false);

  restoreEnv("MASTER_IMPORT_VIDEO_SEARCH_MODE", previous);
});

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}
