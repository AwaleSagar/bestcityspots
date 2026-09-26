import "server-only";
import type { Json } from "@/lib/database.types";
import { supabase, supabaseServer } from "@/lib/supabase";
import type { Landmark, PlaceType } from "@/lib/places";

export interface PlacesCacheRow {
  places_data: Landmark[];
  updated_at: string;
}

/** Cache rows are keyed by city id so same-named cities never share places. */
export async function readPlacesCache(
  cityId: number,
  type: PlaceType
): Promise<PlacesCacheRow | null> {
  const { data, error } = await supabase
    .from("city_places_cache")
    .select("places_data, updated_at")
    .eq("city_id", cityId)
    .eq("place_type", type)
    .maybeSingle();

  if (error || !data) return null;
  return {
    // Written only by writePlacesCache below, from ranked Landmark objects.
    places_data: Array.isArray(data.places_data) ? (data.places_data as unknown as Landmark[]) : [],
    updated_at: data.updated_at,
  };
}

export async function writePlacesCache(
  cityId: number,
  type: PlaceType,
  places: Landmark[],
  updatedAt: string
): Promise<void> {
  if (!supabaseServer || places.length === 0) {
    return;
  }

  const { error } = await supabaseServer.from("city_places_cache").upsert(
    {
      city_id: cityId,
      place_type: type,
      places_data: places as unknown as NonNullable<Json>,
      updated_at: updatedAt,
    },
    { onConflict: "city_id,place_type" }
  );

  if (error) {
    throw new Error(error.message || "Failed to save places cache");
  }
}

export async function writePlacesCacheEvent(type: PlaceType, isHit: boolean): Promise<void> {
  if (!supabaseServer) {
    return;
  }

  const { error } = await supabaseServer.rpc("record_cache_event", {
    p_cache_type: `places:${type}`,
    p_is_hit: isHit,
  });

  if (error) {
    throw new Error(error.message || "Failed to record places cache event");
  }
}
