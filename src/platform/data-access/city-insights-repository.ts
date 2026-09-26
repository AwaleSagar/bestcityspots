import "server-only";
import type { Json } from "@/lib/database.types";
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
  return data;
}

export async function writeCityInsightCache(
  cityId: number,
  payload: {
    intro: string;
    attractions: unknown;
    seasons: unknown;
    weather: unknown;
    prompt_version: number;
    updated_at: string;
  }
): Promise<void> {
  const db = requireServerClient();
  const { error } = await db.from("city_ai_insights").upsert(
    {
      city_id: cityId,
      intro: payload.intro,
      // Validated by CityInsightSchema (src/lib/intelligence.ts) before writing.
      attractions: payload.attractions as NonNullable<Json>,
      seasons: payload.seasons as NonNullable<Json>,
      weather: payload.weather as NonNullable<Json>,
      prompt_version: payload.prompt_version,
      updated_at: payload.updated_at,
    },
    { onConflict: "city_id" }
  );

  if (error) {
    throw new Error(error.message || "Failed to write city insight cache");
  }
}
