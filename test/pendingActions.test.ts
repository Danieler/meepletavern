import assert from "node:assert/strict";
import test from "node:test";
import {
  clearPendingAction,
  executePendingAction,
  getPendingAction,
  setPendingAction
} from "@/lib/pendingActions";

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  clear() {
    this.values.clear();
  }
}

test("pending actions are retained on temporary API failures and cleared on success", async () => {
  const local = new MemoryStorage();
  const session = new MemoryStorage();
  const previousWindow = globalThis.window;
  const previousLocalStorage = globalThis.localStorage;
  const previousSessionStorage = globalThis.sessionStorage;
  const previousFetch = globalThis.fetch;

  Object.assign(globalThis, {
    window: {},
    localStorage: local,
    sessionStorage: session
  });

  try {
    setPendingAction({ type: "SAVE_GAME", gameId: "game-1", payload: { key: "wantToBuy" } });
    assert.equal(getPendingAction()?.version, 2);

    globalThis.fetch = async () => new Response("{}", { status: 503 });
    const failed = await executePendingAction();
    assert.equal(failed?.ok, false);
    assert.equal(failed?.retryable, true);
    assert.equal(getPendingAction()?.type, "SAVE_GAME");

    globalThis.fetch = async () => Response.json({ ok: true, entry: null });
    const completed = await executePendingAction();
    assert.equal(completed?.ok, true);
    assert.equal(getPendingAction(), null);
  } finally {
    clearPendingAction();
    Object.assign(globalThis, {
      window: previousWindow,
      localStorage: previousLocalStorage,
      sessionStorage: previousSessionStorage,
      fetch: previousFetch
    });
  }
});
