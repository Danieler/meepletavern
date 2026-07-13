"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MAX_TAVERN_MEMBER_QUERY_LENGTH,
  MIN_TAVERN_MEMBER_QUERY_LENGTH,
  normalizeTavernMemberSearch
} from "@/lib/tavernMemberSearchQuery";

const SEARCH_DELAY_MS = 250;
const MAX_CACHED_QUERIES = 20;

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
  const [suggestions, setSuggestions] = useState<TavernMemberSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchedQuery, setSearchedQuery] = useState("");

  const clear = useCallback(() => {
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

    const cacheKey = `${tavernId}:${query}`;
    const cached = cache.current.get(cacheKey);
    if (cached) {
      setSuggestions(cached);
      setSearching(false);
      setSearchedQuery(query);
      return;
    }

    const controller = new AbortController();
    setSearching(true);
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/account/taverns/${tavernId}/member-search?q=${encodeURIComponent(query)}`,
          { cache: "no-store", signal: controller.signal }
        );
        const payload = (await response.json().catch(() => null)) as { users?: TavernMemberSuggestion[] } | null;
        if (!response.ok) throw new Error("No se pudieron buscar usuarios.");
        const users = payload?.users || [];
        remember(cache.current, cacheKey, users);
        setSuggestions(users);
        setSearchedQuery(query);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setSuggestions([]);
          setSearchedQuery(query);
        }
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, SEARCH_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [enabled, query, selectedUsername, tavernId]);

  return { query, suggestions, searching, searchedQuery, clear };
}

export { MAX_TAVERN_MEMBER_QUERY_LENGTH, normalizeTavernMemberSearch as normalizeTavernMemberQuery };

function remember(cache: Map<string, TavernMemberSuggestion[]>, query: string, users: TavernMemberSuggestion[]) {
  if (cache.size >= MAX_CACHED_QUERIES) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(query, users);
}
