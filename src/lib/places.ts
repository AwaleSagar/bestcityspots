import "server-only";
import { supabase, supabaseServer } from "./supabase";
import { rankingEngine } from "./ranking";
import { haversineKm } from "./geo";
import sharp from "sharp";
import { encode } from "blurhash";
import { CACHE_TTL } from "./cache-config";

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
if (!API_KEY) {
  console.warn("[places] GOOGLE_PLACES_API_KEY not set — place enrichment disabled.");
}
const BUCKET = "place_images";
const IMAGE_MAX_WIDTH = 800;
const IMAGE_MAX_HEIGHT = 600;
const BLURHASH_COMPONENT_X = 4;
const BLURHASH_COMPONENT_Y = 3;
const PLACE_IMAGE_BATCH_SIZE = 3;
const PLACE_IMAGE_ENRICH_LIMIT = 8;
const PLACE_QUERY_RESULT_LIMIT = 50;
const MIN_RESULTS_BEFORE_FALLBACK = 8;
const MIN_BUDGET_RESULTS = 2;
const BUDGET_PRICE_LEVELS = new Set(["PRICE_LEVEL_FREE", "PRICE_LEVEL_INEXPENSIVE"]);
const PRICE_TIER_ORDER: PlacePriceTier[] = ["free", "inexpensive", "moderate", "expensive", "very_expensive"];
const inFlightPlacesRequests = new Map<string, Promise<Landmark[]>>();

let hasWarnedMissingServiceRole = false;

// Result type for image resolution with BlurHash
interface ImageResult {
  imageUrl: string;
  blurhash: string;
}

type CachedLandmark = Landmark & {
  imageUrls?: string[];
};

export type PlaceType = "landmarks" | "restaurants" | "hotels";

export type PlacePriceTier = "free" | "inexpensive" | "moderate" | "expensive" | "very_expensive";
export type PlaceSort = "relevance" | "rating" | "reviews" | "distance";

export type PlaceSearchOptions = {
  cityName: string;
  type?: PlaceType;
  query?: string;
  minRating?: number;
  maxPriceTier?: PlacePriceTier;
  sortBy?: PlaceSort;
  page?: number;
  limit?: number;
  lat?: number;
  lng?: number;
  radiusKm?: number;
};

export type PlaceSearchResult = {
  results: Landmark[];
  total: number;
  page: number;
  limit: number;
};

type TopPlacesOptions = {
  lat?: number;
  lng?: number;
  radiusKm?: number;
  _bypassCache?: boolean;
};

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

function getPlacesWriteClient() {
  if (supabaseServer) {
    return supabaseServer;
  }

  if (!hasWarnedMissingServiceRole) {
    hasWarnedMissingServiceRole = true;
    console.warn("[places] SUPABASE_SERVICE_ROLE_KEY missing; cache writes and image uploads are disabled.");
  }

  return null;
}

function buildPlacesRequestKey(cityName: string, type: PlaceType, opts?: TopPlacesOptions): string {
  const lat = typeof opts?.lat === "number" ? opts.lat.toFixed(3) : "na";
  const lng = typeof opts?.lng === "number" ? opts.lng.toFixed(3) : "na";
  const radius = typeof opts?.radiusKm === "number" ? opts.radiusKm.toFixed(0) : "default";
  return [cityName.toLowerCase(), type, lat, lng, radius].join(":");
}

function getPrimaryQuery(cityName: string, type: PlaceType): string {
  switch (type) {
    case "landmarks":
      return `Top landmarks and attractions in ${cityName}`;
    case "restaurants":
      return `Best restaurants, local food, street food, and cheap eats in ${cityName}`;
    case "hotels":
      return `Top rated hotels, hostels, guest houses, and budget stays in ${cityName}`;
  }
}

function getFallbackBudgetQuery(cityName: string, type: PlaceType): string | null {
  switch (type) {
    case "restaurants":
      return `Best cheap eats and budget restaurants in ${cityName}`;
    case "hotels":
      return `Best budget hotels, hostels, and guest houses in ${cityName}`;
    default:
      return null;
  }
}

function inferBudgetPlaces(places: GooglePlace[]): void {
  places.forEach((place) => {
    if (!place.priceLevel) {
      place.priceLevel = "PRICE_LEVEL_INEXPENSIVE";
    }
  });
}

