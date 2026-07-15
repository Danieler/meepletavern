import type { GameRatingsData } from "@/lib/ratings/types";

export type PendingActionType = "LIBRARY_TOGGLE" | "RATE_GAME" | "SAVE_GAME";

export type PendingAction = {
  version?: 1 | 2;
  id?: string;
  type: "LIBRARY_TOGGLE" | "RATE_GAME" | "SAVE_GAME";
  gameId: string;
  payload?: {
    key?: string;
    score?: number | string;
  };
  returnTo?: string;
  source?: string;
  createdAt?: number;
  expiresAt?: number;
  attempts?: number;
};

const STORAGE_KEY = "meepletavern_pending_action";
const PENDING_ACTION_TTL_MS = 30 * 60 * 1000;
const VALID_LIBRARY_KEYS = new Set(["owned", "wantToPlay", "wantToBuy", "played"]);
const VALID_TYPES = new Set<PendingActionType>(["LIBRARY_TOGGLE", "RATE_GAME", "SAVE_GAME"]);

export function setPendingAction(action: PendingAction) {
  if (typeof window === "undefined") return;
  const now = Date.now();
  const next: PendingAction = {
    version: 2,
    id: action.id || createPendingActionId(),
    type: action.type,
    gameId: action.gameId,
    payload: sanitizePayload(action),
    returnTo: sanitizeReturnTo(action.returnTo),
    source: sanitizeSource(action.source),
    createdAt: action.createdAt || now,
    expiresAt: action.expiresAt || now + PENDING_ACTION_TTL_MS,
    attempts: action.attempts || 0
  };
  writePendingAction(next);
}

export function getPendingAction(): PendingAction | null {
  if (typeof window === "undefined") return null;
  const data = readRawPendingAction();
  if (!data) return null;

  try {
    const action = normalizePendingAction(JSON.parse(data));
    if (!action) {
      clearPendingAction();
      return null;
    }
    if (action.expiresAt && action.expiresAt < Date.now()) {
      clearPendingAction();
      return null;
    }
    writePendingAction(action);
    return action;
  } catch {
    clearPendingAction();
    return null;
  }
}

export type PendingActionResult = {
  ok: boolean;
  type: PendingActionType;
  action: PendingAction;
  status?: number;
  retryable?: boolean;
  data?: {
    ratings?: GameRatingsData;
    score?: number;
    entry?: {
      gameId: string;
      owned: boolean;
      wantToPlay: boolean;
      wantToBuy: boolean;
      played: boolean;
    } | null;
  } | null;
};

export async function executePendingAction(): Promise<PendingActionResult | null> {
  const action = getPendingAction();
  if (!action) return null;

  try {
    if (action.type === "LIBRARY_TOGGLE" || action.type === "SAVE_GAME") {
      const key = action.payload?.key || "wantToBuy";
      const response = await fetch("/api/account/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: action.gameId, [key]: true })
      });
      if (response.ok) {
        const data = await response.json().catch(() => null);
        clearPendingAction(action.id);
        return { ok: true, type: action.type, action, data };
      }
      return handlePendingActionFailure(action, response.status);
    }
    if (action.type === "RATE_GAME") {
      const response = await fetch("/api/account/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: action.gameId, score: Number(action.payload?.score) })
      });
      if (response.ok) {
        const data = await response.json().catch(() => null);
        clearPendingAction(action.id);
        return { ok: true, type: action.type, action, data };
      }
      return handlePendingActionFailure(action, response.status);
    }
  } catch {
    return handlePendingActionFailure(action, 0);
  }
  clearPendingAction(action.id);
  return { ok: false, type: action.type, action, retryable: false };
}

function handlePendingActionFailure(action: PendingAction, status: number): PendingActionResult {
  const retryable = status === 0 || status === 401 || status === 408 || status === 429 || status >= 500;
  const attempts = (action.attempts || 0) + 1;
  const shouldKeep = retryable && attempts <= 2;

  if (shouldKeep) {
    writePendingAction({ ...action, attempts });
  } else {
    clearPendingAction(action.id);
  }

  return { ok: false, type: action.type, action: { ...action, attempts }, status, retryable };
}

function normalizePendingAction(value: unknown): PendingAction | null {
  if (!value || typeof value !== "object") return null;
  const input = value as PendingAction;
  if (!VALID_TYPES.has(input.type) || typeof input.gameId !== "string" || !input.gameId.trim()) {
    return null;
  }

  return {
    version: 2,
    id: typeof input.id === "string" && input.id ? input.id : createPendingActionId(),
    type: input.type,
    gameId: input.gameId.trim(),
    payload: sanitizePayload(input),
    returnTo: sanitizeReturnTo(input.returnTo),
    source: sanitizeSource(input.source),
    createdAt: typeof input.createdAt === "number" ? input.createdAt : Date.now(),
    expiresAt: typeof input.expiresAt === "number" ? input.expiresAt : Date.now() + PENDING_ACTION_TTL_MS,
    attempts: typeof input.attempts === "number" ? Math.max(0, input.attempts) : 0
  };
}

function sanitizePayload(action: PendingAction) {
  if (action.type === "RATE_GAME") {
    const score = Number(action.payload?.score);
    return Number.isFinite(score) && score >= 1 && score <= 10 ? { score } : undefined;
  }

  const key = action.payload?.key;
  return typeof key === "string" && VALID_LIBRARY_KEYS.has(key) ? { key } : { key: "wantToBuy" };
}

function sanitizeReturnTo(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return undefined;
  }
  return value.slice(0, 400);
}

function sanitizeSource(value: unknown) {
  return typeof value === "string" && /^[\w-]{1,40}$/.test(value) ? value : undefined;
}

function readRawPendingAction() {
  try {
    return localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writePendingAction(action: PendingAction) {
  try {
    const value = JSON.stringify(action);
    localStorage.setItem(STORAGE_KEY, value);
    sessionStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Ignore storage failures; pending actions are a convenience layer.
  }
}

export function clearPendingAction(actionId?: string) {
  if (typeof window === "undefined") return;
  if (actionId) {
    const current = getPendingAction();
    if (current?.id && current.id !== actionId) return;
  }
  try {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
}

function createPendingActionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
