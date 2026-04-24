import "server-only";
import { supabase, supabaseServer } from "./supabase";
import type { City } from "./cities";
import { CACHE_TTL, isCacheFresh, minutes } from "./cache-config";
import { fetchCurrent as fetchOpenMeteo, fetchPm25 } from "./providers/openMeteo";
import { createLogger } from "./logger";

const log = createLogger({ component: "metrics" });

export interface CityMetrics {
  cost_index: number | null;
  connectivity_mbps: number | null;
  safety_score: number | null;
  pollution_pm25: number | null;
  climate_comfort: string | null;
  health_access_per_100k: number | null;
  updated_at: string | null;
  source?: Record<string, unknown> | null;
}

async function getOpenMeteoAirQuality(lat: number, lng: number): Promise<number | null> {
  return await fetchPm25(lat, lng);
}

async function getOpenMeteoWeather(lat: number, lng: number): Promise<number | null> {
  const data = await fetchOpenMeteo(lat, lng);
  return data?.tempC ?? null;
}

function comfortFromTemp(temp: number | null): string | null {
  if (temp === null) return null;
  if (temp >= 30) return "Hot";
  if (temp >= 22) return "Warm";
  if (temp >= 15) return "Mild";
  if (temp >= 5) return "Cool";
  return "Cold";
}

function toMetrics(data: Record<string, unknown>): CityMetrics {
  return {
    cost_index: (data.cost_index as number) ?? null,
    connectivity_mbps: (data.connectivity_mbps as number) ?? null,
    safety_score: (data.safety_score as number) ?? null,
    pollution_pm25: (data.pollution_pm25 as number) ?? null,
    climate_comfort: (data.climate_comfort as string) ?? null,
    health_access_per_100k: (data.health_access_per_100k as number) ?? null,
    updated_at: (data.updated_at as string) ?? null,
    source: (data.source as Record<string, unknown>) ?? null,
  };
}

async function fetchAndCacheMetrics(city: City): Promise<CityMetrics> {
  const [pm25, temp] = await Promise.all([
    getOpenMeteoAirQuality(city.lat, city.lng),
    getOpenMeteoWeather(city.lat, city.lng),
  ]);

  const metrics: CityMetrics = {
    cost_index: null,
    connectivity_mbps: null,
    safety_score: null,
    pollution_pm25: pm25,
    climate_comfort: comfortFromTemp(temp),
    health_access_per_100k: null,
    updated_at: new Date().toISOString(),
    source: { pollution: "open-meteo/air-quality", climate: "open-meteo/weather" },
  };

  const db = supabaseServer ?? supabase;
  db.from("city_metrics")
    .upsert(
      { city_id: city.id, ...metrics },
      { onConflict: "city_id" },
    )
    .then(({ error }: { error: unknown }) => {
      if (error) log.error("cache_write_failed", { cityId: city.id, error: String(error) });
    });

  return metrics;
}

export async function getCityMetrics(city: City): Promise<CityMetrics | null> {
  const ttlMs = minutes(CACHE_TTL.METRICS_FRESH_MINUTES);

  try {
    const { data, error } = await supabase
      .from("city_metrics")
      .select(
        "cost_index, connectivity_mbps, safety_score, pollution_pm25, climate_comfort, health_access_per_100k, updated_at, source"
      )
      .eq("city_id", city.id)
      .maybeSingle();

    if (!error && data) {
      const cached = toMetrics(data as Record<string, unknown>);

      if (isCacheFresh(cached.updated_at, ttlMs)) {
        return cached;
      }

      // Stale-while-revalidate: return stale data, refresh in background
      fetchAndCacheMetrics(city).catch(() => {});
      return cached;
    }
  } catch (e) {
    log.warn("cache_read_failed", { cityId: city.id, error: e instanceof Error ? e.message : String(e) });
  }

  // No cache at all -- fetch fresh (blocking)
  try {
    return await fetchAndCacheMetrics(city);
  } catch (e) {
    log.error("live_fetch_failed", { cityId: city.id, error: e instanceof Error ? e.message : String(e) });
    return null;
  }
}