function dedupePlaces(places: GooglePlace[]): GooglePlace[] {
  const uniqueMap = new Map<string, GooglePlace>();
  places.forEach((place) => {
    uniqueMap.set(place.id, place);
  });
  return Array.from(uniqueMap.values());
}

function hasBudgetCoverage(places: Landmark[]): boolean {
  let budgetCount = 0;
  for (const place of places.slice(0, 12)) {
    if (place.priceLevel && BUDGET_PRICE_LEVELS.has(place.priceLevel)) {
      budgetCount += 1;
    }
    if (budgetCount >= MIN_BUDGET_RESULTS) {
      return true;
    }
  }
  return false;
}

function isBudgetSensitive(type: PlaceType): boolean {
  return type === "restaurants" || type === "hotels";
}

function mapPriceLevel(priceLevel?: string): PlacePriceTier | null {
  switch (priceLevel) {
    case "PRICE_LEVEL_FREE":
      return "free";
    case "PRICE_LEVEL_INEXPENSIVE":
      return "inexpensive";
    case "PRICE_LEVEL_MODERATE":
      return "moderate";
    case "PRICE_LEVEL_EXPENSIVE":
      return "expensive";
    case "PRICE_LEVEL_VERY_EXPENSIVE":
      return "very_expensive";
    default:
      return null;
  }
}

function isWithinMaxPriceTier(priceLevel: string | undefined, maxTier?: PlacePriceTier): boolean {
  if (!maxTier) return true;

  const normalized = mapPriceLevel(priceLevel);
  if (!normalized) return true;

  return PRICE_TIER_ORDER.indexOf(normalized) <= PRICE_TIER_ORDER.indexOf(maxTier);
}

function matchesQuery(place: Landmark, normalizedQuery: string): boolean {
  const haystack = [
    place.displayName?.text,
    place.formattedAddress,
    ...(place.types ?? []),
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalizedQuery);
}

function getDistanceKm(place: Landmark, lat?: number, lng?: number): number {
  const placeLat = place.location?.latitude;
  const placeLng = place.location?.longitude;

  if (typeof lat !== "number" || typeof lng !== "number") return Number.POSITIVE_INFINITY;
  if (typeof placeLat !== "number" || typeof placeLng !== "number") return Number.POSITIVE_INFINITY;

  return haversineKm(lat, lng, placeLat, placeLng);
}

function sortPlaces(places: Landmark[], sortBy: PlaceSort, lat?: number, lng?: number): Landmark[] {
  const sorted = [...places];

  if (sortBy === "distance" && typeof lat === "number" && typeof lng === "number") {
    return sorted.sort((a, b) => getDistanceKm(a, lat, lng) - getDistanceKm(b, lat, lng));
  }

  if (sortBy === "rating") {
    return sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  }

  if (sortBy === "reviews") {
    return sorted.sort((a, b) => (b.userRatingCount ?? 0) - (a.userRatingCount ?? 0));
  }

  return sorted.sort((a, b) => rankingEngine.getScore(b) - rankingEngine.getScore(a));
}

function stripPhotoMetadata(places: GooglePlace[]): void {
  places.forEach((place) => {
    delete place.photos;
  });
}

function filterPlacesByRadius(
  places: GooglePlace[],
  centerLat: number,
  centerLng: number,
  effectiveRadiusKm: number
): GooglePlace[] {
  const filtered = places.filter((place) => {
    const lat = place.location?.latitude;
    const lng = place.location?.longitude;
    if (typeof lat !== "number" || typeof lng !== "number") return true;
    return haversineKm(centerLat, centerLng, lat, lng) <= effectiveRadiusKm;
  });

  return filtered.length > 0 ? filtered : places;
}

async function savePlacesCache(
  cityName: string,
  type: PlaceType,
  places: Landmark[],
  updatedAt = new Date().toISOString()
): Promise<void> {
  const client = getPlacesWriteClient();
  if (!client || places.length === 0) {
    return;
  }

  const { error } = await client.from("city_places_cache").upsert(
    {
      city_name: cityName,
      place_type: type,
      places_data: places,
      updated_at: updatedAt,
    },
    { onConflict: "city_name,place_type" }
  );

  if (error) {
    console.warn(`[places] Failed to save cache for ${cityName}/${type}:`, error.message);
  }
}

