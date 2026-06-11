import "server-only";
import type { City } from "./cities";
import { CACHE_TIERS, classifyAge } from "./cache-config";
import { fetchCurrent as fetchOpenMeteo, fetchPm25 } from "./providers/openMeteo";
import { createLogger } from "./logger";
import { runCacheFirstSWR } from "@/platform/cache/swr";
import {
  readCityMetricsCache,
  writeCityMetricsCache,
  type CityMetricsCacheRow,
} from "@/platform/data-access/metrics-cache-repository";

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

function toMetrics(data: CityMetricsCacheRow | Record<string, unknown>): CityMetrics {
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

async function fetchFreshMetrics(city: City, previous: CityMetrics | null): Promise<CityMetrics> {
  const [pm25, temp] = await Promise.all([
    getOpenMeteoAirQuality(city.lat, city.lng),
    getOpenMeteoWeather(city.lat, city.lng),
  ]);

  // US-09 (audit AF-2): live providers only refresh the *live* metrics
  // (pollution, climate). Durable, batch-imported fields — cost of living,
  // connectivity, safety, health access (see scripts/import-cost-index.ts
  // and docs/adr-001-cost-of-living-source.md) — are carried over from the
  // cached row instead of being clobbered to null on every refresh.
  const previousSource = (previous?.source ?? {}) as Record<string, unknown>;

  const metrics: CityMetrics = {
    cost_index: previous?.cost_index ?? null,
    connectivity_mbps: previous?.connectivity_mbps ?? null,
    safety_score: previous?.safety_score ?? null,
    pollution_pm25: pm25,
    climate_comfort: comfortFromTemp(temp),
    health_access_per_100k: previous?.health_access_per_100k ?? null,
    updated_at: new Date().toISOString(),
    source: {
      ...previousSource,
      pollution: "open-meteo/air-quality",
      climate: "open-meteo/weather",
    },
  };

  return metrics;
}

function toCacheRow(metrics: CityMetrics): CityMetricsCacheRow {
  return {
    cost_index: metrics.cost_index,
    connectivity_mbps: metrics.connectivity_mbps,
    safety_score: metrics.safety_score,
    pollution_pm25: metrics.pollution_pm25,
    climate_comfort: metrics.climate_comfort,
    health_access_per_100k: metrics.health_access_per_100k,
    updated_at: metrics.updated_at,
    source: metrics.source ?? null,
  };
}

export async function getCityMetrics(city: City): Promise<CityMetrics | null> {
  // Stashed by readCache so fetchFresh can preserve durable fields (US-09).
  let cachedMetrics: CityMetrics | null = null;

  return runCacheFirstSWR<CityMetrics>({
    key: `metrics:${city.id}`,
    readCache: async () => {
      const row = await readCityMetricsCache(city.id);
      cachedMetrics = row ? toMetrics(row) : null;
      return {
        value: cachedMetrics,
        updatedAt: row?.updated_at ?? null,
      };
    },
    classify: (updatedAt) => classifyAge(updatedAt, CACHE_TIERS.METRICS),
    fetchFresh: async () => fetchFreshMetrics(city, cachedMetrics),
    writeCache: async (value) => {
      await writeCityMetricsCache(city.id, toCacheRow(value));
    },
    onError: (event, error) => {
      const message = error instanceof Error ? error.message : String(error);
      if (event === "live_fetch_failed") {
        log.error(event, { cityId: city.id, error: message });
      } else {
        log.warn(event, { cityId: city.id, error: message });
      }
    },
  });
}
