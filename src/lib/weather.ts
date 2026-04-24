import "server-only";
import { City } from "./cities";
import { z } from "zod";
import { supabase, supabaseServer } from "./supabase";
import { CACHE_TTL, isCacheFresh, minutes } from "./cache-config";
import { fetchCurrentWeather } from "./providers/openweather";
import { fetchCurrent as fetchOpenMeteo, conditionFromWeatherCode } from "./providers/openMeteo";
import { aqiLabelFromOwm } from "./mapping";
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

  // Primary: OpenWeather (richer data when keyed).
  let primary = await fetchCurrentWeather(city.lat, city.lng);

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
    // Fallback chain: Open-Meteo keyless current weather.
    log.warn("owm.fallback", { reason: primary.reason, cityId: city.id });
    const fallback = await fetchOpenMeteo(city.lat, city.lng);
    if (!fallback || fallback.tempC === null) return null;
    normalized = {
      temp: fallback.tempC,
      feels_like: fallback.tempC,
      temp_min: fallback.tempC,
      temp_max: fallback.tempC,
      humidity: fallback.humidity ?? 0,
      description: conditionFromWeatherCode(fallback.weatherCode),
      icon: "",
      wind_speed: fallback.windKph ?? 0,
      aqi: 0,
      aqi_label: "Unknown",
      updated_at: new Date().toISOString(),
    };
    primary = { ok: false, reason: primary.reason };
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
    const { data: cached } = await db
      .from("city_weather_cache")
      .select("*")
      .eq("city_id", city.id)
      .maybeSingle();

    if (cached) {
      const validCached = parseCachedWeather(cached);
      if (validCached) {
        if (isCacheFresh(cached.updated_at, ttlMs)) {
          return validCached;
        }
        // Stale-while-revalidate: serve stale, refresh in background.
        fetchFreshWeather(city).catch(() => {});
        return validCached;
      }
    }

    // No usable cache — block on fresh fetch.
    const fresh = await fetchFreshWeather(city);
    if (fresh) return fresh;

    // Last resort: return any stale data we can parse.
    if (cached) {
      const fallback = parseCachedWeather(cached);
      if (fallback) return fallback;
    }
    return null;
  } catch (error) {
    log.error("fetch_failed", {
      cityId: city.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
