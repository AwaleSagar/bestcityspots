import "server-only";
import { supabase, supabaseServer } from "@/lib/supabase";

function getDbClient() {
  return supabaseServer ?? supabase;
}

export interface CityMetricsCacheRow {
  cost_index: number | null;
  connectivity_mbps: number | null;
  safety_score: number | null;
  pollution_pm25: number | null;
  climate_comfort: string | null;
  health_access_per_100k: number | null;
  updated_at: string | null;
  source?: Record<string, unknown> | null;
}

export async function readCityMetricsCache(cityId: number): Promise<CityMetricsCacheRow | null> {
  const db = getDbClient();
  const { data, error } = await db
    .from("city_metrics")
    .select(
      "cost_index, connectivity_mbps, safety_score, pollution_pm25, climate_comfort, health_access_per_100k, updated_at, source"
    )
    .eq("city_id", cityId)
    .maybeSingle();

  if (error || !data) return null;
  return data as CityMetricsCacheRow;
}

export async function writeCityMetricsCache(
  cityId: number,
  metrics: CityMetricsCacheRow
): Promise<void> {
  const db = getDbClient();
  const { error } = await db
    .from("city_metrics")
    .upsert({ city_id: cityId, ...metrics }, { onConflict: "city_id" });

  if (error) {
    throw new Error(error.message || "Failed to write city metrics cache");
  }
}
