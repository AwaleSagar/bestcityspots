import "server-only";
import { City } from "./cities";
import { z } from "zod";
import { supabase, supabaseServer } from "./supabase";
import { CACHE_TTL, isCacheFresh, minutes } from "./cache-config";
import { fetchCurrentWeather } from "./providers/openweather";
import {
  fetchCurrent as fetchOpenMeteo,
  fetchPm25 as fetchOpenMeteoPm25,
  conditionFromWeatherCode,
} from "./providers/openMeteo";
import { aqiLabelFromOwm, owmAqiFromPm25, aqiLabelFromPm25 } from "./mapping";
import { createLogger } from "./logger";

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
  const db = supabaseServer ?? supabase;

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
      wind_speed: primary.current.windSpeed,
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

  db.from("city_weather_cache")
    .upsert({ city_id: city.id, ...parsed.data }, { onConflict: "city_id" })
    .then(({ error }: { error: unknown }) => {
      if (error) log.error("cache_write_failed", { cityId: city.id, error: String(error) });
    });

  return parsed.data;
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
  const db = supabaseServer ?? supabase;
  const ttlMs = minutes(CACHE_TTL.WEATHER_FRESH_MINUTES);

  try {
    // Explicit projection mirrors WeatherDataSchema; avoids over-fetching
    // unused columns (raw provider blobs etc.) from the cache row.
    const { data: cached } = await db
      .from("city_weather_cache")
      .select(
        "temp, feels_like, temp_min, temp_max, humidity, description, icon, wind_speed, aqi, aqi_label, updated_at"
      )
      .eq("city_id", city.id)
      .maybeSingle();

    const validCached = cached ? parseCachedWeather(cached) : null;
    if (validCached) {
      if (cached && isCacheFresh(cached.updated_at, ttlMs)) {
        return validCached;
      }
      // Stale-while-revalidate: serve stale, refresh in background.
      fetchFreshWeather(city).catch((err) => {
        log.warn("revalidate_failed", {
          cityId: city.id,
          error: err instanceof Error ? err.message : String(err),
        });
      });
      return validCached;
    }

    // No usable cache — block on fresh fetch.
    const fresh = await fetchFreshWeather(city);
    if (fresh) return fresh;

    // Last resort: return any stale data we can parse (already attempted above).
    return null;
  } catch (error) {
    log.error("fetch_failed", {
      cityId: city.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
