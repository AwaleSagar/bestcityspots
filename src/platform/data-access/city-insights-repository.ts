import "server-only";
import { requireServerClient, supabase } from "@/lib/supabase";

export interface CityInsightCacheRow {
  intro: string | null;
  attractions: unknown;
  seasons: unknown;
  weather: unknown;
  updated_at: string | null;
  prompt_version: number | null;
}

export async function readCityInsightCache(cityId: number): Promise<CityInsightCacheRow | null> {
  const { data, error } = await supabase
    .from("city_ai_insights")
    .select("intro, attractions, seasons, weather, updated_at, prompt_version")
    .eq("city_id", cityId)
    .maybeSingle();

  if (error || !data) return null;
  return data as CityInsightCacheRow;
}

export async function writeCityInsightCache(
  cityId: number,
  payload: {
    city_name: string;
    country: string;
    intro: string;
    attractions: unknown;
    seasons: unknown;
    weather: unknown;
    prompt_version: number;
    updated_at: string;
  }
): Promise<void> {
  const db = requireServerClient();
  const { error } = await db
    .from("city_ai_insights")
    .upsert({ city_id: cityId, ...payload }, { onConflict: "city_id" });

  if (error) {
    throw new Error(error.message || "Failed to write city insight cache");
  }
}
