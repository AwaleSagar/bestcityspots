"use server";

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { getIntelligentTrendingCities } from "@/lib/intelligence";
import { getTopCities, City } from "@/lib/cities";
import { getServerClient } from "@/lib/supabase";

const fetchCachedTrendingDestinations = unstable_cache(
  async (): Promise<City[]> => {
    try {
      const aiCities = await getIntelligentTrendingCities();

      if (aiCities.length > 0) {
        return aiCities;
      }
    } catch (error) {
      console.warn("Failed to fetch AI trending destinations", error);
    }

    try {
      return getTopCities(5);
    } catch (error) {
      console.warn("Failed to fetch fallback trending destinations", error);
      return [];
    }
  },
  ["trending-destinations"],
  { revalidate: 3600, tags: ["trending"] }
);

// `cache()` still dedupes repeated calls within one render pass, while
// `unstable_cache()` persists the successful result across requests.
export const fetchTrendingDestinations = cache(async (): Promise<City[]> => {
  return fetchCachedTrendingDestinations();
});

/**
 * Audience-demand index — the cities YOUR visitors have actually viewed most
 * over the last 30 days (redesign 2026 H2 §3). Powers the homepage "living
 * index" so the front door quietly mirrors its own audience.
 *
 * Privacy posture: aggregate-only counts from `city_views_daily`, read
 * server-side via the service-role client (the table is RLS-locked to
 * authenticated/service). No per-visitor data leaves the server. Cached daily
 * so a homepage render never touches the analytics table directly.
 *
 * Graceful degradation: if analytics or the service client is unavailable
 * (e.g. local dev without SUPABASE_SERVICE_ROLE_KEY), falls back to the
 * trending destinations feed so the living index is never empty.
 */
const HOME_LIVING_INDEX_LIMIT = 6;
const DEMAND_WINDOW_DAYS = 30;

async function queryMostViewedCities(limit: number): Promise<City[]> {
  const serverClient = getServerClient();
  if (!serverClient) return [];

  const from = new Date(Date.now() - DEMAND_WINDOW_DAYS * 86_400_000).toISOString().slice(0, 10);

  const { data: viewRows, error } = await serverClient
    .from("city_views_daily")
    .select("city_id, views")
    .gte("stat_date", from);

  if (error || !viewRows || viewRows.length === 0) {
    if (error) console.warn("[audience] city_views_daily unavailable:", error.message);
    return [];
  }

  const totals = new Map<number, number>();
  for (const row of viewRows as Array<{ city_id: number; views: number | null }>) {
    totals.set(row.city_id, (totals.get(row.city_id) ?? 0) + (row.views ?? 0));
  }
  const rankedIds = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);
  if (rankedIds.length === 0) return [];

  const { data: cityRows, error: cityError } = await serverClient
    .from("cities")
    .select(
      "id, city, city_ascii, slug, country, lat, lng, population, admin_name, iso2, iso3, capital"
    )
    .in("id", rankedIds);
  if (cityError || !cityRows) return [];

  const byId = new Map((cityRows as City[]).map((c) => [c.id, c]));
  return rankedIds.map((id) => byId.get(id)).filter((c): c is City => Boolean(c));
}

const fetchCachedLivingIndex = unstable_cache(
  async (): Promise<City[]> => {
    try {
      const demand = await queryMostViewedCities(HOME_LIVING_INDEX_LIMIT);
      if (demand.length > 0) return demand;
    } catch (error) {
      console.warn("Failed to fetch audience-demand cities:", error);
    }
    // Fallback: trending feed (AI/cached) so the index is never empty.
    return fetchTrendingDestinations();
  },
  ["home-living-index"],
  { revalidate: 86_400, tags: ["living-index"] } // daily
);

export const fetchLivingIndexCities = cache(async (): Promise<City[]> => {
  return fetchCachedLivingIndex();
});

/**
 * Trending city IDs — the broader audience-demand set used by hub pages to
 * surface a "trending with readers" chip on cities in the analytics top decile
 * (redesign 2026 H2 §3). Aggregate-only, privacy-preserving.
 *
 * Returns an array (not a Set) because `unstable_cache` serializes the result
 * to JSON, which destroys Set identity. Callers convert to a Set for O(1)
 * membership checks. Empty on failure so hubs simply omit the chip — never
 * break rendering on an analytics outage.
 */
const fetchCachedTrendingIds = unstable_cache(
  async (): Promise<number[]> => {
    try {
      const demand = await queryMostViewedCities(12);
      return demand.map((c) => c.id);
    } catch {
      return [];
    }
  },
  ["trending-city-ids"],
  { revalidate: 86_400, tags: ["trending-ids"] }
);

export const fetchTrendingCityIds = cache(async (): Promise<number[]> => {
  return fetchCachedTrendingIds();
});
