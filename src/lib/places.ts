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
  priceLevel?: string;
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
          "places.displayName,places.formattedAddress,places.id,places.rating,places.userRatingCount,places.types,places.googleMapsUri,places.priceLevel",
      },
      body: JSON.stringify({
        textQuery: queryMap[type],
        maxResultCount: 50, // Fetch 50 to have enough for price filtering
      }),
    });

    if (!response.ok) return [];
    const data = await response.json();
    const places = (data.places || []) as Landmark[];

    // 3. Save ALL results back to Supabase for deep filtering
    if (places.length > 0) {
      await supabase.from("city_places_cache").upsert({
        city_name: cityName,
        place_type: type,
        places_data: places, // Store all 50
        updated_at: new Date().toISOString(),
      });
    }

    // Default return: Sort all by review count and return all (up to 50)
    return places.sort((a, b) => (b.userRatingCount || 0) - (a.userRatingCount || 0));
  } catch (e) {
    console.error(`Failed to fetch ${type} for ${cityName}:`, e);
    return [];
  }
}
