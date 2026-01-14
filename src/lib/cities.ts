import { supabase } from "./supabase";

export interface City {
  id: number;
  city: string;
  city_ascii: string;
  lat: number;
  lng: number;
  country: string;
  iso2: string;
  iso3: string;
  admin_name: string;
  capital: string;
  population: number;
}

// Basic client-side cache for search results
const searchCache = new Map<string, City[]>();

function normalizeQuery(q: string) {
  return q.trim().toLowerCase();
}

function cityMatchesQuery(c: City, q: string) {
  const city = (c.city_ascii || c.city || "").toLowerCase();
  const country = (c.country || "").toLowerCase();
  return city.includes(q) || country.includes(q);
}

/**
 * Searches for cities by name.
 * Optimized with column selection and internal caching.
 */
export async function searchCities(query: string, limit = 10, signal?: AbortSignal) {
  const cleanQuery = normalizeQuery(query);
  if (!cleanQuery || cleanQuery.length < 2) return [];
  if (signal?.aborted) return [];

  // Check cache first
  if (searchCache.has(cleanQuery)) {
    return searchCache.get(cleanQuery) || [];
  }

  // Incremental optimization: if we already have results for a shorter prefix,
  // filter them client-side to avoid a DB request while the user keeps typing.
  // (Works especially well for fast typers on higher-latency networks.)
  let bestPrefix: string | null = null;
  for (const k of searchCache.keys()) {
    if (cleanQuery.startsWith(k) && (bestPrefix === null || k.length > bestPrefix.length)) {
      bestPrefix = k;
    }
  }
  if (bestPrefix) {
    const base = searchCache.get(bestPrefix) || [];
    const filtered = base
      .filter((c) => cityMatchesQuery(c, cleanQuery))
      .slice(0, Math.max(1, Math.min(50, limit)));
    if (filtered.length > 0) {
      searchCache.set(cleanQuery, filtered);
      return filtered;
    }
  }

  try {
    const safeLimit = Math.max(1, Math.min(50, limit));

    // Note: supabase-js doesn't support AbortSignal directly; we guard by ignoring results if aborted.
    const { data, error } = await supabase
      .from("cities")
      .select("id, city, city_ascii, country, population, lat, lng, admin_name, capital")
      .or(`city_ascii.ilike.%${cleanQuery}%,country.ilike.%${cleanQuery}%,admin_name.ilike.%${cleanQuery}%`)
      .order("population", { ascending: false, nullsFirst: false })
      .limit(safeLimit);

    if (signal?.aborted) return [];
    if (error) {
      console.error("Error searching cities:", error);
      return [];
    }

    // Cache the result
    if (data) {
      searchCache.set(cleanQuery, data as City[]);

      // Keep cache size manageable
      if (searchCache.size > 100) {
        const firstKey = searchCache.keys().next().value;
        if (firstKey !== undefined) searchCache.delete(firstKey);
      }
    }

    return data as City[];
  } catch (e) {
    if (signal?.aborted) return [];
    console.error("Error searching cities:", e);
    return [];
  }
}

/**
 * Fetches the top cities globally by population.
 */
export async function getTopCities(limit = 10) {
  try {
    // Allow larger batches for UI/background visualizations (e.g. tag spheres),
    // while still enforcing a reasonable upper bound.
    const safeLimit = Math.max(1, Math.min(200, limit));
    const { data, error } = await supabase
      .from("cities")
      .select("id, city, country, population, lat, lng")
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
}

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
