import test from "node:test";
import assert from "node:assert/strict";
import { rotateDaily } from "@/lib/dailyRotation";

const DAY_IN_MS = 86_400_000;

test("rotateDaily keeps the selection stable during the same day", () => {
  const games = ["A", "B", "C", "D"];
  const morning = 20_000 * DAY_IN_MS + 1_000;
  const evening = morning + DAY_IN_MS - 2_000;

  assert.deepEqual(rotateDaily(games, morning), rotateDaily(games, evening));
});

test("rotateDaily serves a different first game on the next day", () => {
  const games = ["A", "B", "C", "D"];
  const today = 20_000 * DAY_IN_MS;
  const tomorrow = today + DAY_IN_MS;

  assert.notEqual(rotateDaily(games, today)[0], rotateDaily(games, tomorrow)[0]);
  assert.deepEqual([...rotateDaily(games, tomorrow)].sort(), games);
});
