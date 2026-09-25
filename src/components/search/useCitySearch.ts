"use client";

import { useEffect, useRef, useState } from "react";
import type { CitySearchResult } from "@/lib/cities";
import { searchableQuery } from "@/lib/search-utils";
import { useAnalytics } from "@/lib/useAnalytics";

const DEBOUNCE_MS = 200;
const EMPTY: CitySearchResult[] = [];

export type CitySearchStatus = "idle" | "loading" | "ready";

interface SearchState {
  query: string | null;
  results: CitySearchResult[];
}

/**
 * Debounced, abortable city search against `search_cities` (anon
 * Supabase RPC, lazy-loaded on first use). Returns `idle` below two characters. Emits one `search`
 * analytics action per query session (reset when the field is cleared).
 */
export function useCitySearch(rawQuery: string, limit = 8) {
  const query = searchableQuery(rawQuery);
  const [state, setState] = useState<SearchState>({ query: null, results: EMPTY });
  const { trackAction } = useAnalytics();
  const trackedRef = useRef(false);

  useEffect(() => {
    if (!query) {
      trackedRef.current = false;
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      // Loaded on first search so the Supabase client (and zod, via env.ts)
      // stays out of every page's initial bundle.
      const { searchCities } = await import("@/lib/cities");
      const results = await searchCities(query, limit, controller.signal);
      if (controller.signal.aborted) return;
      setState({ query, results });
      if (results.length > 0 && !trackedRef.current) {
        trackedRef.current = true;
        trackAction("search");
      }
    }, DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, limit, trackAction]);

  if (!query) return { query, results: EMPTY, status: "idle" as CitySearchStatus };
  // While a new query is in flight keep showing the previous results so the
  // list does not flash empty between keystrokes.
  return {
    query,
    results: state.results,
    status: (state.query === query ? "ready" : "loading") as CitySearchStatus,
  };
}
