import "server-only";
import type { Json } from "@/lib/database.types";
import { requireServerClient, supabase, supabaseServer } from "@/lib/supabase";

function getDbClient() {
  return supabaseServer ?? supabase;
}

/** One row of the `city_metrics` view (live values + country-level indicators). */
export interface CityMetricsCacheRow {
  cost_index: number | null;
  homicide_rate_per_100k: number | null;
  pollution_pm25: number | null;
  climate_comfort: string | null;
  health_access_per_100k: number | null;
  /** When the live metrics were last refreshed; null = never. */
  updated_at: string | null;
  source?: Record<string, unknown> | null;
}

/** What a live refresh writes — durable indicators live elsewhere. */
export interface CityLiveMetricsRow {
  pollution_pm25: number | null;
  climate_comfort: string | null;
  updated_at: string;
  source: Record<string, string>;
}

export async function readCityMetricsCache(cityId: number): Promise<CityMetricsCacheRow | null> {
  const db = getDbClient();
  const { data, error } = await db
    .from("city_metrics")
    .select(
      "cost_index, homicide_rate_per_100k, pollution_pm25, climate_comfort, health_access_per_100k, updated_at, source"
    )
    .eq("city_id", cityId)
    .maybeSingle();

  if (error || !data) return null;
  return {
    ...data,
    source:
      data.source && typeof data.source === "object" && !Array.isArray(data.source)
        ? (data.source as Record<string, unknown>)
        : null,
  };
}

export async function writeCityLiveMetrics(
  cityId: number,
  metrics: CityLiveMetricsRow
): Promise<void> {
  const db = requireServerClient();
  const { error } = await db.from("city_live_metrics").upsert(
    {
      city_id: cityId,
      pollution_pm25: metrics.pollution_pm25,
      climate_comfort: metrics.climate_comfort,
      source: metrics.source as NonNullable<Json>,
      updated_at: metrics.updated_at,
    },
    { onConflict: "city_id" }
  );

  if (error) {
    throw new Error(error.message || "Failed to write city live metrics");
  }
}
