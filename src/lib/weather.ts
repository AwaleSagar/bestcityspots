import { City } from "./cities";
import { z } from "zod";
import { supabase, supabaseServer } from "./supabase";

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

const AQI_LABELS = ["Unknown", "Good", "Fair", "Moderate", "Poor", "Very Poor"];

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
        return cached as WeatherData;
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
        if (cached) return cached as WeatherData; // Fallback to stale on API error
        return null;
    }

    const weather = await weatherRes.json();
    const aqiData = await aqiRes.json();

    const aqiValue = aqiData.list[0]?.main.aqi || 0;

    const normalized: WeatherData = {
      temp: weather.main.temp,
      feels_like: weather.main.feels_like,
      temp_min: weather.main.temp_min,
      temp_max: weather.main.temp_max,
      humidity: weather.main.humidity,
      description: weather.weather[0]?.description || "unknown",
      icon: weather.weather[0]?.icon || "",
      wind_speed: weather.wind.speed,
      aqi: aqiValue,
      aqi_label: AQI_LABELS[aqiValue] || "Unknown",
      updated_at: new Date().toISOString(),
    };

    // 3. Update Cache Background
    const { error: cacheError } = await db
      .from("city_weather_cache")
      .upsert(
        {
          city_id: city.id,
          ...normalized,
        },
        { onConflict: "city_id" }
      );
    if (cacheError) {
      console.error("Weather cache update failed:", cacheError);
    }

    return normalized;
  } catch (error) {
    console.error("Failed to fetch city weather:", error);
    return null;
  }
}
