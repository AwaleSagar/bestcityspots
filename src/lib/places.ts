import { supabase } from "./supabase";

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;

export interface Landmark {
  id: string;
  displayName: { text: string };
  formattedAddress: string;
  rating?: number;
  userRatingCount?: number;
  types?: string[];
  googleMapsUri?: string;
}

export async function getTopPlaces(
  cityName: string,
  type: "landmarks" | "restaurants" | "hotels"
): Promise<Landmark[]> {
  if (!API_KEY) return [];

  try {
    // 1. Check Supabase Cache first
    const { data: cache } = await supabase
      .from("city_places_cache")
      .select("places_data, updated_at")
      .eq("city_name", cityName)
      .eq("place_type", type)
      .maybeSingle();

    if (cache) {
      const updatedAt = new Date(cache.updated_at);
      const now = new Date();
      const daysSinceUpdate = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);

      // Landmarks don't change often—cache for 7 days!
      if (daysSinceUpdate < 7) {
        return (cache.places_data || []) as Landmark[];
      }
    }

    // 2. Cache expired or missing, call Google Places API
    const queryMap = {
      landmarks: `Top landmarks and attractions in ${cityName}`,
      restaurants: `Best restaurants and fine dining in ${cityName}`,
      hotels: `Top rated hotels and luxury stays in ${cityName}`,
    };

    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": API_KEY,
        "X-Goog-FieldMask":
          "places.displayName,places.formattedAddress,places.id,places.rating,places.userRatingCount,places.types,places.googleMapsUri",
      },
      body: JSON.stringify({
        textQuery: queryMap[type],
        maxResultCount: 20,
      }),
    });

    if (!response.ok) return [];
    const data = await response.json();
    const places = (data.places || []) as Landmark[];

    // Sort by review count descending and take top 5
    const topPlaces = places
      .sort((a, b) => (b.userRatingCount || 0) - (a.userRatingCount || 0))
      .slice(0, 5);

    // 3. Save the result back to Supabase for others to use
    if (topPlaces.length > 0) {
      await supabase.from("city_places_cache").upsert({
        city_name: cityName,
        place_type: type,
        places_data: topPlaces,
        updated_at: new Date().toISOString(),
      });
    }

    return topPlaces;
  } catch (e) {
    console.error(`Failed to fetch ${type} for ${cityName}:`, e);
    return [];
  }
}