function recordPlacesCacheEvent(type: PlaceType, isHit: boolean): void {
  const client = getPlacesWriteClient();
  if (!client) {
    return;
  }

  void (async () => {
    try {
      const { error } = await client.rpc("record_cache_event", {
        p_cache_type: `places:${type}`,
        p_is_hit: isHit,
      });

      if (error) {
        console.warn(`[places] Failed to record cache event for ${type}:`, error.message);
      }
    } catch (error) {
      console.warn(`[places] Failed to record cache event for ${type}:`, error);
    }
  })();
}

async function enrichRankedPlaceImages(rankedPlaces: GooglePlace[], apiKey: string): Promise<void> {
  const targets = rankedPlaces.slice(0, PLACE_IMAGE_ENRICH_LIMIT);

  for (let i = 0; i < targets.length; i += PLACE_IMAGE_BATCH_SIZE) {
    const batch = targets.slice(i, i + PLACE_IMAGE_BATCH_SIZE);
    await Promise.all(
      batch.map(async (place) => {
        const photo = place.photos?.[0];
        if (!photo?.name || !place.id) return;

        const landmark = place as Landmark;
        const result = await resolvePlaceImage(
          place.id,
          photo.name,
          apiKey,
          landmark.blurhash
        );

        if (result) {
          landmark.imageUrl = result.imageUrl;
          landmark.blurhash = result.blurhash;
        }
      })
    );
  }
}

async function fetchFreshPlaces(
  cityName: string,
  type: PlaceType,
  apiKey: string,
  opts?: TopPlacesOptions
): Promise<Landmark[]> {
  const requestedRadiusKm = opts?.radiusKm ?? 90;
  const apiMaxRadiusKm = 50;
  const effectiveRadiusKm = Math.min(requestedRadiusKm, apiMaxRadiusKm);
  const centerLat = opts?.lat;
  const centerLng = opts?.lng;
  const hasCoords = typeof centerLat === "number" && typeof centerLng === "number";

  const primaryPlaces = await fetchFromGoogle(cityName, getPrimaryQuery(cityName, type), apiKey, {
    lat: centerLat,
    lng: centerLng,
    effectiveRadiusKm: hasCoords ? effectiveRadiusKm : undefined,
  });

  let places = primaryPlaces;

  if (hasCoords) {
    places = filterPlacesByRadius(places, centerLat, centerLng, effectiveRadiusKm);
  }

  let rankedPlaces = rankingEngine.rank(dedupePlaces(places));
  const fallbackQuery = getFallbackBudgetQuery(cityName, type);
  const shouldRunFallback = Boolean(
    fallbackQuery && (
      rankedPlaces.length < MIN_RESULTS_BEFORE_FALLBACK ||
      (isBudgetSensitive(type) && !hasBudgetCoverage(rankedPlaces))
    )
  );

  if (shouldRunFallback && fallbackQuery) {
    const fallbackPlaces = await fetchFromGoogle(cityName, fallbackQuery, apiKey, {
      lat: centerLat,
      lng: centerLng,
      effectiveRadiusKm: hasCoords ? effectiveRadiusKm : undefined,
    });

    inferBudgetPlaces(fallbackPlaces);

    const mergedPlaces = hasCoords
      ? filterPlacesByRadius([...places, ...fallbackPlaces], centerLat, centerLng, effectiveRadiusKm)
      : [...places, ...fallbackPlaces];

    rankedPlaces = rankingEngine.rank(dedupePlaces(mergedPlaces));
  }

  if (rankedPlaces.length === 0) {
    console.info("[places] No places returned after search", { cityName, type });
    return [];
  }

  const rankedGooglePlaces = rankedPlaces as GooglePlace[];
  await enrichRankedPlaceImages(rankedGooglePlaces, apiKey);
  stripPhotoMetadata(rankedGooglePlaces);

  return rankedGooglePlaces;
}

