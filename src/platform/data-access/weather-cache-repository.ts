import "server-only";
import { supabase, supabaseServer } from "@/lib/supabase";

function getDbClient() {
  return supabaseServer ?? supabase;
}

export interface CityWeatherCacheRow {
  temp: number;
  feels_like: number;
  temp_min: number;
  temp_max: number;
  humidity: number;
  description: string;
  icon: string;
  wind_speed: number;
  aqi: number;
  aqi_label: string;
  updated_at: string;
}

export async function readCityWeatherCache(cityId: number): Promise<CityWeatherCacheRow | null> {
  const db = getDbClient();
  const { data, error } = await db
    .from("city_weather_cache")
    .select(
      "temp, feels_like, temp_min, temp_max, humidity, description, icon, wind_speed, aqi, aqi_label, updated_at"
    )
    .eq("city_id", cityId)
    .maybeSingle();

  if (error || !data) return null;
  return data as CityWeatherCacheRow;
}

export async function writeCityWeatherCache(
  cityId: number,
  weather: CityWeatherCacheRow
): Promise<void> {
  const db = getDbClient();
  const { error } = await db
    .from("city_weather_cache")
    .upsert({ city_id: cityId, ...weather }, { onConflict: "city_id" });

  if (error) {
    throw new Error(error.message || "Failed to write city weather cache");
  }
}
