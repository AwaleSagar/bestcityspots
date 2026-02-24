import "server-only";
import { City } from "./cities";
import { z } from "zod";
import { supabase, supabaseServer } from "./supabase";
import { CACHE_TTL, isCacheFresh, minutes } from "./cache-config";

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

function getAqiLabel(aqi: number): string {
  switch (aqi) {
    case 1: return "Good";
    case 2: return "Fair";
    case 3: return "Moderate";
    case 4: return "Poor";
    case 5: return "Very Poor";
    default: return "Unknown";
  }
}

async function fetchFreshWeather(city: City, apiKey: string): Promise<WeatherData | null> {
  const db = supabaseServer ?? supabase;

  const [weatherRes, aqiRes] = await Promise.all([
    fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${city.lat}&lon=${city.lng}&appid=${apiKey}&units=metric`,
      { signal: AbortSignal.timeout(10_000) }
    ),
    fetch(
      `https://api.openweathermap.org/data/2.5/air_pollution?lat=${city.lat}&lon=${city.lng}&appid=${apiKey}`,
      { signal: AbortSignal.timeout(10_000) }
    ),
  ]);

  if (!weatherRes.ok || !aqiRes.ok) return null;

  const weather = await weatherRes.json();
  const aqiData = await aqiRes.json();

  const rawAqi = aqiData.list?.[0]?.main?.aqi;
  const aqiValue = typeof rawAqi === "number" ? rawAqi : 0;

  const normalized: WeatherData = {
    temp: weather.main?.temp || 0,
    feels_like: weather.main?.feels_like || 0,
    temp_min: weather.main?.temp_min || 0,
    temp_max: weather.main?.temp_max || 0,
    humidity: weather.main?.humidity || 0,
    description: weather.weather?.[0]?.description || "unknown",
    icon: weather.weather?.[0]?.icon || "",
    wind_speed: weather.wind?.speed || 0,
    aqi: aqiValue,
    aqi_label: getAqiLabel(aqiValue),
    updated_at: new Date().toISOString(),
  };

  const validData = WeatherDataSchema.parse(normalized);

  db.from("city_weather_cache")
    .upsert({ city_id: city.id, ...validData }, { onConflict: "city_id" })
    .then(({ error }) => {
      if (error) console.error("Weather cache update failed:", error);
    });

  return validData;
}

/**
 * Fetches weather and air quality with stale-while-revalidate caching:
 *  - Fresh (< 60 min): return cached immediately
 *  - Stale (>= 60 min): return stale data, fire async background refresh
 *  - Missing: block on fresh fetch
 */
export async function getCityWeather(city: City): Promise<WeatherData | null> {
  const apiKey = process.env.OPENWEATHERMAP_API_KEY;
  if (!apiKey) {
    console.warn("OPENWEATHERMAP_API_KEY not found in environment.");
    return null;
  }

  const db = supabaseServer ?? supabase;
  if (!supabaseServer) {
    console.warn("SUPABASE_SERVICE_ROLE_KEY missing; weather cache uses anon key.");
  }

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
        // Stale-while-revalidate: serve stale, refresh in background
        fetchFreshWeather(city, apiKey).catch(() => {});
        return validCached;
      }
    }

    // No usable cache -- block on fresh fetch
    const fresh = await fetchFreshWeather(city, apiKey);
    if (fresh) return fresh;

    // Last resort: return any stale data we can parse
    if (cached) {
      const fallback = parseCachedWeather(cached);
      if (fallback) return fallback;
    }
    return null;
  } catch (error) {
    console.error("Failed to fetch city weather:", error);
    return null;
  }
}