async function fetchAndCachePlaces(
  cityName: string,
  type: PlaceType,
  opts?: TopPlacesOptions
): Promise<Landmark[]> {
  const requestKey = buildPlacesRequestKey(cityName, type, opts);
  const existingRequest = inFlightPlacesRequests.get(requestKey);
  if (existingRequest) {
    return existingRequest;
  }

  const request = (async () => {
    recordPlacesCacheEvent(type, false);
    const freshPlaces = await fetchFreshPlaces(cityName, type, API_KEY!, opts);

    if (freshPlaces.length > 0) {
      await savePlacesCache(cityName, type, freshPlaces);
    }

    return freshPlaces;
  })().finally(() => {
    inFlightPlacesRequests.delete(requestKey);
  });

  inFlightPlacesRequests.set(requestKey, request);
  return request;
}

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

function buildPlaceImagePublicUrl(placeId: string, supabaseUrl: string): string {
  return `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${placeId}.jpg`;
}

function normalizeCachedPlace(place: Landmark, supabaseUrl: string): {
  place: CachedLandmark;
  changed: boolean;
} {
  const normalizedPlace: CachedLandmark = { ...place };
  const expectedUrl = buildPlaceImagePublicUrl(place.id, supabaseUrl);
  const bucketPath = `/storage/v1/object/public/${BUCKET}/`;
  let changed = false;

  if (
    typeof normalizedPlace.imageUrl === "string" &&
    normalizedPlace.imageUrl.includes(bucketPath) &&
    normalizedPlace.imageUrl !== expectedUrl
  ) {
    normalizedPlace.imageUrl = expectedUrl;
    changed = true;
  }

  const extraImageUrls = (place as CachedLandmark).imageUrls;
  if (Array.isArray(extraImageUrls)) {
    const normalizedImageUrls = extraImageUrls
      .filter((value): value is string => typeof value === "string" && value.length > 0)
      .map((value) => (value.includes(bucketPath) ? expectedUrl : value));

    if (JSON.stringify(extraImageUrls) !== JSON.stringify(normalizedImageUrls)) {
      normalizedPlace.imageUrls = normalizedImageUrls;
      changed = true;
    }

    if (!normalizedPlace.imageUrl && normalizedImageUrls.includes(expectedUrl)) {
      normalizedPlace.imageUrl = expectedUrl;
      changed = true;
    }
  }

  return { place: normalizedPlace, changed };
}

