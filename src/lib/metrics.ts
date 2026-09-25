import "server-only";
import type { City } from "./cities";
import { CACHE_TIERS, classifyAge } from "./cache-config";
import { fetchCurrent as fetchOpenMeteo, fetchPm25 } from "./providers/openMeteo";
import { createLogger } from "./logger";
import { runCacheFirstSWR } from "@/platform/cache/swr";
import {
  readCityMetricsCache,
  writeCityLiveMetrics,
  type CityMetricsCacheRow,
} from "@/platform/data-access/metrics-cache-repository";

const log = createLogger({ component: "metrics" });

/**
 * Per-city metrics, read from the `city_metrics` view:
 *   - live (Open-Meteo, 60 min TTL): pollution_pm25, climate_comfort
 *   - country-level World Bank WDI (imported by `npm run db:seed`):
 *     cost_index (price level, US = 100), homicide_rate_per_100k,
 *     health_access_per_100k (physicians per 100k)
 * `source` names the provenance of every value (docs/adr-003-reference-data-sources.md).
 */
export interface CityMetrics {
  cost_index: number | null;
  homicide_rate_per_100k: number | null;
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

function toMetrics(row: CityMetricsCacheRow): CityMetrics {
  return {
    cost_index: row.cost_index ?? null,
    homicide_rate_per_100k: row.homicide_rate_per_100k ?? null,
    pollution_pm25: row.pollution_pm25 ?? null,
    climate_comfort: row.climate_comfort ?? null,
    health_access_per_100k: row.health_access_per_100k ?? null,
    updated_at: row.updated_at ?? null,
    source: row.source ?? null,
  };
}

/**
 * Refreshes only the live metrics. Country indicators come from the view and
 * are carried through untouched — the database can't let a live write
 * overwrite them (they live in a different table).
 */
async function fetchFreshMetrics(city: City, current: CityMetrics | null): Promise<CityMetrics> {
  const [pm25, temp] = await Promise.all([
    getOpenMeteoAirQuality(city.lat, city.lng),
    getOpenMeteoWeather(city.lat, city.lng),
  ]);

  return {
    cost_index: current?.cost_index ?? null,
    homicide_rate_per_100k: current?.homicide_rate_per_100k ?? null,
    health_access_per_100k: current?.health_access_per_100k ?? null,
    pollution_pm25: pm25,
    climate_comfort: comfortFromTemp(temp),
    updated_at: new Date().toISOString(),
    source: {
      ...(current?.source ?? {}),
      pollution: "open-meteo/air-quality",
      climate: "open-meteo/weather",
    },
  };
}

export async function getCityMetrics(city: City): Promise<CityMetrics | null> {
  // Stashed by readCache so fetchFresh can carry country indicators through.
  let cachedMetrics: CityMetrics | null = null;

  return runCacheFirstSWR<CityMetrics>({
    key: `metrics:${city.id}`,
    readCache: async () => {
      const row = await readCityMetricsCache(city.id);
      cachedMetrics = row ? toMetrics(row) : null;
      return {
        // A view row without a live refresh (updated_at null) still carries
        // country indicators; SWR treats it as a miss and refreshes.
        value: cachedMetrics,
        updatedAt: cachedMetrics?.updated_at ?? null,
      };
    },
    classify: (updatedAt) => classifyAge(updatedAt, CACHE_TIERS.METRICS),
    fetchFresh: async () => fetchFreshMetrics(city, cachedMetrics),
    writeCache: async (value) => {
      await writeCityLiveMetrics(city.id, {
        pollution_pm25: value.pollution_pm25,
        climate_comfort: value.climate_comfort,
        updated_at: value.updated_at ?? new Date().toISOString(),
        source: { pollution: "open-meteo/air-quality", climate: "open-meteo/weather" },
      });
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
