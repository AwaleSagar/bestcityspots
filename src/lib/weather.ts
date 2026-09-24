import "server-only";
import { City } from "./cities";
import { z } from "zod";
import { CACHE_TIERS, classifyAge } from "./cache-config";
import { fetchCurrentWeather } from "./providers/openweather";
import {
  fetchCurrent as fetchOpenMeteo,
  fetchPm25 as fetchOpenMeteoPm25,
  conditionFromWeatherCode,
} from "./providers/openMeteo";
import { aqiLabelFromOwm, owmAqiFromPm25, aqiLabelFromPm25 } from "./mapping";
import { createLogger } from "./logger";
import { runCacheFirstSWR } from "@/platform/cache/swr";
import {
  readCityWeatherCache,
  writeCityWeatherCache,
  type CityWeatherCacheRow,
} from "@/platform/data-access/weather-cache-repository";

const log = createLogger({ component: "weather" });

// Runtime validation schema for the application's internal weather model
const WeatherDataSchema = z.object({
  temp: z.number(),
  feels_like: z.number(),
  temp_min: z.number(),
  temp_max: z.number(),
  humidity: z.number(),
  description: z.string(),
  icon: z.string(),
  wind_speed: z.number(),
  aqi: z.number(),
  aqi_label: z.string(),
  updated_at: z.string(),
});

export type WeatherData = z.infer<typeof WeatherDataSchema>;

function parseCachedWeather(cached: unknown): WeatherData | null {
  const parsed = WeatherDataSchema.safeParse(cached);
  return parsed.success ? parsed.data : null;
}

async function fetchFreshWeather(city: City): Promise<WeatherData | null> {
  // Defensive validation — a corrupted City row with non-finite or out-of-range
  // coords would otherwise be passed straight to OpenWeather/Open-Meteo.
  if (
    !Number.isFinite(city.lat) ||
    !Number.isFinite(city.lng) ||
    city.lat < -90 ||
    city.lat > 90 ||
    city.lng < -180 ||
    city.lng > 180
  ) {
    log.warn("invalid_coords", { cityId: city.id, lat: city.lat, lng: city.lng });
    return null;
  }

  // Primary: OpenWeather (richer data when keyed).
  const primary = await fetchCurrentWeather(city.lat, city.lng);

  let normalized: WeatherData | null = null;

  if (primary.ok) {
    const aqiValue = primary.aqi?.aqi ?? 0;
    normalized = {
      temp: primary.current.temp,
      feels_like: primary.current.feelsLike,
      temp_min: primary.current.tempMin,
      temp_max: primary.current.tempMax,
      humidity: primary.current.humidity,
      description: primary.current.description,
      icon: primary.current.icon,
      // OpenWeather (units=metric) reports m/s; normalize to km/h so both
      // providers (Open-Meteo already returns km/h) share one unit.
      wind_speed: Math.round(primary.current.windSpeed * 3.6 * 10) / 10,
      aqi: aqiValue,
      aqi_label: aqiLabelFromOwm(aqiValue),
      updated_at: new Date().toISOString(),
    };
  } else {
    // Fallback chain: Open-Meteo keyless current weather + PM2.5 air quality.
    log.warn("owm.fallback", { reason: primary.reason, cityId: city.id });
    const [fallback, pm25] = await Promise.all([
      fetchOpenMeteo(city.lat, city.lng),
      fetchOpenMeteoPm25(city.lat, city.lng),
    ]);
    if (!fallback || fallback.tempC === null) return null;
    const fallbackAqi = pm25 !== null ? owmAqiFromPm25(pm25) : 0;
    const fallbackAqiLabel = pm25 !== null ? aqiLabelFromPm25(pm25) : "Unknown";
    normalized = {
      temp: fallback.tempC,
      feels_like: fallback.tempC,
      temp_min: fallback.tempC,
      temp_max: fallback.tempC,
      humidity: fallback.humidity ?? 0,
      description: conditionFromWeatherCode(fallback.weatherCode),
      icon: "",
      wind_speed: fallback.windKph ?? 0,
      aqi: fallbackAqi,
      aqi_label: fallbackAqiLabel,
      updated_at: new Date().toISOString(),
    };
    // (Previously reassigned `primary` here; the value was never read again.)
  }

  const parsed = WeatherDataSchema.safeParse(normalized);
  if (!parsed.success) {
    log.warn("invalid_shape", { cityId: city.id, error: parsed.error.message });
    return null;
  }

  return parsed.data;
}

function toWeatherCacheRow(weather: WeatherData): CityWeatherCacheRow {
  return {
    temp: weather.temp,
    feels_like: weather.feels_like,
    temp_min: weather.temp_min,
    temp_max: weather.temp_max,
    humidity: weather.humidity,
    description: weather.description,
    icon: weather.icon,
    wind_speed: weather.wind_speed,
    aqi: weather.aqi,
    aqi_label: weather.aqi_label,
    updated_at: weather.updated_at,
  };
}

/**
 * Fetch weather with stale-while-revalidate caching and multi-provider
 * fallback:
 *  - Fresh (< 60 min): return cached immediately.
 *  - Stale (>= 60 min): return stale, fire async refresh.
 *  - Missing or provider outage: block on fresh fetch (OpenWeather, then
 *    Open-Meteo). If both fail but any stale row exists, return it.
 */
export async function getCityWeather(city: City): Promise<WeatherData | null> {
  return runCacheFirstSWR<WeatherData>({
    key: `weather:${city.id}`,
    readCache: async () => {
      const row = await readCityWeatherCache(city.id);
      return {
        value: row ? parseCachedWeather(row) : null,
        updatedAt: row?.updated_at ?? null,
      };
    },
    classify: (updatedAt) => classifyAge(updatedAt, CACHE_TIERS.WEATHER),
    fetchFresh: async () => fetchFreshWeather(city),
    writeCache: async (value) => {
      await writeCityWeatherCache(city.id, toWeatherCacheRow(value));
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
