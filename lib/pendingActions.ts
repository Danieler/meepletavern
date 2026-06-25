import type { GameRatingsData } from "@/lib/ratings/types";

export type PendingAction = {
  type: "LIBRARY_TOGGLE" | "RATE_GAME" | "SAVE_GAME";
  gameId: string;
  payload?: {
    key?: string;
    score?: number | string;
  };
};

const STORAGE_KEY = "meepletavern_pending_action";

export function setPendingAction(action: PendingAction) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(action));
}

export function getPendingAction(): PendingAction | null {
  if (typeof window === "undefined") return null;
  const data = sessionStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : null;
}

export function clearPendingAction() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}

export type PendingActionResult = {
  ok: boolean;
  type: "LIBRARY_TOGGLE" | "RATE_GAME" | "SAVE_GAME";
  action: PendingAction;
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
  
  clearPendingAction();
  
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
        return { ok: true, type: action.type, action, data };
      }
    }
    if (action.type === "RATE_GAME") {
      const response = await fetch("/api/account/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: action.gameId, score: Number(action.payload?.score) })
      });
      if (response.ok) {
        const data = await response.json().catch(() => null);
        return { ok: true, type: action.type, action, data };
      }
    }
  } catch (error) {
    console.error("Failed to execute pending action", error);
  }
  return { ok: false, type: action.type, action };
}
