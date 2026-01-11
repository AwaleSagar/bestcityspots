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

  const queryMap = {
    landmarks: `Top landmarks and attractions in ${cityName}`,
    restaurants: `Best restaurants and fine dining in ${cityName}`,
    hotels: `Top rated hotels and luxury stays in ${cityName}`,
  };

  try {
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
      next: { revalidate: 86400 }, // Cache for 24 hours
    });

    if (!response.ok) return [];
    const data = await response.json();
    const places = (data.places || []) as Landmark[];

    return places
      .sort((a, b) => (b.userRatingCount || 0) - (a.userRatingCount || 0))
      .slice(0, 5);
  } catch (e) {
    console.error(`Failed to fetch ${type}:`, e);
    return [];
  }
}
