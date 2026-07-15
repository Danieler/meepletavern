"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  canReuseTavernMemberSearchPrefix,
  MAX_TAVERN_MEMBER_QUERY_LENGTH,
  matchesTavernMemberSearch,
  MIN_TAVERN_MEMBER_QUERY_LENGTH,
  normalizeTavernMemberSearch
} from "@/lib/tavernMemberSearchQuery";

const SEARCH_DELAY_MS = 375;
const MAX_CACHED_QUERIES = 12;
const MAX_SERVER_SUGGESTIONS = 8;
const CACHE_KEY_SEPARATOR = "\u0000";

export type TavernMemberSuggestion = {
  id: string;
  username: string;
  displayName: string;
};

type Options = {
  tavernId: string;
  enabled: boolean;
  value: string;
  selectedUsername: string | null;
};

export function useTavernMemberSuggestions({ tavernId, enabled, value, selectedUsername }: Options) {
  const query = useMemo(() => normalizeTavernMemberSearch(value), [value]);
  const cache = useRef(new Map<string, TavernMemberSuggestion[]>());
  const activeController = useRef<AbortController | null>(null);
  const requestVersion = useRef(0);
  const [suggestions, setSuggestions] = useState<TavernMemberSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchedQuery, setSearchedQuery] = useState("");

  const clear = useCallback(() => {
    requestVersion.current += 1;
    activeController.current?.abort();
    activeController.current = null;
    cache.current.clear();
    setSuggestions([]);
    setSearching(false);
    setSearchedQuery("");
  }, []);

  useEffect(() => {
    if (!enabled || query.length < MIN_TAVERN_MEMBER_QUERY_LENGTH || query === selectedUsername) {
      setSuggestions([]);
      setSearching(false);
      setSearchedQuery("");
      return;
    }

    const cacheKey = buildCacheKey(tavernId, query);
    const cached = readCached(cache.current, cacheKey);
    if (cached !== null) {
      setSuggestions(cached);
      setSearching(false);
      setSearchedQuery(query);
      return;
    }

    const reused = findReusableCachedPrefix(cache.current, tavernId, query);
    if (reused !== null) {
      remember(cache.current, cacheKey, reused);
      setSuggestions(reused);
      setSearching(false);
      setSearchedQuery(query);
      return;
    }

    const controller = new AbortController();
    const version = requestVersion.current + 1;
    requestVersion.current = version;
    activeController.current?.abort();
    activeController.current = controller;
    setSearching(true);
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/account/taverns/${tavernId}/member-search?q=${encodeURIComponent(query)}`,
          { cache: "no-store", signal: controller.signal }
        );
        const payload = (await response.json().catch(() => null)) as { users?: TavernMemberSuggestion[] } | null;
        if (!response.ok) throw new Error("No se pudieron buscar usuarios.");
        if (controller.signal.aborted || requestVersion.current !== version) return;
        const users = payload?.users || [];
        remember(cache.current, cacheKey, users);
        setSuggestions(users);
        setSearchedQuery(query);
      } catch {
        if (controller.signal.aborted || requestVersion.current !== version) return;
        setSuggestions([]);
        setSearchedQuery(query);
      } finally {
        if (!controller.signal.aborted && requestVersion.current === version) {
          activeController.current = null;
          setSearching(false);
        }
      }
    }, SEARCH_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
      if (activeController.current === controller) activeController.current = null;
    };
  }, [enabled, query, selectedUsername, tavernId]);

  return { query, suggestions, searching, searchedQuery, clear };
}

export {
  MAX_TAVERN_MEMBER_QUERY_LENGTH,
  MIN_TAVERN_MEMBER_QUERY_LENGTH,
  normalizeTavernMemberSearch as normalizeTavernMemberQuery
};

function remember(cache: Map<string, TavernMemberSuggestion[]>, query: string, users: TavernMemberSuggestion[]) {
  cache.delete(query);
  if (cache.size >= MAX_CACHED_QUERIES) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(query, users);
}

function readCached(cache: Map<string, TavernMemberSuggestion[]>, key: string) {
  const users = cache.get(key);
  if (users === undefined) return null;

  cache.delete(key);
  cache.set(key, users);
  return users;
}

function findReusableCachedPrefix(
  cache: Map<string, TavernMemberSuggestion[]>,
  tavernId: string,
  query: string
) {
  const tavernPrefix = `${tavernId}${CACHE_KEY_SEPARATOR}`;
  let bestPrefix = "";
  let bestUsers: TavernMemberSuggestion[] | null = null;

  for (const [key, users] of cache) {
    if (!key.startsWith(tavernPrefix)) continue;
    const prefix = key.slice(tavernPrefix.length);
    if (
      prefix.length > bestPrefix.length
      && canReuseTavernMemberSearchPrefix({
        prefix,
        query,
        resultCount: users.length,
        resultLimit: MAX_SERVER_SUGGESTIONS
      })
    ) {
      bestPrefix = prefix;
      bestUsers = users;
    }
  }

  return bestUsers?.filter((candidate) => matchesTavernMemberSearch(candidate, query)) ?? null;
}

function buildCacheKey(tavernId: string, query: string) {
  return `${tavernId}${CACHE_KEY_SEPARATOR}${query}`;
}
