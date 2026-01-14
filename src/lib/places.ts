import { supabase } from "./supabase";

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export interface Landmark {
  id: string;
  displayName: { text: string };
  formattedAddress: string;
  rating?: number;
  userRatingCount?: number;
  types?: string[];
  googleMapsUri?: string;
  priceLevel?: string;
  location?: {
    latitude?: number;
    longitude?: number;
  };
}

export async function getTopPlaces(
  cityName: string,
  type: "landmarks" | "restaurants" | "hotels",
  opts?: { lat?: number; lng?: number; radiusKm?: number }
): Promise<Landmark[]> {
  if (!API_KEY) {
    console.warn(`[places] Missing API key; returning empty for ${cityName} / ${type}`);
    return [];
  }

  try {
    const requestedRadiusKm = opts?.radiusKm ?? 90; // generous metro radius; prevents false empties
    const apiMaxRadiusKm = 50; // Google Places API limit (50,000 meters)
    const effectiveRadiusKm = Math.min(requestedRadiusKm, apiMaxRadiusKm);
    const centerLat = opts?.lat;
    const centerLng = opts?.lng;
    const hasCoords = typeof centerLat === "number" && typeof centerLng === "number";

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
    const queryText =
      type === "landmarks"
        ? queryMap.landmarks
        : type === "restaurants"
          ? queryMap.restaurants
          : queryMap.hotels;

    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": API_KEY,
        "X-Goog-FieldMask":
          "places.displayName,places.formattedAddress,places.id,places.rating,places.userRatingCount,places.types,places.googleMapsUri,places.priceLevel,places.location",
      },
      body: JSON.stringify({
        textQuery: queryText,
        maxResultCount: 50, // Fetch 50 to have enough for price filtering
        locationBias: hasCoords
          ? {
              circle: {
                center: { latitude: centerLat, longitude: centerLng },
                radius: effectiveRadiusKm * 1000, // meters, capped by API limit
              },
            }
          : undefined,
      }),
    });

    if (!response.ok) {
      console.warn(
        `[places] Google Places response not ok`,
        cityName,
        type,
        response.status,
        await response.text().catch(() => "")
      );
      return [];
    }
    const data = await response.json();
    let places = (data.places || []) as Landmark[];

    // Filter out obvious outliers when we have coordinates
    if (hasCoords) {
      const centerLatValue = centerLat as number;
      const centerLngValue = centerLng as number;
      const filtered = places.filter((place) => {
        const lat = place.location?.latitude;
        const lng = place.location?.longitude;
        if (typeof lat !== "number" || typeof lng !== "number") return true;
        return haversineKm(centerLatValue, centerLngValue, lat, lng) <= effectiveRadiusKm;
      });

      // If filtering nuked everything, fall back to the unfiltered list to avoid blank states.
      places = filtered.length > 0 ? filtered : places;

      if (filtered.length === 0 && places.length > 0) {
        console.info(
          `[places] Filter emptied results; fell back to unfiltered`,
          { cityName, type, requestedRadiusKm, effectiveRadiusKm, total: places.length }
        );
      }
    }

    if (places.length === 0) {
      console.info("[places] No places returned", {
        cityName,
        type,
        hasCoords,
        requestedRadiusKm,
        effectiveRadiusKm,
      });
    }

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
