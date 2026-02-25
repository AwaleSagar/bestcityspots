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

export interface CitySearchResult extends City {
  rank_score: number;
  match_type: "fts" | "fuzzy" | "alias";
}

const searchCache = new Map<string, CitySearchResult[]>();

function normalizeQuery(q: string) {
  return q.trim().toLowerCase();
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
 * Elastic search: FTS + trigram fuzzy + alias matching via PostgreSQL RPC.
 * Results are ranked by relevance (match quality + population boost).
 */
export async function searchCities(
  query: string,
  limit = 10,
  signal?: AbortSignal,
): Promise<CitySearchResult[]> {
  const cleanQuery = normalizeQuery(query);
  if (!cleanQuery || cleanQuery.length < 1) return [];
  if (signal?.aborted) return [];

  if (searchCache.has(cleanQuery)) {
    return searchCache.get(cleanQuery) || [];
  }

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

    searchCache.set(cleanQuery, results);
    if (searchCache.size > 100) {
      const firstKey = searchCache.keys().next().value;
      if (firstKey !== undefined) searchCache.delete(firstKey);
    }

    return results;
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
      .select("id, city, city_ascii, country, iso3, admin_name, capital, population, lat, lng")
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
