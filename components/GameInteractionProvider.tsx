"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getPendingAction, executePendingAction } from "@/lib/pendingActions";
import { trackEvent } from "@/lib/privacySafeAnalytics";

type LibraryState = {
  owned: boolean;
  wantToPlay: boolean;
  wantToBuy: boolean;
  played: boolean;
};

type OwnComment = {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
} | null;

type GameInteractionContextType = {
  rating: string;
  setRating: React.Dispatch<React.SetStateAction<string>>;
  hasExistingScore: boolean;
  setHasExistingScore: React.Dispatch<React.SetStateAction<boolean>>;
  library: LibraryState;
  setLibrary: React.Dispatch<React.SetStateAction<LibraryState>>;
  playCount: number;
  setPlayCount: React.Dispatch<React.SetStateAction<number>>;
  comment: OwnComment;
  setComment: React.Dispatch<React.SetStateAction<OwnComment>>;
  loading: boolean;
  ready: boolean;
};

const GameInteractionContext = createContext<GameInteractionContextType | undefined>(undefined);

type CachedGameState = {
  rating: string;
  hasExistingScore: boolean;
  library: LibraryState;
  playCount: number;
  comment: OwnComment;
  fetchedUserId: string | null;
};

const gameStateCache: Record<string, CachedGameState> = {};

export function GameInteractionProvider({
  gameId,
  children
}: {
  gameId: string;
  children: React.ReactNode;
}) {
  const { user, loading: authLoading } = useAuth();
  
  const cached = gameStateCache[gameId];

  const [rating, setRating] = useState(() => cached?.rating ?? "8");
  const [hasExistingScore, setHasExistingScore] = useState(() => cached?.hasExistingScore ?? false);
  const [library, setLibrary] = useState<LibraryState>(() => cached?.library ?? {
    owned: false,
    wantToPlay: false,
    wantToBuy: false,
    played: false
  });
  const [playCount, setPlayCount] = useState(() => cached?.playCount ?? 0);
  const [comment, setComment] = useState<OwnComment>(() => cached?.comment ?? null);
  
  const [loading, setLoading] = useState(() => !cached);
  const [ready, setReady] = useState(() => !!cached);
  const [fetchedUserId, setFetchedUserId] = useState<string | null>(() => cached?.fetchedUserId ?? null);

  // Sync mutations back to the cache
  useEffect(() => {
    if (ready) {
      gameStateCache[gameId] = {
        rating,
        hasExistingScore,
        library,
        playCount,
        comment,
        fetchedUserId
      };
    }
  }, [gameId, rating, hasExistingScore, library, playCount, comment, fetchedUserId, ready]);

  useEffect(() => {
    // Check if there is an active Supabase session in cookies or localStorage.
    // This allows us to start fetching the game state immediately on mount
    // without waiting for the Auth SDK (useAuth) to finish initialization.
    const hasAuthCookie = typeof document !== "undefined" && document.cookie.split(";").some(item => item.trim().startsWith("sb-"));
    const hasLocalSession = typeof localStorage !== "undefined" && Object.keys(localStorage).some(key => key.startsWith("sb-") && key.endsWith("-auth-token"));
    const likelyLoggedIn = hasAuthCookie || hasLocalSession;

    // If we're not likely logged in and useAuth has resolved that there is no user:
    if (!likelyLoggedIn && !authLoading && !user) {
      setLoading(false);
      setReady(true);
      setRating("8");
      setHasExistingScore(false);
      setLibrary({ owned: false, wantToPlay: false, wantToBuy: false, played: false });
      setPlayCount(0);
      setComment(null);
      setFetchedUserId(null);
      return;
    }

    // If we have a resolved user, and we've already fetched the state for this user, do nothing
    if (user && fetchedUserId === user.id) {
      return;
    }

    // If we are not likely logged in but we are still loading auth, wait for it to resolve
    if (!likelyLoggedIn && authLoading) {
      return;
    }

    let active = true;
    if (!gameStateCache[gameId]) {
      setLoading(true);
    }

    const fetchState = () => {
      fetch(`/api/account/game-state?gameId=${encodeURIComponent(gameId)}`)
        .then(async (res) => {
          const data = await res.json().catch(() => null);
          if (!active) return;

          if (res.ok && data?.ok) {
            let updatedRating = "8";
            let updatedHasExistingScore = false;
            if (data.rating !== null) {
              updatedRating = String(data.rating);
              updatedHasExistingScore = true;
            }
            setRating(updatedRating);
            setHasExistingScore(updatedHasExistingScore);
            
            let updatedLibrary = { owned: false, wantToPlay: false, wantToBuy: false, played: false };
            if (data.library) {
              updatedLibrary = data.library;
              setLibrary(data.library);
            }
            
            const updatedPlayCount = data.playCount ?? 0;
            setPlayCount(updatedPlayCount);
            
            const updatedComment = data.comment;
            setComment(updatedComment);
            
            let updatedUserId = null;
            if (user) {
              updatedUserId = user.id;
              setFetchedUserId(user.id);
            }

            gameStateCache[gameId] = {
              rating: updatedRating,
              hasExistingScore: updatedHasExistingScore,
              library: updatedLibrary,
              playCount: updatedPlayCount,
              comment: updatedComment,
              fetchedUserId: updatedUserId
            };
          } else if (res.status === 401) {
            setRating("8");
            setHasExistingScore(false);
            setLibrary({ owned: false, wantToPlay: false, wantToBuy: false, played: false });
            setPlayCount(0);
            setComment(null);
            setFetchedUserId(null);
          }
          setReady(true);
        })
        .catch(() => {
          if (active) setReady(true);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    };

    if (user) {
      const action = getPendingAction();
      if (action && action.gameId === gameId) {
        executePendingAction().then((res) => {
          if (active) {
            trackEvent("pending_action_completed");
            if (res && res.ok && res.type === "RATE_GAME" && res.data?.ratings) {
              window.dispatchEvent(new CustomEvent("meepletavern:ratings-updated", { detail: res.data.ratings }));
            }
            fetchState();
          }
        });
        return;
      }
    }

    fetchState();

    return () => {
      active = false;
    };
  }, [gameId, user, authLoading, fetchedUserId]);

  return (
    <GameInteractionContext.Provider
      value={{
        rating,
        setRating,
        hasExistingScore,
        setHasExistingScore,
        library,
        setLibrary,
        playCount,
        setPlayCount,
        comment,
        setComment,
        loading: loading || authLoading,
        ready
      }}
    >
      {children}
    </GameInteractionContext.Provider>
  );
}

export function useGameInteraction() {
  const context = useContext(GameInteractionContext);
  if (context === undefined) {
    throw new Error("useGameInteraction must be used within a GameInteractionProvider");
  }
  return context;
}
