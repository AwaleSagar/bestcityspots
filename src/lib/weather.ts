import { City } from "./cities";
import { z } from "zod";
import { supabase, supabaseServer } from "./supabase";

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

/**
 * Fetches weather and air quality with a 60-minute cache to respect API limits (1,000/day).
 * API key is pulled from process.env.OPENWEATHERMAP_API_KEY
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

  try {
    // 1. Check Supabase Cache (60-minute TTL)
    const { data: cached } = await db
      .from("city_weather_cache")
      .select("*")
      .eq("city_id", city.id)
      .maybeSingle();

    if (cached) {
      const updatedAt = new Date(cached.updated_at);
      const now = new Date();
      const ageMinutes = (now.getTime() - updatedAt.getTime()) / (1000 * 60);

      if (ageMinutes < 60) {
        // Validate cached data structure
        const parsed = WeatherDataSchema.safeParse(cached);
        if (parsed.success) return parsed.data;
      }
    }

    // 2. Cache expired or missing, fetch fresh data
    const [weatherRes, aqiRes] = await Promise.all([
      fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${city.lat}&lon=${city.lng}&appid=${apiKey}&units=metric`
      ),
      fetch(
        `https://api.openweathermap.org/data/2.5/air_pollution?lat=${city.lat}&lon=${city.lng}&appid=${apiKey}`
      ),
    ]);

    if (!weatherRes.ok || !aqiRes.ok) {
      if (cached) {
        const parsed = WeatherDataSchema.safeParse(cached);
        if (parsed.success) return parsed.data;
      }
      return null; // Fallback to stale on API error
    }

    const weather = await weatherRes.json();
    const aqiData = await aqiRes.json();

    // Safe access for AQI
    const rawAqi = aqiData.list?.[0]?.main?.aqi;
    const aqiValue = typeof rawAqi === 'number' ? rawAqi : 0;
    const aqiLabel = getAqiLabel(aqiValue);

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
      aqi_label: aqiLabel,
      updated_at: new Date().toISOString(),
    };

    // Runtime validation of fresh data
    const validData = WeatherDataSchema.parse(normalized);

    // 3. Update Cache Background
    const { error: cacheError } = await db
      .from("city_weather_cache")
      .upsert(
        {
          city_id: city.id,
          ...validData,
        },
        { onConflict: "city_id" }
      );
    if (cacheError) {
      console.error("Weather cache update failed:", cacheError);
    }

    return validData;
  } catch (error) {
    console.error("Failed to fetch city weather:", error);
    return null;
  }
}
