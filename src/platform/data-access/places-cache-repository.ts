import "server-only";
import { supabase, supabaseServer } from "@/lib/supabase";
import type { Landmark, PlaceType } from "@/lib/places";

export interface PlacesCacheRow {
  places_data: Landmark[];
  updated_at: string;
}

export async function readPlacesCache(
  cityName: string,
  type: PlaceType
): Promise<PlacesCacheRow | null> {
  const { data, error } = await supabase
    .from("city_places_cache")
    .select("places_data, updated_at")
    .eq("city_name", cityName)
    .eq("place_type", type)
    .maybeSingle();

  if (error || !data) return null;
  return {
    places_data: (data.places_data || []) as Landmark[],
    updated_at: data.updated_at as string,
  };
}

export async function writePlacesCache(
  cityName: string,
  type: PlaceType,
  places: Landmark[],
  updatedAt: string
): Promise<void> {
  if (!supabaseServer || places.length === 0) {
    return;
  }

  const { error } = await supabaseServer.from("city_places_cache").upsert(
    {
      city_name: cityName,
      place_type: type,
      places_data: places,
      updated_at: updatedAt,
    },
    { onConflict: "city_name,place_type" }
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
