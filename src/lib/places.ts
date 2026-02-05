import { supabase, supabaseServer } from "./supabase";
import { rankingEngine } from "./ranking";
import sharp from "sharp";
import { encode } from "blurhash";

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const BUCKET = "place_images";
const IMAGE_MAX_WIDTH = 800;
const IMAGE_MAX_HEIGHT = 600;
const BLURHASH_COMPONENT_X = 4;
const BLURHASH_COMPONENT_Y = 3;

// Result type for image resolution with BlurHash
interface ImageResult {
  imageUrl: string;
  blurhash: string;
}

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
  imageUrl?: string;
  blurhash?: string;
}

type GooglePlacePhoto = { name: string };

type GooglePlace = Landmark & {
  photos?: GooglePlacePhoto[];
};

// Generate BlurHash from image buffer using sharp
async function generateBlurhash(imageBuffer: ArrayBuffer): Promise<string | undefined> {
  try {
    // Resize to small dimensions for fast BlurHash encoding
    const { data, info } = await sharp(Buffer.from(imageBuffer))
      .resize(32, 32, { fit: "inside" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Encode to BlurHash
    const blurhash = encode(
      new Uint8ClampedArray(data),
      info.width,
      info.height,
      BLURHASH_COMPONENT_X,
      BLURHASH_COMPONENT_Y
    );

    return blurhash;
  } catch (e) {
    console.warn("[places] Failed to generate blurhash:", e);
    return undefined;
  }
}

// Resolve place photo to Supabase Storage URL (fetch from Google, upload, return public URL)
// Also generates BlurHash for LQIP placeholder
async function resolvePlaceImage(
  placeId: string,
  photoName: string,
  apiKey: string,
  existingBlurhash?: string
): Promise<ImageResult | undefined> {
  const client = supabaseServer ?? supabase;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return undefined;

  const storagePath = `${placeId}.jpg`;
  const publicUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${storagePath}`;

  try {
    // Check if image already exists in storage
    const headRes = await fetch(publicUrl, { method: "HEAD" });
    if (headRes.ok) {
      // Image exists, but we may need to generate blurhash if not cached
      if (existingBlurhash) {
        return { imageUrl: publicUrl, blurhash: existingBlurhash };
      }
      // Fetch image to generate blurhash for existing cached images
      const existingImageRes = await fetch(publicUrl);
      if (existingImageRes.ok) {
        const existingBuffer = await existingImageRes.arrayBuffer();
        const blurhash = await generateBlurhash(existingBuffer);
        return { imageUrl: publicUrl, blurhash: blurhash ?? "" };
      }
      return { imageUrl: publicUrl, blurhash: "" };
    }

    // Fetch from Google Places API
    const mediaUrl = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${IMAGE_MAX_WIDTH}&maxHeightPx=${IMAGE_MAX_HEIGHT}&key=${apiKey}`;
    const imageRes = await fetch(mediaUrl, { redirect: "follow" });
    if (!imageRes.ok) return undefined;

    const arrayBuffer = await imageRes.arrayBuffer();

    // Generate BlurHash before uploading
    const blurhash = await generateBlurhash(arrayBuffer);

    // Upload to Supabase Storage
    const { error } = await client.storage
      .from(BUCKET)
      .upload(storagePath, arrayBuffer, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (error) {
      console.warn(`[places] Failed to upload image for ${placeId}:`, error.message);
      return undefined;
    }

    return { imageUrl: publicUrl, blurhash: blurhash ?? "" };
  } catch (e) {
    console.warn(`[places] Failed to resolve image for ${placeId}:`, e);
    return undefined;
  }
}

// Helper to fetch from Google Places API
async function fetchFromGoogle(
  cityName: string,
  queryText: string,
  apiKey: string,
  opts?: { lat?: number; lng?: number; effectiveRadiusKm?: number }
): Promise<GooglePlace[]> {
  try {
    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "places.displayName,places.formattedAddress,places.id,places.rating,places.userRatingCount,places.types,places.googleMapsUri,places.priceLevel,places.location,places.photos",
      },
      body: JSON.stringify({
        textQuery: queryText,
        maxResultCount: 50,
        locationBias:
          opts?.lat && opts?.lng && opts?.effectiveRadiusKm
            ? {
              circle: {
                center: { latitude: opts.lat, longitude: opts.lng },
                radius: opts.effectiveRadiusKm * 1000,
              },
            }
            : undefined,
      }),
    });

    if (!response.ok) {
      console.warn(
        `[places] Google Places response not ok for query "${queryText}"`,
        response.status
      );
      return [];
    }

    const data = await response.json();
    return (data.places || []) as GooglePlace[];
  } catch (e) {
    console.error(`[places] Failed to fetch for query "${queryText}":`, e);
    return [];
  }
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
    const requestedRadiusKm = opts?.radiusKm ?? 90; // generous metro radius
    const apiMaxRadiusKm = 50; // Google Places API limit
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

      if (daysSinceUpdate < 7) {
        const cachedPlaces = (cache.places_data || []) as Landmark[];

        // SMART CACHE VALIDATION:
        // If we are looking for dining/stays, ensuring we don't serve "luxury-only" stale data.
        // We check if we have ANY budget options. If not, we treat cache as stale to force a refresh with the new logic.
        const isBudgetSensitive = type === "restaurants" || type === "hotels";
        const hasBudget = cachedPlaces.some(
          (p) => p.priceLevel === "PRICE_LEVEL_INEXPENSIVE" || p.priceLevel === "PRICE_LEVEL_FREE"
        );
        const hasImages = cachedPlaces.some((p) => !!p.imageUrl);

        if ((!isBudgetSensitive || hasBudget) && hasImages) {
          return cachedPlaces;
        }
        if (!hasImages) {
          console.info(`[places] Cache hit but missing images for ${type}. Forcing refetch...`);
        } else {
          console.info(
            `[places] Cache hit but missing budget options for ${type}. Forcing refetch...`
          );
        }
      }
    }

    // 2. Multi-Query Strategy (Stratified Sampling)
    // We explicitly ask for "Best" AND "Budget" to guarantee price diversity.
    const queries: { text: string; isBudget: boolean }[] = [];

    // Primary Query (General Quality)
    switch (type) {
      case "landmarks":
        queries.push({ text: `Top landmarks and attractions in ${cityName}`, isBudget: false });
        break;
      case "restaurants":
        queries.push({ text: `Best restaurants and local food in ${cityName}`, isBudget: false });
        break;
      case "hotels":
        queries.push({ text: `Top rated hotels and places to stay in ${cityName}`, isBudget: false });
        break;
    }

    // Budget Query (Explicit Low Cost) - Only for dining/stays
    if (type === "restaurants") {
      queries.push({ text: `Best cheap eats and budget restaurants in ${cityName}`, isBudget: true });
    } else if (type === "hotels") {
      // Explicitly include hostels/guest houses to find cheaper options
      queries.push({ text: `Best budget hotels, hostels, and guest houses in ${cityName}`, isBudget: true });
    }

    // Run queries in parallel
    const results = await Promise.all(
      queries.map(async (q) => {
        const places = await fetchFromGoogle(cityName, q.text, API_KEY, {
          lat: centerLat,
          lng: centerLng,
          effectiveRadiusKm: hasCoords ? effectiveRadiusKm : undefined,
        });

        // PRICE Level Inference:
        // If we specifically searched for "budget/cheap" and Google gave us a result,
        // but excluded the price level (common for hostels/small spots),
        // we infer it as INEXPENSIVE so it shows up in the UI filter.
        if (q.isBudget) {
          places.forEach((p) => {
            if (!p.priceLevel) {
              p.priceLevel = "PRICE_LEVEL_INEXPENSIVE";
            }
          });
        }
        return places;
      })
    );

    // Merge and Deduplicate
    const allPlaces = results.flat();
    const uniqueMap = new Map<string, GooglePlace>();
    allPlaces.forEach((p) => uniqueMap.set(p.id, p));
    let places: GooglePlace[] = Array.from(uniqueMap.values());

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

      // If filtering nuked everything, fall back to the unfiltered list
      places = filtered.length > 0 ? filtered : places;
    }

    if (places.length === 0) {
      console.info("[places] No places returned after multi-query", {
        cityName,
        type,
      });
    }

    // 2b. Enrich places with cached images and BlurHash (fetch from Google, upload to Supabase)
    const BATCH_SIZE = 3;
    for (let i = 0; i < places.length; i += BATCH_SIZE) {
      const batch = places.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (place) => {
          const photo = place.photos?.[0];
          if (!photo?.name || !place.id) return;
          const landmark = place as Landmark;
          const result = await resolvePlaceImage(
            place.id,
            photo.name,
            API_KEY,
            landmark.blurhash
          );
          if (result) {
            landmark.imageUrl = result.imageUrl;
            landmark.blurhash = result.blurhash;
          }
          delete (place as GooglePlace).photos;
        })
      );
    }

    // 3. Save ALL results back to Supabase
    if (places.length > 0) {
      await supabase.from("city_places_cache").upsert({
        city_name: cityName,
        place_type: type,
        places_data: places,
        updated_at: new Date().toISOString(),
      });
    }

    // Default return: Ranking Engine sort (Bayesian + Virality)
    return rankingEngine.rank(places);
  } catch (e) {
    console.error(`Failed to fetch ${type} for ${cityName}:`, e);
    return [];
  }
}
