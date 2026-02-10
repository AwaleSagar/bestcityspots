import { supabase } from "./supabase";
import { haversineKm } from "./geo";

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

/**
 * Binary search to find the longest cached prefix of a query
 * Time: O(n × log m) where n = query length, m = cache size
 * Much better than O(m) iteration for large caches
 */
function findLongestCachedPrefix(query: string): string | null {
  // Check progressively shorter prefixes of the query
  // This is O(n) where n = query length (typically < 20)
  for (let len = query.length; len >= 2; len--) {
    const prefix = query.slice(0, len);
    if (searchCache.has(prefix)) {
      return prefix; // Return immediately - this is the longest one
    }
  }
  
  return null;
}

function cityMatchesQuery(c: City, q: string) {
  const city = (c.city_ascii || c.city || "").toLowerCase();
  const country = (c.country || "").toLowerCase();
  return city.includes(q) || country.includes(q);
}

async function queryCitiesInBox(lat: number, lng: number, boxSize: number) {
  try {
    const { data, error } = await supabase
      .from("cities")
      .select("id, city, city_ascii, country, population, lat, lng, admin_name, capital")
      .gte("lat", lat - boxSize)
      .lte("lat", lat + boxSize)
      .gte("lng", lng - boxSize)
      .lte("lng", lng + boxSize)
      .limit(200);

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
  return cities.reduce((best, city) => {
    const distance = haversineKm(lat, lng, city.lat, city.lng);
    if (!best) return { city, distance };
    return distance < best.distance ? { city, distance } : best;
  }, null as { city: City; distance: number } | null)?.city ?? null;
}

export async function findNearestCity(lat: number, lng: number) {
  const boxSizes = [0.5, 1, 2, 5, 10];
  for (const boxSize of boxSizes) {
    const candidates = await queryCitiesInBox(lat, lng, boxSize);
    const nearest = findNearest(candidates, lat, lng);
    if (nearest) return nearest;
  }

  const fallback = await getTopCities(200);
  return findNearest(fallback, lat, lng);
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
  // Optimized: O(n) where n = query length, instead of O(m) where m = cache size
  const bestPrefix = findLongestCachedPrefix(cleanQuery);
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