// Resolve place photo to Supabase Storage URL (fetch from Google, upload, return public URL)
// Also generates BlurHash for LQIP placeholder
async function resolvePlaceImage(
  placeId: string,
  photoName: string,
  apiKey: string,
  existingBlurhash?: string
): Promise<ImageResult | undefined> {
  const client = getPlacesWriteClient();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return undefined;

  const storagePath = `${placeId}.jpg`;
  const publicUrl = buildPlaceImagePublicUrl(placeId, supabaseUrl);

  try {
    // Check if image already exists in storage
    const headRes = await fetch(publicUrl, { method: "HEAD", signal: AbortSignal.timeout(5_000) });
    if (headRes.ok) {
      // Image exists, but we may need to generate blurhash if not cached
      if (existingBlurhash) {
        return { imageUrl: publicUrl, blurhash: existingBlurhash };
      }
      // Fetch image to generate blurhash for existing cached images
      const existingImageRes = await fetch(publicUrl, { signal: AbortSignal.timeout(10_000) });
      if (existingImageRes.ok) {
        const existingBuffer = await existingImageRes.arrayBuffer();
        const blurhash = await generateBlurhash(existingBuffer);
        return { imageUrl: publicUrl, blurhash: blurhash ?? "" };
      }
      return { imageUrl: publicUrl, blurhash: "" };
    }

    // Fetch from Google Places API
    const mediaUrl = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${IMAGE_MAX_WIDTH}&maxHeightPx=${IMAGE_MAX_HEIGHT}&key=${apiKey}`;
    const imageRes = await fetch(mediaUrl, { redirect: "follow", signal: AbortSignal.timeout(15_000) });
    if (!imageRes.ok) return undefined;

    const arrayBuffer = await imageRes.arrayBuffer();

    // Generate BlurHash before uploading
    const blurhash = await generateBlurhash(arrayBuffer);

    if (!client) {
      return undefined;
    }

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
        maxResultCount: PLACE_QUERY_RESULT_LIMIT,
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
      signal: AbortSignal.timeout(15_000),
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

/**
 * Fire-and-forget background refresh for the soft-refresh SWR window (7-30 days).
 * Re-invokes getTopPlaces with a flag to skip the cache read and force a fresh fetch.
 */
async function refreshPlacesInBackground(
  cityName: string,
  type: PlaceType,
  opts?: TopPlacesOptions,
): Promise<void> {
  try {
    await getTopPlaces(cityName, type, { ...opts, _bypassCache: true } as never);
  } catch (e) {
    console.warn(`[places] Background refresh failed for ${cityName}/${type}:`, e);
  }
}

export async function getTopPlaces(
  cityName: string,
  type: PlaceType,
  opts?: TopPlacesOptions
): Promise<Landmark[]> {
  if (!API_KEY) {
    console.warn(`[places] Missing API key; returning empty for ${cityName} / ${type}`);
    return [];
  }

  try {
    // 1. Check Supabase Cache first (30-day hard TTL, 7-day soft-refresh)
    const bypassCache = !!(opts as Record<string, unknown> | undefined)?._bypassCache;
    const { data: cache } = bypassCache ? { data: null } : await supabase
      .from("city_places_cache")
      .select("places_data, updated_at")
      .eq("city_name", cityName)
      .eq("place_type", type)
      .maybeSingle();

    if (cache) {
      const updatedAt = new Date(cache.updated_at);
      const now = new Date();
      const daysSinceUpdate = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSinceUpdate < CACHE_TTL.PLACES_FRESH_DAYS) {
        recordPlacesCacheEvent(type, true);
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const cachedPlacesRaw = (cache.places_data || []) as Landmark[];
        const normalizedResults = supabaseUrl
          ? cachedPlacesRaw.map((place) => normalizeCachedPlace(place, supabaseUrl))
          : cachedPlacesRaw.map((place) => ({ place, changed: false }));
        const cachedPlaces = normalizedResults.map((result) => result.place);
        const normalizedChanged = normalizedResults.some((result) => result.changed);

        if (normalizedChanged) {
          void savePlacesCache(cityName, type, cachedPlaces, cache.updated_at);
        }

        const shouldRefreshForAge = daysSinceUpdate >= CACHE_TTL.PLACES_SOFT_REFRESH_DAYS;
        const shouldRefreshForCoverage = isBudgetSensitive(type) && !hasBudgetCoverage(cachedPlaces);
        const shouldRefreshForImages = !cachedPlaces.some((place) => !!place.imageUrl);

        if (shouldRefreshForAge || shouldRefreshForCoverage || shouldRefreshForImages) {
          refreshPlacesInBackground(cityName, type, opts).catch(() => {});
        }

        return cachedPlaces;
      }
    }

    return await fetchAndCachePlaces(cityName, type, opts);
  } catch (e) {
    console.error(`Failed to fetch ${type} for ${cityName}:`, e);
    return [];
  }
}

export async function searchPlaces(options: PlaceSearchOptions): Promise<PlaceSearchResult> {
  const page = options.page ?? 1;
  const limit = options.limit ?? 20;
  const sortBy = options.sortBy ?? "relevance";
  const minRating = options.minRating ?? 0;
  const normalizedQuery = options.query?.trim().toLowerCase();
  const requestedTypes: PlaceType[] = options.type
    ? [options.type]
    : ["landmarks", "restaurants", "hotels"];

  const batches = await Promise.all(
    requestedTypes.map((placeType) =>
      getTopPlaces(options.cityName, placeType, {
        lat: options.lat,
        lng: options.lng,
        radiusKm: options.radiusKm,
      })
    )
  );

  const merged = batches.flat();

  const filtered = merged.filter((place) => {
    if ((place.rating ?? 0) < minRating) return false;
    if (!isWithinMaxPriceTier(place.priceLevel, options.maxPriceTier)) return false;
    if (normalizedQuery && !matchesQuery(place, normalizedQuery)) return false;

    if (sortBy === "distance" && typeof options.lat === "number" && typeof options.lng === "number") {
      return getDistanceKm(place, options.lat, options.lng) <= (options.radiusKm ?? 25);
    }

    return true;
  });

  const sorted = sortPlaces(filtered, sortBy, options.lat, options.lng);
  const offset = (page - 1) * limit;

  return {
    results: sorted.slice(offset, offset + limit),
    total: sorted.length,
    page,
    limit,
  };
}
