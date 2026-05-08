import { supabase } from "./supabase";
import { haversineKm } from "./geo";
import { LruCache } from "./cache";
import { minutes } from "./cache-config";
import { cache as reactCache } from "react";

export interface City {
  id: number;
  city: string;
  city_ascii: string;
  /**
   * URL-safe canonical slug (e.g. `lisbon-portugal`). Populated by the DB
   * trigger introduced in migration 202605080000_cities_slug_seo.sql. May be
   * undefined for very old rows that pre-date the migration; callers that
   * build URLs should fall back to the numeric `id`, which the slug-aware
   * route handler 308-redirects to the canonical slug.
   */
  slug?: string;
  lat: number;
  lng: number;
  country: string;
  iso2: string;
  iso3: string;
  admin_name: string;
  capital: string;
  population: number;
}

/**
 * Build the canonical, slug-based path to a city page. Falls back to the
 * numeric id when slug is missing — the city route then 308-redirects to the
 * canonical URL so search engines and shared links converge regardless.
 */
export function cityHref(
  city: Pick<City, "id" | "slug">,
  query?: { lat?: number; lng?: number }
) {
  const segment = city.slug && city.slug.length > 0 ? city.slug : String(city.id);
  const search =
    query && typeof query.lat === "number" && typeof query.lng === "number"
      ? `?lat=${query.lat}&lng=${query.lng}`
      : "";
  return `/cities/${segment}${search}`;
}

export interface CitySearchResult extends City {
  rank_score: number;
  match_type: "fts" | "fuzzy" | "alias";
}

// Bounded LRU with per-entry TTL. Replaces the prior FIFO map so hot
// autocomplete prefixes stay resident and stale entries don't linger.
const searchCache = new LruCache<string, CitySearchResult[]>(100);
const SEARCH_CACHE_TTL_MS = minutes(5);

function normalizeQuery(q: string) {
  return q.trim().toLowerCase();
}

async function queryCitiesInBox(lat: number, lng: number, boxSize: number, limit = 200) {
  try {
    const { data, error } = await supabase
      .from("cities")
      .select("id, city, city_ascii, slug, country, population, lat, lng, admin_name, capital")
      .gte("lat", lat - boxSize)
      .lte("lat", lat + boxSize)
      .gte("lng", lng - boxSize)
      .lte("lng", lng + boxSize)
      .order("population", { ascending: false, nullsFirst: false })
      .limit(limit);

    if (error) {
      console.warn("Error fetching nearby cities:", error);
      return [];
    }
    return (data ?? []) as City[];
  } catch (e) {
    console.warn("Error fetching nearby cities:", e);
    return [];
  }
}

function findNearest(cities: City[], lat: number, lng: number) {
  if (cities.length === 0) return null;
  return (
    cities.reduce(
      (best, city) => {
        const distance = haversineKm(lat, lng, city.lat, city.lng);
        if (!best) return { city, distance };
        return distance < best.distance ? { city, distance } : best;
      },
      null as { city: City; distance: number } | null
    )?.city ?? null
  );
}

export async function findNearestCity(lat: number, lng: number) {
  // Single bbox query at a generous radius (±10° ≈ ±1100km at the equator)
  // followed by in-process haversine sort. Replaces the prior waterfall of
  // up to 6 sequential round trips.
  const candidates = await queryCitiesInBox(lat, lng, 10, 500);
  const nearest = findNearest(candidates, lat, lng);
  if (nearest) return nearest;

  // Fallback for points with no city within ~1100km (open ocean, polar): pick
  // the nearest among the most populous cities globally.
  const fallback = await getTopCities(200);
  return findNearest(fallback, lat, lng);
}

/**
 * Elastic search: FTS + trigram fuzzy + alias matching via PostgreSQL RPC.
 * Results are ranked by relevance (match quality + population boost).
 */
export async function searchCities(
  query: string,
  limit = 10,
  signal?: AbortSignal
): Promise<CitySearchResult[]> {
  const cleanQuery = normalizeQuery(query);
  if (!cleanQuery || cleanQuery.length < 1) return [];
  if (signal?.aborted) return [];

  const cached = searchCache.get(cleanQuery);
  if (cached) return cached;

  try {
    const safeLimit = Math.max(1, Math.min(50, limit));

    const { data, error } = await supabase.rpc("search_cities_elastic", {
      query: cleanQuery,
      result_limit: safeLimit,
    });

    if (signal?.aborted) return [];
    if (error) {
      console.error("Error searching cities:", error);
      return [];
    }

    const results = (data ?? []) as CitySearchResult[];

    searchCache.set(cleanQuery, results, SEARCH_CACHE_TTL_MS);

    return results;
  } catch (e) {
    if (signal?.aborted) return [];
    console.error("Error searching cities:", e);
    return [];
  }
}

/**
 * Fetches the top cities globally by population.
 *
 * Wrapped with React `cache()` so multiple Server Component callers within
 * the same request (e.g. layout + page + sphere) share a single DB round
 * trip rather than re-querying.
 */
export const getTopCities = reactCache(async (limit = 10) => {
  try {
    // Allow larger batches for UI/background visualizations (e.g. tag spheres),
    // while still enforcing a reasonable upper bound.
    const safeLimit = Math.max(1, Math.min(200, limit));
    const { data, error } = await supabase
      .from("cities")
      .select(
        "id, city, city_ascii, slug, country, iso3, admin_name, capital, population, lat, lng"
      )
      .order("population", { ascending: false, nullsFirst: false })
      .limit(safeLimit);

    if (error) {
      console.error("Error fetching top cities:", error);
      return [];
    }

    return (data ?? []) as City[];
  } catch (e) {
    console.error("Error fetching top cities:", e);
    return [];
  }
});

/**
 * Fetches a single city by its ID.
 */
export async function getCityById(id: number) {
  try {
    const { data, error } = await supabase.from("cities").select("*").eq("id", id).single();

    if (error) {
      console.error(`Error fetching city with id ${id}:`, error);
      return null;
    }

    return data as City;
  } catch (e) {
    console.error(`Error fetching city with id ${id}:`, e);
    return null;
  }
}

/**
 * Fetches a single city by its canonical slug. Used by the slug-based route
 * handler so that `/cities/lisbon-portugal` resolves without a numeric-id
 * round trip.
 */
export async function getCityBySlug(slug: string) {
  try {
    const { data, error } = await supabase
      .from("cities")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      console.error(`Error fetching city with slug "${slug}":`, error);
      return null;
    }

    return (data ?? null) as City | null;
  } catch (e) {
    console.error(`Error fetching city with slug "${slug}":`, e);
    return null;
  }
}
